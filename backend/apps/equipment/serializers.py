from __future__ import annotations

from typing import Any

from apps.equipment.models import Equipment, EquipmentType, Recipe


def equipment_type_out(equipment_type: EquipmentType) -> dict[str, Any]:
    return {
        "id": str(equipment_type.id),
        "code": equipment_type.code,
        "name": equipment_type.name,
        "queue_name": equipment_type.queue_name,
        "description": equipment_type.description,
    }


def experiment_out(experiment) -> dict[str, Any]:
    return {"id": str(experiment.id), "code": experiment.code, "name": experiment.name}


def recipe_out(recipe: Recipe) -> dict[str, Any]:
    return {
        "id": str(recipe.id),
        "recipe_code": recipe.recipe_code,
        "name": recipe.name,
        "description": recipe.description,
        "experiment_type": experiment_out(recipe.experiment_type),
        "equipment_type": equipment_type_out(recipe.equipment_type),
        "parameters": recipe.parameters,
        "estimated_runtime_sec": recipe.estimated_runtime_sec,
        "max_batch_size": recipe.max_batch_size,
        "material_constraints": recipe.material_constraints,
        "safety_constraints": recipe.safety_constraints,
        "version": recipe.version,
        "is_active": recipe.is_active,
        "created_at": recipe.created_at,
        "updated_at": recipe.updated_at,
    }


def equipment_out(equipment: Equipment) -> dict[str, Any]:
    capabilities = []
    for link in equipment.capability_links.all():
        recipe = link.recipe
        capabilities.append(
            {
                "id": str(recipe.id),
                "name": recipe.name,
                "recipe_code": recipe.recipe_code,
                "experiment_type": recipe.experiment_type.name,
            }
        )
    return {
        "id": str(equipment.id),
        "equipment_code": equipment.equipment_code,
        "name": equipment.name,
        "model_name": equipment.model_name,
        "equipment_type": equipment_type_out(equipment.equipment_type),
        "worker_queue_name": equipment.worker_queue_name,
        "worker_node_name": equipment.worker_node_name,
        "capacity": equipment.capacity,
        "status": equipment.status,
        "current_dispatch_id": (
            str(equipment.current_dispatch_id) if equipment.current_dispatch_id else None
        ),
        "current_step": equipment.current_step,
        "progress": equipment.progress,
        "location": equipment.location,
        "is_active": equipment.is_active,
        "last_heartbeat_at": equipment.last_heartbeat_at,
        "completed_count_today": equipment.completed_count_today,
        "error_message": equipment.error_message,
        "capabilities": capabilities,
        "created_at": equipment.created_at,
        "updated_at": equipment.updated_at,
    }
