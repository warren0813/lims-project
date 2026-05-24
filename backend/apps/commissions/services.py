from __future__ import annotations

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog, Role
from apps.accounts.notifications import notify, notify_role
from apps.commissions.models import (
    ApprovalRecord,
    CommissionRequest,
    RequestStatus,
    RequestStatusHistory,
    Sample,
    SampleStatus,
    SampleStatusHistory,
)
from apps.common.codes import next_business_code
from apps.common.exceptions import DomainError
from apps.equipment.models import Recipe
from apps.experiments.models import ExperimentType

TERMINAL_REQUEST_STATUSES = {
    RequestStatus.COMPLETED,
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED,
}


def _audit(actor, action: str, entity, message: str = "", metadata: dict | None = None):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity.__class__.__name__,
        entity_id=str(entity.pk),
        message=message,
        metadata=metadata or {},
    )


def _set_request_status(req, status: str, actor, reason: str = "") -> None:
    previous = req.status
    if previous == status:
        return
    req.status = status
    req.save(update_fields=["status", "updated_at"])
    RequestStatusHistory.objects.create(
        request=req,
        previous_status=previous,
        new_status=status,
        actor=actor,
        reason=reason,
    )


def _set_sample_status(sample, status: str, actor, reason: str = "") -> None:
    previous = sample.status
    if previous == status:
        return
    sample.status = status
    sample.save(update_fields=["status", "updated_at"])
    SampleStatusHistory.objects.create(
        sample=sample,
        previous_status=previous,
        new_status=status,
        actor=actor,
        reason=reason,
    )


def _default_recipe(experiment_type: ExperimentType) -> Recipe | None:
    return (
        Recipe.objects.filter(experiment_type=experiment_type, is_active=True)
        .order_by("recipe_code")
        .first()
    )


@transaction.atomic
def create_request(actor, payload, *, as_draft: bool) -> CommissionRequest:
    try:
        experiment_type = ExperimentType.objects.get(
            id=payload.experiment_type_id, is_active=True
        )
    except ExperimentType.DoesNotExist as exc:
        raise DomainError("Experiment type not found or inactive") from exc

    recipe = None
    if payload.preferred_recipe_id:
        try:
            recipe = Recipe.objects.get(
                id=payload.preferred_recipe_id,
                experiment_type=experiment_type,
                is_active=True,
            )
        except Recipe.DoesNotExist as exc:
            raise DomainError("Preferred recipe not found or inactive") from exc
    else:
        recipe = _default_recipe(experiment_type)

    status = RequestStatus.DRAFT if as_draft else RequestStatus.WAITING_APPROVAL
    req = CommissionRequest.objects.create(
        request_no=next_business_code(CommissionRequest, "request_no", "REQ"),
        requester=actor,
        title=payload.title,
        description=payload.description,
        department=payload.department or getattr(actor.profile, "department", ""),
        project_code=payload.project_code,
        priority=payload.priority,
        status=status,
        experiment_type=experiment_type,
        preferred_recipe=recipe,
        material_type=payload.material_type,
        target_measurement=payload.target_measurement,
        expected_output_format=payload.expected_output_format,
        special_instruction=payload.special_instruction,
        safety_rules_confirmed=payload.safety_rules_confirmed,
        required_completion_date=payload.required_completion_date,
        submitted_at=None if as_draft else timezone.now(),
    )
    RequestStatusHistory.objects.create(
        request=req,
        previous_status="",
        new_status=req.status,
        actor=actor,
        reason="created as draft" if as_draft else "submitted",
    )
    for sample_in in payload.samples:
        sample = Sample.objects.create(
            sample_no=next_business_code(Sample, "sample_no", "SMP"),
            request=req,
            sample_name=sample_in.sample_name,
            lot_id=sample_in.lot_id,
            wafer_id=sample_in.wafer_id,
            material_type=sample_in.material_type or payload.material_type,
            quantity=sample_in.quantity,
            description=sample_in.description,
            handling_notes=sample_in.handling_notes,
        )
        SampleStatusHistory.objects.create(
            sample=sample,
            previous_status="",
            new_status=sample.status,
            actor=actor,
            reason="registered with request",
        )
    _audit(actor, "request.create", req)
    if not as_draft:
        notify_role(
            Role.LAB_MANAGER,
            "request.submitted",
            f"New request {req.request_no}",
            req.title,
            related_entity=req,
        )
    return req


@transaction.atomic
def update_request(actor, req: CommissionRequest, payload) -> CommissionRequest:
    if req.requester_id != actor.pk:
        raise DomainError("Only the requester can update this request", code="FORBIDDEN")
    if req.status != RequestStatus.DRAFT:
        raise DomainError("Only draft requests can be edited")

    updates = payload.model_dump(exclude_unset=True)
    recipe_id = updates.pop("preferred_recipe_id", None)
    for field, value in updates.items():
        setattr(req, field, value)
    if recipe_id is not None:
        req.preferred_recipe = Recipe.objects.get(id=recipe_id) if recipe_id else None
    req.save()
    _audit(actor, "request.update", req)
    return req


@transaction.atomic
def submit_request(actor, req: CommissionRequest) -> CommissionRequest:
    if req.requester_id != actor.pk:
        raise DomainError("Only the requester can submit this request", code="FORBIDDEN")
    if req.status != RequestStatus.DRAFT:
        raise DomainError("Only draft requests can be submitted")
    req.submitted_at = timezone.now()
    req.save(update_fields=["submitted_at", "updated_at"])
    _set_request_status(req, RequestStatus.WAITING_APPROVAL, actor, "submitted")
    _audit(actor, "request.submit", req)
    notify_role(
        Role.LAB_MANAGER,
        "request.submitted",
        f"New request {req.request_no}",
        req.title,
        related_entity=req,
    )
    return req


@transaction.atomic
def approve_request(actor, req: CommissionRequest, payload) -> CommissionRequest:
    if req.status != RequestStatus.WAITING_APPROVAL:
        raise DomainError("Only pending requests can be approved")
    if payload.priority_override:
        req.priority = payload.priority_override
    if payload.suggested_recipe_id:
        req.preferred_recipe = Recipe.objects.get(id=payload.suggested_recipe_id)
    if payload.expected_completion_date:
        req.required_completion_date = payload.expected_completion_date
    req.approved_at = timezone.now()
    req.approved_by = actor
    req.manager_comment = payload.comment
    req.save()
    ApprovalRecord.objects.create(
        request=req,
        reviewer=actor,
        decision=ApprovalRecord.Decision.APPROVED,
        comment=payload.comment,
        priority_override=payload.priority_override or "",
        suggested_recipe=req.preferred_recipe,
    )
    _set_request_status(req, RequestStatus.WAITING_SAMPLE_RECEIVE, actor, payload.comment)
    _audit(actor, "request.approve", req)
    notify(
        [req.requester],
        "request.approved",
        f"Request {req.request_no} approved",
        payload.comment,
        related_entity=req,
    )
    notify_role(
        Role.LAB_USER,
        "sample.incoming",
        f"Samples ready to receive for {req.request_no}",
        req.title,
        related_entity=req,
    )
    return req


@transaction.atomic
def reject_request(actor, req: CommissionRequest, payload) -> CommissionRequest:
    if req.status != RequestStatus.WAITING_APPROVAL:
        raise DomainError("Only pending requests can be rejected")
    ApprovalRecord.objects.create(
        request=req,
        reviewer=actor,
        decision=ApprovalRecord.Decision.REJECTED,
        comment=payload.comment,
    )
    _set_request_status(req, RequestStatus.REJECTED, actor, payload.comment)
    _audit(actor, "request.reject", req)
    notify(
        [req.requester],
        "request.rejected",
        f"Request {req.request_no} rejected",
        payload.comment,
        related_entity=req,
    )
    return req


@transaction.atomic
def request_more_information(actor, req: CommissionRequest, comment: str) -> CommissionRequest:
    if req.status != RequestStatus.WAITING_APPROVAL:
        raise DomainError("Only pending requests can be returned for more information")
    ApprovalRecord.objects.create(
        request=req,
        reviewer=actor,
        decision=ApprovalRecord.Decision.MORE_INFO,
        comment=comment,
    )
    req.manager_comment = comment
    req.save(update_fields=["manager_comment", "updated_at"])
    notify(
        [req.requester],
        "request.more_info",
        f"More information requested for {req.request_no}",
        comment,
        related_entity=req,
    )
    _audit(actor, "request.more_info", req, comment)
    return req


@transaction.atomic
def assign_request(actor, req: CommissionRequest, lab_user_id: int | None) -> CommissionRequest:
    lab_user = None
    if lab_user_id is not None:
        try:
            lab_user = User.objects.select_related("profile").get(pk=lab_user_id)
        except User.DoesNotExist as exc:
            raise DomainError("Lab user not found") from exc
        if getattr(lab_user.profile, "role", "") not in {Role.LAB_USER, Role.LAB_MEMBER}:
            raise DomainError("Assignee must be a lab user")
    req.assigned_lab_user = lab_user
    req.save(update_fields=["assigned_lab_user", "updated_at"])
    if lab_user:
        notify(
            [lab_user],
            "request.assigned",
            f"Request {req.request_no} assigned",
            req.title,
            related_entity=req,
        )
    _audit(actor, "request.assign", req, str(lab_user_id or "unassigned"))
    return req


@transaction.atomic
def cancel_request(actor, req: CommissionRequest, reason: str) -> CommissionRequest:
    if req.status in TERMINAL_REQUEST_STATUSES:
        raise DomainError("This request is already terminal")
    if req.requester_id != actor.pk and getattr(actor.profile, "role", "") not in {
        "lab_manager",
        "admin",
    }:
        raise DomainError("Permission denied", code="FORBIDDEN")
    _set_request_status(req, RequestStatus.CANCELLED, actor, reason)
    for sample in req.samples.exclude(
        status__in=[SampleStatus.COMPLETED, SampleStatus.FAILED]
    ):
        _set_sample_status(sample, SampleStatus.REJECTED, actor, reason)
    _audit(actor, "request.cancel", req, reason)
    notify(
        [req.requester],
        "request.cancelled",
        f"Request {req.request_no} cancelled",
        reason,
        related_entity=req,
    )
    return req


@transaction.atomic
def receive_sample(actor, sample: Sample, payload) -> Sample:
    if sample.request.status not in {
        RequestStatus.APPROVED,
        RequestStatus.WAITING_SAMPLE_RECEIVE,
    }:
        raise DomainError("Samples can only be received for approved requests")
    if sample.status != SampleStatus.PENDING_RECEIVE:
        raise DomainError("Only pending samples can be received")
    sample.received_by = actor
    sample.received_at = timezone.now()
    sample.condition = payload.condition
    sample.holding_area = payload.holding_area
    if payload.note:
        sample.handling_notes = f"{sample.handling_notes}\n{payload.note}".strip()
    sample.save()
    _set_sample_status(sample, SampleStatus.RECEIVED, actor, "sample received")
    req = sample.request
    if not req.samples.exclude(status=SampleStatus.RECEIVED).exists():
        _set_request_status(req, RequestStatus.RECEIVED, actor, "all samples received")
    _audit(actor, "sample.receive", sample)
    notify(
        [req.requester],
        "sample.received",
        f"Sample {sample.sample_no} received",
        req.title,
        related_entity=sample,
    )
    return sample


@transaction.atomic
def reject_sample(actor, sample: Sample, reason: str) -> Sample:
    if not reason:
        raise DomainError("A rejection reason is required")
    if sample.status not in {SampleStatus.PENDING_RECEIVE, SampleStatus.RECEIVED}:
        raise DomainError("Only incoming or received samples can be rejected")
    if reason:
        sample.handling_notes = f"{sample.handling_notes}\n{reason}".strip()
    sample.save(update_fields=["handling_notes", "updated_at"])
    _set_sample_status(sample, SampleStatus.REJECTED, actor, reason)
    request = sample.request
    if not request.samples.exclude(status=SampleStatus.REJECTED).exists():
        _set_request_status(request, RequestStatus.REJECTED, actor, reason)
    notify(
        [request.requester],
        "sample.rejected",
        f"Sample {sample.sample_no} rejected",
        reason,
        related_entity=sample,
    )
    notify_role(
        Role.LAB_MANAGER,
        "sample.rejected",
        f"Sample {sample.sample_no} rejected",
        reason,
        related_entity=sample,
    )
    _audit(actor, "sample.reject", sample, reason)
    return sample
