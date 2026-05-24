from __future__ import annotations

from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuditLog, Role
from apps.accounts.notifications import notify_role
from apps.commissions.models import (
    CommissionRequest,
    RequestStatus,
    Sample,
    SampleStatus,
)
from apps.common.codes import next_business_code, priority_score
from apps.common.exceptions import DomainError
from apps.equipment.models import (
    Equipment,
    EquipmentCapability,
    EquipmentStatus,
    Recipe,
)
from apps.wip.models import (
    DispatchQueueProposal,
    DispatchQueueProposalBatch,
    DispatchQueueProposalItem,
    DispatchQueueProposalStatus,
    WipBatch,
    WipItem,
    WipStatus,
    WipStatusHistory,
)


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
    if status == WipStatus.DISPATCHING:
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
        if sample.status != SampleStatus.RECEIVED:
            raise DomainError(f"Sample {sample.sample_no} is not waiting for WIP")
        if sample.request.status not in {
            RequestStatus.RECEIVED,
            RequestStatus.APPROVED,
            RequestStatus.WAITING_SAMPLE_RECEIVE,
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
        status=WipStatus.DRAFT,
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
        if sample.request.status in {
            RequestStatus.APPROVED,
            RequestStatus.WAITING_SAMPLE_RECEIVE,
            RequestStatus.RECEIVED,
        }:
            sample.request.status = RequestStatus.IN_WIP
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
        .filter(status=SampleStatus.RECEIVED)
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
    if wip.status != WipStatus.DRAFT:
        raise DomainError("Only draft WIP batches can be locked")
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
        item.sample.status = SampleStatus.RECEIVED
        item.sample.current_wip = None
        item.sample.save(update_fields=["status", "current_wip", "updated_at"])
    _set_wip_status(wip, WipStatus.CANCELLED, actor, reason or "cancelled")
    _audit(actor, "wip.cancel", wip, reason)
    return wip


def mark_wip_dispatched(actor, wip: WipBatch) -> None:
    _set_wip_status(wip, WipStatus.DISPATCHING, actor, "dispatch queued")
    CommissionRequest.objects.filter(wip_items__wip=wip).update(status=RequestStatus.QUEUED)


def _candidate_equipment(recipe: Recipe) -> Equipment | None:
    return (
        Equipment.objects.filter(
            equipment_type=recipe.equipment_type,
            is_active=True,
            status=EquipmentStatus.IDLE,
            capability_links__recipe=recipe,
        )
        .order_by("equipment_code")
        .first()
    )


@transaction.atomic
def auto_propose_dispatch_queue(actor, max_batches: int | None = None) -> DispatchQueueProposal:
    samples = list(
        Sample.objects.select_for_update(of=("self",))
        .select_related("request__experiment_type", "request__preferred_recipe")
        .filter(status=SampleStatus.RECEIVED)
    )
    grouped: dict[str, list[Sample]] = defaultdict(list)
    recipe_by_key: dict[str, Recipe] = {}
    warnings: list[str] = []
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
            warnings.append(f"{sample.sample_no}: no active recipe")
            continue
        if not EquipmentCapability.objects.filter(recipe=recipe).exists():
            warnings.append(f"{sample.sample_no}: no equipment supports {recipe.recipe_code}")
            continue
        key = compatibility_key(sample, recipe)
        grouped[key].append(sample)
        recipe_by_key[key] = recipe

    proposal = DispatchQueueProposal.objects.create(
        proposal_no=next_business_code(DispatchQueueProposal, "proposal_no", "DQP"),
        created_by=actor,
        warnings=warnings,
    )
    order = 1
    total_runtime = 0
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
            if max_batches is not None and order > max_batches:
                proposal.estimated_total_runtime_sec = total_runtime
                proposal.save(update_fields=["estimated_total_runtime_sec", "updated_at"])
                return proposal
            chunk = ordered[start : start + recipe.max_batch_size]
            equipment = _candidate_equipment(recipe)
            batch_warnings = [] if equipment else ["No idle compatible equipment is currently available"]
            batch = DispatchQueueProposalBatch.objects.create(
                proposal=proposal,
                experiment_type=recipe.experiment_type,
                recipe=recipe,
                equipment_type=recipe.equipment_type,
                equipment=equipment,
                priority=_priority(chunk),
                order=order,
                compatibility_key=key,
                estimated_runtime_sec=recipe.estimated_runtime_sec,
                reason="Grouped by experiment, recipe, material, priority, and batch capacity",
                warnings=batch_warnings,
            )
            for item_order, sample in enumerate(chunk, start=1):
                DispatchQueueProposalItem.objects.create(
                    batch=batch,
                    sample=sample,
                    request=sample.request,
                    order=item_order,
                    reason="Compatible recipe and material",
                )
            total_runtime += recipe.estimated_runtime_sec
            order += 1
    proposal.estimated_total_runtime_sec = total_runtime
    proposal.save(update_fields=["estimated_total_runtime_sec", "updated_at"])
    _audit(actor, "wip.proposal.create", proposal)
    return proposal


@transaction.atomic
def update_proposal_batch(actor, batch: DispatchQueueProposalBatch, payload) -> DispatchQueueProposalBatch:
    if batch.proposal.status != DispatchQueueProposalStatus.DRAFT:
        raise DomainError("Only draft proposals can be edited")
    updates = payload.model_dump(exclude_unset=True)
    if "equipment_id" in updates:
        equipment_id = updates.pop("equipment_id")
        if equipment_id:
            try:
                equipment = Equipment.objects.get(pk=equipment_id, is_active=True)
            except Equipment.DoesNotExist as exc:
                raise DomainError("Equipment not found or inactive") from exc
            if equipment.equipment_type_id != batch.equipment_type_id:
                raise DomainError("Equipment type does not match proposal batch")
            if not EquipmentCapability.objects.filter(equipment=equipment, recipe=batch.recipe).exists():
                raise DomainError("Equipment does not support this recipe")
            batch.equipment = equipment
        else:
            batch.equipment = None
    if "order" in updates:
        batch.order = updates.pop("order")
    for field, value in updates.items():
        setattr(batch, field, value)
    batch.save()
    _audit(actor, "wip.proposal.update", batch)
    return batch


@transaction.atomic
def remove_proposal_item(actor, item: DispatchQueueProposalItem) -> DispatchQueueProposal:
    proposal = item.batch.proposal
    if proposal.status != DispatchQueueProposalStatus.DRAFT:
        raise DomainError("Only draft proposals can be edited")
    item.delete()
    DispatchQueueProposalBatch.objects.filter(proposal=proposal, items__isnull=True).delete()
    proposal.estimated_total_runtime_sec = sum(
        proposal.batches.values_list("estimated_runtime_sec", flat=True)
    )
    proposal.save(update_fields=["estimated_total_runtime_sec", "updated_at"])
    _audit(actor, "wip.proposal.remove_item", proposal)
    return proposal


@transaction.atomic
def confirm_proposal(actor, proposal: DispatchQueueProposal) -> list[WipBatch]:
    proposal = DispatchQueueProposal.objects.select_for_update().get(pk=proposal.pk)
    if proposal.status != DispatchQueueProposalStatus.DRAFT:
        raise DomainError("Only draft proposals can be confirmed")
    created: list[WipBatch] = []
    dispatch_plan: list[tuple[str, str | None]] = []
    for batch in proposal.batches.select_related("recipe").prefetch_related("items__sample"):
        sample_ids = [str(item.sample_id) for item in batch.items.all()]
        if not sample_ids:
            continue
        wip = create_wip(
            actor,
            sample_ids,
            str(batch.recipe_id),
            batch.priority,
            f"Confirmed from proposal {proposal.proposal_no}",
        )
        lock_wip(actor, wip)
        created.append(wip)
        dispatch_plan.append((str(wip.id), str(batch.equipment_id) if batch.equipment_id else None))
    proposal.status = DispatchQueueProposalStatus.CONFIRMED
    proposal.confirmed_by = actor
    proposal.confirmed_at = timezone.now()
    proposal.save(update_fields=["status", "confirmed_by", "confirmed_at", "updated_at"])

    def queue_dispatches() -> None:
        from apps.dispatch.services import create_dispatch

        queued = 0
        errors: list[str] = []
        for wip_id, equipment_id in dispatch_plan:
            try:
                wip = WipBatch.objects.get(pk=wip_id)
                create_dispatch(actor, wip, equipment_id)
                queued += 1
            except DomainError as exc:
                errors.append(f"WIP {wip_id}: {exc.message}")
            except Exception as exc:  # keep the confirmed queue visible even if dispatch submit fails
                errors.append(f"WIP {wip_id}: {exc}")
        if queued:
            notify_role(
                Role.LAB_USER,
                "wip.auto_dispatched",
                f"{queued} WIP batch(es) dispatched",
                "Equipment simulation has started automatically.",
                related_entity=proposal,
            )
        if errors:
            notify_role(
                Role.LAB_MANAGER,
                "wip.auto_dispatch_failed",
                f"{len(errors)} WIP batch(es) need dispatch attention",
                "; ".join(errors),
                related_entity=proposal,
            )

    transaction.on_commit(queue_dispatches)
    notify_role(
        Role.LAB_USER,
        "wip.proposal.confirmed",
        f"Dispatch proposal {proposal.proposal_no} confirmed",
        f"{len(created)} WIP batch(es) confirmed. Dispatch jobs will be queued automatically.",
        related_entity=proposal,
    )
    _audit(actor, "wip.proposal.confirm", proposal)
    return created
