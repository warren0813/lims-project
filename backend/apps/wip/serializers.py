from __future__ import annotations

from typing import Any

from apps.commissions.serializers import experiment_progress
from apps.equipment.models import Equipment, EquipmentStatus
from apps.wip.models import DispatchQueueProposal, WipBatch


def _proposal_readiness(batch) -> dict[str, Any]:
    compatible = Equipment.objects.filter(
        equipment_type=batch.equipment_type,
        is_active=True,
        capability_links__recipe=batch.recipe,
    ).distinct()
    compatible_count = compatible.count()
    idle_count = compatible.filter(status=EquipmentStatus.IDLE).count()
    if batch.equipment_id and batch.equipment.status == EquipmentStatus.IDLE:
        status = "ready_to_dispatch"
        message = "Ready to Dispatch"
    elif idle_count > 0:
        status = "ready_to_dispatch"
        message = "Ready to Dispatch"
    elif compatible_count == 0:
        status = "waiting_for_equipment"
        message = f"Waiting for compatible equipment: {batch.equipment_type.name}"
    elif batch.equipment_id and batch.equipment.current_dispatch_id:
        status = "blocked"
        message = "Current dispatch is running"
    elif compatible.filter(status=EquipmentStatus.WORKING).exists():
        status = "waiting_for_equipment"
        message = "Equipment is running"
    else:
        status = "waiting_for_equipment"
        message = "Equipment under full load"
    return {
        "readiness_status": status,
        "readiness_message": message,
        "ready_to_dispatch": status == "ready_to_dispatch",
        "compatible_equipment_count": compatible_count,
        "available_equipment_count": idle_count,
    }


def wip_out(wip: WipBatch) -> dict[str, Any]:
    samples = []
    for item in wip.items.all():
        sample = item.sample
        experiments = list(sample.experiments.all())
        samples.append(
            {
                "id": str(sample.id),
                "sample_no": sample.sample_no,
                "sample_name": sample.sample_name,
                "request_id": str(sample.request_id),
                "request_no": sample.request.request_no,
                "material_type": sample.material_type,
                "status": sample.status,
                "experiments": [
                    {
                        "id": str(exp.id),
                        "experiment_type_id": str(exp.experiment_type_id),
                        "experiment_type_name": exp.experiment_type.name,
                        "recipe_id": str(exp.recipe_id) if exp.recipe_id else None,
                        "status": exp.status,
                        "sequence": exp.sequence,
                        "current_wip_id": str(exp.current_wip_id) if exp.current_wip_id else None,
                    }
                    for exp in experiments
                ],
                "experiment_progress": experiment_progress(experiments),
                "safe_to_close": experiment_progress(experiments)["all_done"],
            }
        )
    all_experiments = [exp for sample in samples for exp in sample["experiments"]]
    return {
        "id": str(wip.id),
        "wip_no": wip.wip_no,
        "experiment_type_id": str(wip.experiment_type_id),
        "experiment_type_name": wip.experiment_type.name,
        "recipe_id": str(wip.recipe_id),
        "recipe_name": wip.recipe.name,
        "equipment_type_id": str(wip.equipment_type_id),
        "equipment_type_name": wip.equipment_type.name,
        "sample_count": len(samples),
        "priority": wip.priority,
        "status": wip.status,
        "compatibility_key": wip.compatibility_key,
        "locked_at": wip.locked_at,
        "dispatched_at": wip.dispatched_at,
        "completed_at": wip.completed_at,
        "note": wip.note,
        "samples": samples,
        "experiment_progress": {
            "total": len(all_experiments),
            "completed": sum(1 for exp in all_experiments if exp["status"] == "completed"),
            "failed": sum(1 for exp in all_experiments if exp["status"] == "failed"),
            "active": sum(1 for exp in all_experiments if exp["status"] in {"in_wip", "running"}),
            "pending": sum(1 for exp in all_experiments if exp["status"] in {"pending", "ready"}),
            "percent": round(
                (
                    sum(1 for exp in all_experiments if exp["status"] == "completed")
                    / len(all_experiments)
                )
                * 100
            )
            if all_experiments
            else 0,
            "all_done": bool(all_experiments)
            and all(exp["status"] == "completed" for exp in all_experiments),
        },
        "safe_to_close": bool(all_experiments)
        and all(exp["status"] == "completed" for exp in all_experiments),
        "dispatch_count": wip.dispatches.count(),
        "created_at": wip.created_at,
        "updated_at": wip.updated_at,
    }


def proposal_out(proposal: DispatchQueueProposal) -> dict[str, Any]:
    batches = []
    for batch in proposal.batches.all():
        items = []
        for item in batch.items.all():
            sample = item.sample
            request = item.request
            items.append(
                {
                    "id": str(item.id),
                    "sample_id": str(sample.id),
                    "sample_no": sample.sample_no,
                    "sample_status": sample.status,
                    "request_id": str(request.id),
                    "request_no": request.request_no,
                    "fab_user": request.requester.username,
                    "priority": request.priority,
                    "order": item.order,
                    "reason": item.reason,
                }
            )
        batches.append(
            {
                "id": str(batch.id),
                "experiment_type_id": str(batch.experiment_type_id),
                "experiment_type_name": batch.experiment_type.name,
                "recipe_id": str(batch.recipe_id),
                "recipe_name": batch.recipe.name,
                "equipment_type_id": str(batch.equipment_type_id),
                "equipment_type_name": batch.equipment_type.name,
                "equipment_id": str(batch.equipment_id) if batch.equipment_id else None,
                "equipment_name": batch.equipment.name if batch.equipment else None,
                "equipment_capacity": batch.equipment.capacity if batch.equipment else None,
                "equipment_status": batch.equipment.status if batch.equipment else None,
                "equipment_queue_name": (
                    batch.equipment.worker_queue_name
                    if batch.equipment and batch.equipment.worker_queue_name
                    else batch.equipment_type.queue_name
                ),
                "recipe_max_batch_size": batch.recipe.max_batch_size,
                "priority": batch.priority,
                "order": batch.order,
                "estimated_runtime_sec": batch.estimated_runtime_sec,
                "reason": batch.reason,
                "warnings": batch.warnings,
                "items": items,
                **_proposal_readiness(batch),
            }
        )
    return {
        "id": str(proposal.id),
        "proposal_no": proposal.proposal_no,
        "status": proposal.status,
        "source": proposal.source,
        "warnings": proposal.warnings,
        "note": proposal.note,
        "estimated_total_runtime_sec": proposal.estimated_total_runtime_sec,
        "batches": batches,
        "created_at": proposal.created_at,
        "updated_at": proposal.updated_at,
    }
