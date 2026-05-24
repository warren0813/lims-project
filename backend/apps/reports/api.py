from __future__ import annotations

import csv
from datetime import date

from django.db.models import Count
from django.http import HttpRequest, HttpResponse
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role, has_manager_role
from apps.commissions.models import CommissionRequest, RequestStatus
from apps.dispatch.models import DispatchJob, DispatchStatus
from apps.equipment.models import Equipment
from apps.experiments.models import ExperimentResult
from apps.wip.models import WipBatch

router = Router(tags=["Reports"], auth=JWTAuth())


def _manager(request: HttpRequest):
    if not has_manager_role(request):
        return 403, {"detail": "Permission denied"}
    return None


@router.get("/summary", response={200: dict, 403: ErrorOut})
def summary(request: HttpRequest):
    denied = _manager(request)
    if denied:
        return denied
    return 200, {
        "requests": CommissionRequest.objects.count(),
        "pending_approval": CommissionRequest.objects.filter(
            status=RequestStatus.WAITING_APPROVAL
        ).count(),
        "active_wip": WipBatch.objects.exclude(status__in=["completed", "failed", "cancelled"]).count(),
        "running_dispatches": DispatchJob.objects.filter(status=DispatchStatus.RUNNING).count(),
        "idle_equipment": Equipment.objects.filter(status="idle", is_active=True).count(),
        "failed_dispatches": DispatchJob.objects.filter(status=DispatchStatus.FAILED).count(),
    }


@router.get("/request-statistics", response={200: dict, 403: ErrorOut})
def request_statistics(
    request: HttpRequest,
    start_date: date | None = Query(None),  # noqa: B008
    end_date: date | None = Query(None),  # noqa: B008
):
    denied = _manager(request)
    if denied:
        return denied
    qs = CommissionRequest.objects.all()
    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    return 200, {
        "total": qs.count(),
        "distribution": {row["status"]: row["count"] for row in qs.values("status").annotate(count=Count("id"))},
    }


@router.get("/equipment-utilization", response={200: dict, 403: ErrorOut})
def equipment_utilization(
    request: HttpRequest,
    start_date: date | None = Query(None),  # noqa: B008
    end_date: date | None = Query(None),  # noqa: B008
):
    denied = _manager(request)
    if denied:
        return denied
    rows = []
    for equipment in Equipment.objects.all():
        qs = DispatchJob.objects.filter(equipment=equipment)
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
        total = qs.count()
        running = qs.filter(status=DispatchStatus.RUNNING).count()
        completed = qs.filter(status=DispatchStatus.COMPLETED).count()
        rows.append(
            {
                "equipment_id": str(equipment.id),
                "equipment_name": equipment.name,
                "dispatch_count": total,
                "completed_count": completed,
                "utilization_pct": 100 if running else min(completed * 10, 95),
            }
        )
    return 200, {"data": rows}


@router.get("/throughput", response={200: dict, 403: ErrorOut})
def throughput(request: HttpRequest):
    denied = _manager(request)
    if denied:
        return denied
    rows = (
        DispatchJob.objects.filter(status=DispatchStatus.COMPLETED)
        .extra(select={"day": "date(finished_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    return 200, {"points": list(rows)}


@router.get("/failure-analysis", response={200: dict, 403: ErrorOut})
def failure_analysis(request: HttpRequest):
    denied = _manager(request)
    if denied:
        return denied
    rows = (
        DispatchJob.objects.filter(status=DispatchStatus.FAILED)
        .values("equipment__equipment_code", "error_message")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    return 200, {"failures": list(rows)}


@router.get("/recipe-usage", response={200: dict, 403: ErrorOut})
def recipe_usage(request: HttpRequest):
    denied = _manager(request)
    if denied:
        return denied
    rows = (
        DispatchJob.objects.values("wip__recipe__recipe_code", "wip__recipe__name")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    return 200, {"recipes": list(rows)}


@router.get("/results.csv")
def results_csv(request: HttpRequest):
    if not has_lab_role(request):
        return HttpResponse("Permission denied", status=403)
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="lims-results.csv"'
    writer = csv.writer(response)
    writer.writerow(
        [
            "request_no",
            "fab_user",
            "experiment_type",
            "sample_no",
            "sample_status",
            "batch_no",
            "dispatch_no",
            "equipment_code",
            "equipment_name",
            "recipe",
            "dispatch_status",
            "started_at",
            "finished_at",
            "final_confirmed_at",
            "verdict",
            "summary",
            "error_message",
            "notes",
        ]
    )
    results = ExperimentResult.objects.select_related(
        "dispatch__wip__recipe",
        "dispatch__wip__experiment_type",
        "dispatch__equipment",
    ).prefetch_related("dispatch__wip__items__sample", "dispatch__wip__items__request__requester")
    for result in results:
        dispatch = result.dispatch
        for item in dispatch.wip.items.all():
            request_obj = item.request
            writer.writerow(
                [
                    request_obj.request_no,
                    request_obj.requester.username,
                    dispatch.wip.experiment_type.name,
                    item.sample.sample_no,
                    item.sample.status,
                    dispatch.wip.wip_no,
                    dispatch.dispatch_no,
                    dispatch.equipment.equipment_code if dispatch.equipment else "",
                    dispatch.equipment.name if dispatch.equipment else "",
                    dispatch.wip.recipe.recipe_code,
                    dispatch.status,
                    dispatch.started_at.isoformat() if dispatch.started_at else "",
                    dispatch.finished_at.isoformat() if dispatch.finished_at else "",
                    dispatch.final_confirmed_at.isoformat()
                    if dispatch.final_confirmed_at
                    else "",
                    result.verdict,
                    result.summary,
                    dispatch.error_message,
                    dispatch.final_confirmation_notes,
                ]
            )
    return response


@router.get("/results.pdf")
def results_pdf_placeholder(request: HttpRequest):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    return 200, {
        "available": False,
        "format": "pdf",
        "detail": "PDF export is not configured in this deployment; CSV export is available.",
    }
