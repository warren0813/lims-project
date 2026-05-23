from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog
from apps.commissions.models import RequestStatus, SampleStatus
from apps.common.codes import next_business_code
from apps.common.exceptions import DomainError
from apps.dispatch.models import DispatchJob, DispatchLog, DispatchStatus
from apps.equipment.models import Equipment, EquipmentCapability, EquipmentStatus
from apps.realtime.events import publish_state
from apps.wip.models import WipBatch, WipStatus
from apps.wip.services import mark_wip_dispatched

TERMINAL = {DispatchStatus.COMPLETED, DispatchStatus.FAILED, DispatchStatus.CANCELLED}


def dispatch_qs():
    return DispatchJob.objects.select_related(
        "wip__recipe__experiment_type",
        "wip__recipe__equipment_type",
        "wip__experiment_type",
        "equipment",
    ).prefetch_related("result")


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
    equipment.status = EquipmentStatus.QUEUED
    equipment.current_dispatch = dispatch
    equipment.progress = 0
    equipment.current_step = "Queued"
    equipment.error_message = ""
    equipment.save()
    for item in wip.items.select_related("sample", "request"):
        item.sample.status = SampleStatus.DISPATCHED
        item.sample.save(update_fields=["status", "updated_at"])
        item.request.status = RequestStatus.DISPATCHED
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
    sample_status = SampleStatus.COMPLETED if verdict == "pass" else SampleStatus.FAILED
    request_status = RequestStatus.COMPLETED if verdict == "pass" else RequestStatus.FAILED
    for item in wip.items.select_related("sample", "request"):
        item.sample.status = sample_status
        item.sample.save(update_fields=["status", "updated_at"])
        request = item.request
        if not request.samples.exclude(status=sample_status).exists():
            request.status = request_status
            request.save(update_fields=["status", "updated_at"])
    if not wip.dispatches.exclude(status=DispatchStatus.COMPLETED).exists():
        wip.status = WipStatus.COMPLETED if verdict == "pass" else WipStatus.FAILED
        wip.completed_at = timezone.now()
        wip.save(update_fields=["status", "completed_at", "updated_at"])
