from __future__ import annotations

from typing import Any

from apps.dispatch.models import DispatchJob


def result_out(result) -> dict[str, Any] | None:
    if result is None:
        return None
    return {
        "id": str(result.id),
        "summary": result.summary,
        "verdict": result.verdict,
        "data": result.data,
        "data_source": result.data_source,
        "created_at": result.created_at,
    }


def dispatch_out(dispatch: DispatchJob) -> dict[str, Any]:
    equipment = dispatch.equipment
    result = getattr(dispatch, "result", None)
    return {
        "id": str(dispatch.id),
        "dispatch_no": dispatch.dispatch_no,
        "wip_id": str(dispatch.wip_id),
        "wip_no": dispatch.wip.wip_no,
        "equipment_id": str(equipment.id) if equipment else None,
        "equipment_name": equipment.name if equipment else None,
        "equipment_code": equipment.equipment_code if equipment else None,
        "recipe_id": str(dispatch.wip.recipe_id),
        "recipe_name": dispatch.wip.recipe.name,
        "experiment_type_id": str(dispatch.wip.experiment_type_id),
        "experiment_type_name": dispatch.wip.experiment_type.name,
        "status": dispatch.status,
        "progress": dispatch.progress,
        "current_step": dispatch.current_step,
        "worker_node": dispatch.worker_node,
        "queue_name": dispatch.queue_name,
        "queue_position": dispatch.queue_position,
        "error_message": dispatch.error_message,
        "attempt": dispatch.attempt,
        "celery_task_id": dispatch.celery_task_id,
        "queued_at": dispatch.queued_at,
        "started_at": dispatch.started_at,
        "finished_at": dispatch.finished_at,
        "final_confirmed_at": dispatch.final_confirmed_at,
        "final_confirmation_notes": dispatch.final_confirmation_notes,
        "result": result_out(result),
        "created_at": dispatch.created_at,
        "updated_at": dispatch.updated_at,
    }
