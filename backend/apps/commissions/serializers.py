from __future__ import annotations

from typing import Any

from apps.commissions.models import CommissionRequest, Sample, SampleExperimentStatus


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


def sample_experiment_out(item) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "experiment_type": experiment_brief(item.experiment_type),
        "recipe": recipe_brief(item.recipe),
        "sequence": item.sequence,
        "status": item.status,
        "current_wip_id": str(item.current_wip_id) if item.current_wip_id else None,
        "started_at": item.started_at,
        "completed_at": item.completed_at,
    }


def experiment_progress(experiments) -> dict[str, Any]:
    rows = list(experiments)
    total = len(rows)
    completed = sum(
        1 for item in rows if item.status == SampleExperimentStatus.COMPLETED
    )
    failed = sum(1 for item in rows if item.status == SampleExperimentStatus.FAILED)
    active = sum(
        1
        for item in rows
        if item.status
        in {SampleExperimentStatus.IN_WIP, SampleExperimentStatus.RUNNING}
    )
    pending = max(total - completed - failed - active, 0)
    return {
        "total": total,
        "completed": completed,
        "failed": failed,
        "active": active,
        "pending": pending,
        "percent": round((completed / total) * 100) if total else 0,
        "all_done": total > 0 and completed == total,
        "has_failed": failed > 0,
    }


def sample_out(sample: Sample) -> dict[str, Any]:
    experiments = list(getattr(sample, "experiments", []).all())
    progress = experiment_progress(experiments)
    final_review_dispatch_id = (
        sample.wip_items.filter(
            wip__dispatches__status="completed",
            wip__dispatches__final_confirmed_at__isnull=True,
        )
        .order_by("-wip__dispatches__finished_at", "-wip__dispatches__created_at")
        .values_list("wip__dispatches__id", flat=True)
        .first()
    )
    latest_dispatch_id = (
        sample.wip_items.filter(wip__dispatches__status="completed")
        .order_by("-wip__dispatches__finished_at", "-wip__dispatches__created_at")
        .values_list("wip__dispatches__id", flat=True)
        .first()
    )
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
        "experiments": [sample_experiment_out(item) for item in experiments],
        "experiment_progress": progress,
        "safe_to_close": progress["all_done"],
        "latest_dispatch_id": str(latest_dispatch_id) if latest_dispatch_id else None,
        "final_review_dispatch_id": str(final_review_dispatch_id) if final_review_dispatch_id else None,
        "created_at": sample.created_at,
        "updated_at": sample.updated_at,
    }


def request_out(req: CommissionRequest, *, include_detail: bool = True) -> dict[str, Any]:
    samples = list(req.samples.all())
    all_experiments = []
    experiment_map = {}
    for sample in samples:
        for item in sample.experiments.all():
            all_experiments.append(item)
            experiment_map[str(item.experiment_type_id)] = item.experiment_type
    if not experiment_map and req.experiment_type_id:
        experiment_map[str(req.experiment_type_id)] = req.experiment_type
    progress = experiment_progress(all_experiments)
    completed_samples = sum(
        1
        for sample in samples
        if experiment_progress(list(sample.experiments.all()))["all_done"]
    )
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
        "experiment_types": [
            experiment_brief(experiment)
            for experiment in sorted(experiment_map.values(), key=lambda item: item.name)
        ],
        "preferred_recipe": recipe_brief(req.preferred_recipe),
        "material_type": req.material_type,
        "required_completion_date": req.required_completion_date,
        "submitted_at": req.submitted_at,
        "approved_at": req.approved_at,
        "approved_by": user_brief(req.approved_by),
        "assigned_lab_user": user_brief(req.assigned_lab_user),
        "manager_comment": req.manager_comment,
        "sample_count": req.samples.count(),
        "wafer_progress": {
            "total": len(samples),
            "completed": completed_samples,
            "pending": max(len(samples) - completed_samples, 0),
            "percent": round((completed_samples / len(samples)) * 100)
            if samples
            else 0,
        },
        "experiment_progress": progress,
        "safe_to_close": progress["all_done"],
        "samples": [],
        "approval_records": [],
        "status_history": [],
        "result": None,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }
    if not include_detail:
        return data

    data["samples"] = [sample_out(sample) for sample in samples]
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
