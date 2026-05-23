from __future__ import annotations

from typing import Any

from apps.commissions.models import CommissionRequest, Sample


def user_brief(user) -> dict[str, Any] | None:
    if user is None:
        return None
    profile = getattr(user, "profile", None)
    return {
        "id": user.pk,
        "username": user.username,
        "department": getattr(profile, "department", "") or "",
    }


def experiment_brief(experiment) -> dict[str, Any]:
    return {"id": str(experiment.id), "code": experiment.code, "name": experiment.name}


def recipe_brief(recipe) -> dict[str, Any] | None:
    if recipe is None:
        return None
    return {
        "id": str(recipe.id),
        "recipe_code": recipe.recipe_code,
        "name": recipe.name,
    }


def sample_out(sample: Sample) -> dict[str, Any]:
    return {
        "id": str(sample.id),
        "sample_no": sample.sample_no,
        "sample_name": sample.sample_name,
        "lot_id": sample.lot_id,
        "wafer_id": sample.wafer_id,
        "material_type": sample.material_type,
        "quantity": sample.quantity,
        "status": sample.status,
        "request_id": str(sample.request_id),
        "request_no": sample.request.request_no,
        "requester": user_brief(sample.request.requester),
        "experiment_type": experiment_brief(sample.request.experiment_type),
        "received_at": sample.received_at,
        "received_by": user_brief(sample.received_by),
        "current_wip_id": str(sample.current_wip_id) if sample.current_wip_id else None,
        "holding_area": sample.holding_area,
        "condition": sample.condition,
        "created_at": sample.created_at,
        "updated_at": sample.updated_at,
    }


def request_out(req: CommissionRequest, *, include_detail: bool = True) -> dict[str, Any]:
    data = {
        "id": str(req.id),
        "request_no": req.request_no,
        "title": req.title,
        "description": req.description,
        "requester": user_brief(req.requester),
        "department": req.department,
        "project_code": req.project_code,
        "priority": req.priority,
        "status": req.status,
        "experiment_type": experiment_brief(req.experiment_type),
        "preferred_recipe": recipe_brief(req.preferred_recipe),
        "material_type": req.material_type,
        "required_completion_date": req.required_completion_date,
        "submitted_at": req.submitted_at,
        "approved_at": req.approved_at,
        "approved_by": user_brief(req.approved_by),
        "manager_comment": req.manager_comment,
        "sample_count": req.samples.count(),
        "samples": [],
        "approval_records": [],
        "status_history": [],
        "result": None,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }
    if not include_detail:
        return data

    data["samples"] = [sample_out(sample) for sample in req.samples.all()]
    data["approval_records"] = [
        {
            "reviewer": user_brief(record.reviewer),
            "decision": record.decision,
            "comment": record.comment,
            "created_at": record.created_at,
        }
        for record in req.approval_records.all()
    ]
    data["status_history"] = [
        {
            "previous_status": item.previous_status,
            "new_status": item.new_status,
            "actor": user_brief(item.actor),
            "reason": item.reason,
            "created_at": item.created_at,
        }
        for item in req.status_history.all()
    ]
    return data
