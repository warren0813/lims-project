from __future__ import annotations

import re

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog, Role
from apps.accounts.notifications import notify, notify_role
from apps.commissions.models import RequestStatus, SampleStatus
from apps.commissions.models import SampleExperimentStatus
from apps.common.codes import next_business_code
from apps.common.exceptions import DomainError
from apps.dispatch.models import DispatchJob, DispatchLog, DispatchStatus
from apps.equipment.models import Equipment, EquipmentCapability, EquipmentStatus
from apps.realtime.events import publish_state
from apps.wip.models import WipBatch, WipStatus
from apps.wip.services import mark_wip_dispatched

TERMINAL = {DispatchStatus.COMPLETED, DispatchStatus.FAILED, DispatchStatus.CANCELLED}


def _logical_request_title(title: str) -> str:
    return re.sub(r"\s*[·•]\s*\d+/\d+\s*$", "", title or "").strip()


def _logical_request_siblings(request):
    return request.__class__.objects.filter(
        requester_id=request.requester_id,
        created_at__date=request.created_at.date(),
    )


def _logical_request_complete(request) -> bool:
    title = _logical_request_title(request.title)
    for sibling in _logical_request_siblings(request):
        if _logical_request_title(sibling.title) != title:
            continue
        if sibling.status != RequestStatus.COMPLETED:
            return False
    return True


def _request_has_open_experiments(request) -> bool:
    return request.samples.filter(
        experiments__status__in=[
            SampleExperimentStatus.PENDING,
            SampleExperimentStatus.READY,
            SampleExperimentStatus.IN_WIP,
            SampleExperimentStatus.RUNNING,
        ]
    ).exists()


def _sync_request_after_final_check(request) -> None:
    if request.samples.filter(status=SampleStatus.RUNNING).exists():
        request.status = RequestStatus.RUNNING
    elif request.samples.filter(status=SampleStatus.QUEUED).exists():
        request.status = RequestStatus.QUEUED
    elif request.samples.filter(status=SampleStatus.IN_WIP).exists():
        request.status = RequestStatus.IN_WIP
    elif _request_has_open_experiments(request):
        request.status = RequestStatus.RECEIVED
    elif not request.samples.exclude(
        status__in=[SampleStatus.COMPLETED, SampleStatus.FAILED]
    ).exists():
        request.status = RequestStatus.COMPLETED
    else:
        request.status = RequestStatus.RECEIVED
    request.save(update_fields=["status", "updated_at"])


def dispatch_qs():
    return DispatchJob.objects.select_related(
        "wip__recipe__experiment_type",
        "wip__recipe__equipment_type",
        "wip__experiment_type",
        "equipment",
    ).prefetch_related("result", "wip__items")


def _audit(actor, action: str, entity, message: str = ""):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity.__class__.__name__,
        entity_id=str(entity.pk),
        message=message,
    )


def redis_payload(dispatch: DispatchJob) -> dict:
    return {
        "dispatch_id": str(dispatch.id),
        "dispatch_no": dispatch.dispatch_no,
        "wip_id": str(dispatch.wip_id),
        "wip_no": dispatch.wip.wip_no,
        "equipment_id": str(dispatch.equipment_id) if dispatch.equipment_id else None,
        "equipment_code": dispatch.equipment.equipment_code if dispatch.equipment else None,
        "status": dispatch.status,
        "progress": dispatch.progress,
        "current_step": dispatch.current_step,
        "worker": dispatch.worker_node,
    }


def publish_dispatch(dispatch: DispatchJob) -> None:
    publish_state(f"dispatch:{dispatch.id}:state", redis_payload(dispatch))
    if dispatch.equipment_id:
        publish_state(
            f"equipment:{dispatch.equipment_id}:status",
            {
                **redis_payload(dispatch),
                "equipment_status": dispatch.equipment.status,
                "last_heartbeat": dispatch.equipment.last_heartbeat_at.isoformat()
                if dispatch.equipment.last_heartbeat_at
                else None,
            },
        )


def _choose_equipment(wip: WipBatch, equipment_id: str | None) -> Equipment:
    qs = Equipment.objects.filter(
        equipment_type=wip.equipment_type,
        is_active=True,
        status=EquipmentStatus.IDLE,
    )
    if equipment_id:
        qs = qs.filter(pk=equipment_id)
    equipment = qs.order_by("equipment_code").first()
    if equipment is None:
        raise DomainError("No idle compatible equipment is available")
    if not EquipmentCapability.objects.filter(equipment=equipment, recipe=wip.recipe).exists():
        raise DomainError("Equipment does not support the WIP recipe")
    return equipment


@transaction.atomic
def create_dispatch(actor, wip: WipBatch, equipment_id: str | None = None, *, simulate_failure: bool = False) -> DispatchJob:
    wip = WipBatch.objects.select_for_update().get(pk=wip.pk)
    if wip.status != WipStatus.READY_FOR_DISPATCH:
        raise DomainError("Only locked WIP batches can be dispatched")
    if not wip.items.exists():
        raise DomainError("Cannot dispatch an empty WIP batch")
    equipment = _choose_equipment(wip, equipment_id)
    dispatch = DispatchJob.objects.create(
        dispatch_no=next_business_code(DispatchJob, "dispatch_no", "DISP"),
        wip=wip,
        equipment=equipment,
        status=DispatchStatus.QUEUED,
        queue_name=equipment.worker_queue_name,
        queued_at=timezone.now(),
        created_by=actor,
        simulate_failure=simulate_failure,
    )
    DispatchLog.objects.create(dispatch=dispatch, message="Dispatch queued")
    equipment.status = EquipmentStatus.WORKING
    equipment.current_dispatch = dispatch
    equipment.progress = 0
    equipment.current_step = "Queued"
    equipment.error_message = ""
    equipment.save()
    for item in wip.items.select_related("sample", "request"):
        item.sample.status = SampleStatus.QUEUED
        item.sample.save(update_fields=["status", "updated_at"])
        item.request.status = RequestStatus.QUEUED
        item.request.save(update_fields=["status", "updated_at"])
    mark_wip_dispatched(actor, wip)
    publish_dispatch(dispatch)
    _audit(actor, "dispatch.create", dispatch)

    from apps.dispatch.tasks import run_dispatch_job

    try:
        result = run_dispatch_job.apply_async(args=[str(dispatch.id)], queue=dispatch.queue_name)
        dispatch.celery_task_id = result.id
        dispatch.save(update_fields=["celery_task_id", "updated_at"])
    except Exception as exc:  # broker may be unavailable in non-Docker local runs
        dispatch.error_message = f"Queue submit failed: {exc}"
        dispatch.save(update_fields=["error_message", "updated_at"])
        DispatchLog.objects.create(
            dispatch=dispatch, level="warning", message=dispatch.error_message
        )
    return dispatch


@transaction.atomic
def cancel_dispatch(actor, dispatch: DispatchJob) -> DispatchJob:
    if dispatch.status in TERMINAL:
        raise DomainError("Terminal dispatches cannot be cancelled")
    dispatch.status = DispatchStatus.CANCELLED
    dispatch.finished_at = timezone.now()
    dispatch.error_message = "Cancelled by user"
    dispatch.save()
    if dispatch.equipment_id:
        dispatch.equipment.status = EquipmentStatus.IDLE
        dispatch.equipment.current_dispatch = None
        dispatch.equipment.current_step = ""
        dispatch.equipment.progress = 0
        dispatch.equipment.save()
    DispatchLog.objects.create(dispatch=dispatch, level="warning", message="Dispatch cancelled")
    publish_dispatch(dispatch)
    _audit(actor, "dispatch.cancel", dispatch)
    return dispatch


@transaction.atomic
def retry_dispatch(actor, dispatch: DispatchJob, *, simulate_failure: bool = False) -> DispatchJob:
    if dispatch.status != DispatchStatus.FAILED:
        raise DomainError("Only failed dispatches can be retried")
    dispatch.status = DispatchStatus.RETRYING
    dispatch.save(update_fields=["status", "updated_at"])
    dispatch.wip.status = WipStatus.READY_FOR_DISPATCH
    dispatch.wip.locked_at = timezone.now()
    dispatch.wip.save(update_fields=["status", "locked_at", "updated_at"])
    if dispatch.equipment_id:
        dispatch.equipment.status = EquipmentStatus.IDLE
        dispatch.equipment.current_dispatch = None
        dispatch.equipment.save(update_fields=["status", "current_dispatch", "updated_at"])
    return create_dispatch(
        actor,
        dispatch.wip,
        str(dispatch.equipment_id) if dispatch.equipment_id else None,
        simulate_failure=simulate_failure,
    )


def sync_request_completion(wip: WipBatch, verdict: str) -> None:
    experiment_status = (
        SampleExperimentStatus.COMPLETED
        if verdict == "pass"
        else SampleExperimentStatus.FAILED
    )
    updated_requests = {}
    for item in wip.items.select_related("sample", "request__requester"):
        sample = item.sample
        now = timezone.now()
        sample.experiments.filter(current_wip=wip).update(
            status=experiment_status,
            current_wip=None,
            completed_at=now,
            updated_at=now,
        )
        has_remaining = sample.experiments.filter(
            status__in=[
                SampleExperimentStatus.PENDING,
                SampleExperimentStatus.READY,
            ]
        ).exists()
        has_failed = sample.experiments.filter(
            status=SampleExperimentStatus.FAILED
        ).exists()
        sample.current_wip = None
        if verdict != "pass" or has_failed:
            sample.status = SampleStatus.FAILED
        elif has_remaining:
            next_experiment = (
                sample.experiments.filter(status=SampleExperimentStatus.PENDING)
                .order_by("sequence", "created_at")
                .first()
            )
            if next_experiment:
                next_experiment.status = SampleExperimentStatus.READY
                next_experiment.save(update_fields=["status", "updated_at"])
            sample.status = SampleStatus.RECEIVED
        else:
            sample.status = SampleStatus.COMPLETED
        sample.save(update_fields=["status", "current_wip", "updated_at"])
        request = item.request
        if not request.samples.exclude(
            status__in=[SampleStatus.COMPLETED, SampleStatus.FAILED]
        ).exists():
            request.status = RequestStatus.FINAL_CHECK
            request.save(update_fields=["status", "updated_at"])
        elif sample.status == SampleStatus.RECEIVED:
            request.status = RequestStatus.RECEIVED
            request.save(update_fields=["status", "updated_at"])
        updated_requests[request.id] = request
    if not wip.dispatches.exclude(status=DispatchStatus.COMPLETED).exists():
        wip.status = WipStatus.COMPLETED if verdict == "pass" else WipStatus.FAILED
        wip.completed_at = timezone.now()
        wip.save(update_fields=["status", "completed_at", "updated_at"])
    for request in updated_requests.values():
        notify(
            [request.requester],
            "request.experiment_updates",
            f"Request {request.request_no} has completed experiment updates",
            "Please review the latest wafer experiment results.",
            related_entity=request,
        )


@transaction.atomic
def final_confirm_dispatch(actor, dispatch: DispatchJob, notes: str = "") -> DispatchJob:
    dispatch = dispatch_qs().select_for_update(of=("self",)).get(pk=dispatch.pk)
    if dispatch.status != DispatchStatus.COMPLETED:
        raise DomainError("Only completed dispatches can be final-confirmed")
    if dispatch.final_confirmed_at:
        raise DomainError("Dispatch has already been final-confirmed")
    dispatch.final_confirmed_by = actor
    dispatch.final_confirmed_at = timezone.now()
    dispatch.final_confirmation_notes = notes
    dispatch.save(
        update_fields=[
            "final_confirmed_by",
            "final_confirmed_at",
            "final_confirmation_notes",
            "updated_at",
        ]
    )
    request_ids = []
    notified_request_ids = set()
    notification_candidates = []
    for item in dispatch.wip.items.select_related("request__requester"):
        request = item.request
        _sync_request_after_final_check(request)
        request_ids.append(str(request.id))
        if request.status == RequestStatus.COMPLETED:
            notification_candidates.append(request)
    for request in notification_candidates:
        logical_key = (
            request.requester_id,
            request.created_at.date(),
            _logical_request_title(request.title),
        )
        if logical_key in notified_request_ids or not _logical_request_complete(request):
            continue
        notified_request_ids.add(logical_key)
        notify(
            [request.requester],
            "request.completed",
            f"Request {request.request_no} complete",
            notes or f"All wafers and experiments for this request are complete. Results are ready for review.",
            related_entity=request,
        )
    notify_role(
        Role.LAB_MANAGER,
        "dispatch.final_confirmed",
        f"Dispatch {dispatch.dispatch_no} final-confirmed",
        notes,
        related_entity=dispatch,
    )
    DispatchLog.objects.create(
        dispatch=dispatch,
        message="Final check confirmed",
        payload={"notes": notes, "request_ids": request_ids},
    )
    publish_dispatch(dispatch)
    _audit(actor, "dispatch.final_confirm", dispatch, notes)
    return dispatch
