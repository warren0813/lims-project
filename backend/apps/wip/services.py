from __future__ import annotations

from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog
from apps.commissions.models import (
    CommissionRequest,
    RequestStatus,
    Sample,
    SampleStatus,
)
from apps.common.codes import next_business_code, priority_score
from apps.common.exceptions import DomainError
from apps.equipment.models import Recipe
from apps.wip.models import WipBatch, WipItem, WipStatus, WipStatusHistory


def _audit(actor, action: str, entity, message: str = ""):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity.__class__.__name__,
        entity_id=str(entity.pk),
        message=message,
    )


def _set_wip_status(wip: WipBatch, status: str, actor, reason: str = "") -> None:
    previous = wip.status
    if previous == status:
        return
    wip.status = status
    fields = ["status", "updated_at"]
    if status == WipStatus.READY_FOR_DISPATCH:
        wip.locked_at = timezone.now()
        fields.append("locked_at")
    if status == WipStatus.DISPATCHED:
        wip.dispatched_at = timezone.now()
        fields.append("dispatched_at")
    if status in {WipStatus.COMPLETED, WipStatus.FAILED, WipStatus.CANCELLED}:
        wip.completed_at = timezone.now()
        fields.append("completed_at")
    wip.save(update_fields=fields)
    WipStatusHistory.objects.create(
        wip=wip,
        previous_status=previous,
        new_status=status,
        actor=actor,
        reason=reason,
    )


def compatibility_key(sample: Sample, recipe: Recipe) -> str:
    return "|".join(
        [
            str(sample.request.experiment_type_id),
            str(recipe.id),
            recipe.equipment_type_id.hex,
            sample.material_type.lower(),
        ]
    )


def _priority(samples: list[Sample]) -> str:
    return max((sample.request.priority for sample in samples), key=priority_score)


def _validate_samples(samples: list[Sample], recipe: Recipe) -> str:
    if not samples:
        raise DomainError("At least one sample is required")
    keys = {compatibility_key(sample, recipe) for sample in samples}
    if len(keys) != 1:
        raise DomainError("Samples are not compatible for the selected recipe")
    for sample in samples:
        if sample.status != SampleStatus.WAITING_WIP:
            raise DomainError(f"Sample {sample.sample_no} is not waiting for WIP")
        if sample.request.status not in {
            RequestStatus.SAMPLE_RECEIVED,
            RequestStatus.APPROVED,
        }:
            raise DomainError(f"Request {sample.request.request_no} is not ready for WIP")
    return keys.pop()


@transaction.atomic
def create_wip(actor, sample_ids: list[str], recipe_id: str, priority: str = "normal", note: str = "") -> WipBatch:
    try:
        recipe = Recipe.objects.select_related("experiment_type", "equipment_type").get(
            pk=recipe_id, is_active=True
        )
    except Recipe.DoesNotExist as exc:
        raise DomainError("Recipe not found or inactive") from exc
    samples = list(
        Sample.objects.select_for_update(of=("self",))
        .select_related("request__experiment_type")
        .filter(pk__in=sample_ids)
    )
    if len(samples) != len(set(sample_ids)):
        raise DomainError("One or more samples were not found")
    key = _validate_samples(samples, recipe)
    wip = WipBatch.objects.create(
        wip_no=next_business_code(WipBatch, "wip_no", "WIP"),
        experiment_type=recipe.experiment_type,
        recipe=recipe,
        equipment_type=recipe.equipment_type,
        status=WipStatus.CREATED,
        priority=priority or _priority(samples),
        compatibility_key=key,
        created_by=actor,
        note=note,
    )
    for index, sample in enumerate(samples, start=1):
        WipItem.objects.create(
            wip=wip, sample=sample, request=sample.request, sequence=index
        )
        sample.status = SampleStatus.IN_WIP
        sample.current_wip = wip
        sample.save(update_fields=["status", "current_wip", "updated_at"])
        if sample.request.status in {RequestStatus.APPROVED, RequestStatus.SAMPLE_RECEIVED}:
            sample.request.status = RequestStatus.WIP_CREATED
            sample.request.save(update_fields=["status", "updated_at"])
    WipStatusHistory.objects.create(
        wip=wip, previous_status="", new_status=wip.status, actor=actor, reason="created"
    )
    _audit(actor, "wip.create", wip)
    return wip


@transaction.atomic
def auto_create_wip_batches(actor, max_batches: int | None = None) -> list[WipBatch]:
    samples = list(
        Sample.objects.select_for_update(of=("self",))
        .select_related("request__experiment_type", "request__preferred_recipe")
        .filter(status=SampleStatus.WAITING_WIP)
    )
    grouped: dict[str, list[Sample]] = defaultdict(list)
    recipe_by_key = {}
    for sample in samples:
        recipe = sample.request.preferred_recipe
        if recipe is None or not recipe.is_active:
            recipe = (
                Recipe.objects.filter(
                    experiment_type=sample.request.experiment_type,
                    is_active=True,
                )
                .order_by("recipe_code")
                .first()
            )
        if recipe is None:
            continue
        key = compatibility_key(sample, recipe)
        grouped[key].append(sample)
        recipe_by_key[key] = recipe

    created: list[WipBatch] = []
    for key in sorted(grouped):
        recipe = recipe_by_key[key]
        ordered = sorted(
            grouped[key],
            key=lambda sample: (
                -priority_score(sample.request.priority),
                sample.request.required_completion_date or timezone.now().date(),
                sample.created_at,
            ),
        )
        for start in range(0, len(ordered), recipe.max_batch_size):
            if max_batches is not None and len(created) >= max_batches:
                return created
            chunk = ordered[start : start + recipe.max_batch_size]
            created.append(
                create_wip(
                    actor,
                    [str(sample.id) for sample in chunk],
                    str(recipe.id),
                    _priority(chunk),
                    "Auto-created by dispatcher",
                )
            )
    return created


@transaction.atomic
def lock_wip(actor, wip: WipBatch) -> WipBatch:
    if wip.status != WipStatus.CREATED:
        raise DomainError("Only created WIP batches can be locked")
    if not wip.items.exists():
        raise DomainError("Cannot lock an empty WIP batch")
    _set_wip_status(wip, WipStatus.READY_FOR_DISPATCH, actor, "locked")
    _audit(actor, "wip.lock", wip)
    return wip


@transaction.atomic
def cancel_wip(actor, wip: WipBatch, reason: str = "") -> WipBatch:
    if wip.status in {WipStatus.RUNNING, WipStatus.COMPLETED}:
        raise DomainError("Running or completed WIP batches cannot be cancelled")
    for item in wip.items.select_related("sample"):
        item.sample.status = SampleStatus.WAITING_WIP
        item.sample.current_wip = None
        item.sample.save(update_fields=["status", "current_wip", "updated_at"])
    _set_wip_status(wip, WipStatus.CANCELLED, actor, reason or "cancelled")
    _audit(actor, "wip.cancel", wip, reason)
    return wip


def mark_wip_dispatched(actor, wip: WipBatch) -> None:
    _set_wip_status(wip, WipStatus.DISPATCHED, actor, "dispatch queued")
    CommissionRequest.objects.filter(wip_items__wip=wip).update(status=RequestStatus.DISPATCHED)
