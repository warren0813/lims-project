from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog
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
    RequestStatus.FAILED,
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

    status = RequestStatus.DRAFT if as_draft else RequestStatus.PENDING_APPROVAL
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
    _set_request_status(req, RequestStatus.PENDING_APPROVAL, actor, "submitted")
    _audit(actor, "request.submit", req)
    return req


@transaction.atomic
def approve_request(actor, req: CommissionRequest, payload) -> CommissionRequest:
    if req.status != RequestStatus.PENDING_APPROVAL:
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
    _set_request_status(req, RequestStatus.APPROVED, actor, payload.comment)
    _audit(actor, "request.approve", req)
    return req


@transaction.atomic
def reject_request(actor, req: CommissionRequest, payload) -> CommissionRequest:
    if req.status != RequestStatus.PENDING_APPROVAL:
        raise DomainError("Only pending requests can be rejected")
    ApprovalRecord.objects.create(
        request=req,
        reviewer=actor,
        decision=ApprovalRecord.Decision.REJECTED,
        comment=payload.comment,
    )
    _set_request_status(req, RequestStatus.REJECTED, actor, payload.comment)
    _audit(actor, "request.reject", req)
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
        _set_sample_status(sample, SampleStatus.RETURNED, actor, reason)
    _audit(actor, "request.cancel", req, reason)
    return req


@transaction.atomic
def receive_sample(actor, sample: Sample, payload) -> Sample:
    if sample.request.status != RequestStatus.APPROVED:
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
    _set_sample_status(sample, SampleStatus.WAITING_WIP, actor, "sample received")
    req = sample.request
    if not req.samples.exclude(status=SampleStatus.WAITING_WIP).exists():
        _set_request_status(req, RequestStatus.SAMPLE_RECEIVED, actor, "all samples received")
    _audit(actor, "sample.receive", sample)
    return sample
