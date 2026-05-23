from __future__ import annotations

from typing import Any

from apps.wip.models import WipBatch


def wip_out(wip: WipBatch) -> dict[str, Any]:
    samples = []
    for item in wip.items.all():
        sample = item.sample
        samples.append(
            {
                "id": str(sample.id),
                "sample_no": sample.sample_no,
                "sample_name": sample.sample_name,
                "request_id": str(sample.request_id),
                "request_no": sample.request.request_no,
                "material_type": sample.material_type,
                "status": sample.status,
            }
        )
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
        "dispatch_count": wip.dispatches.count(),
        "created_at": wip.created_at,
        "updated_at": wip.updated_at,
    }
