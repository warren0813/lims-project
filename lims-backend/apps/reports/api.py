from __future__ import annotations

import csv
from datetime import date

from django.db.models import Count
from django.http import HttpRequest, HttpResponse
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_manager_role
from apps.commissions.models import CommissionRequest
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
        "pending_approval": CommissionRequest.objects.filter(status="pending_approval").count(),
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
def equipment_utilization(request: HttpRequest):
    denied = _manager(request)
    if denied:
        return denied
    rows = []
    for equipment in Equipment.objects.all():
        total = DispatchJob.objects.filter(equipment=equipment).count()
        running = DispatchJob.objects.filter(equipment=equipment, status=DispatchStatus.RUNNING).count()
        completed = DispatchJob.objects.filter(equipment=equipment, status=DispatchStatus.COMPLETED).count()
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
    denied = _manager(request)
    if denied:
        return HttpResponse("Permission denied", status=403)
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="lims-results.csv"'
    writer = csv.writer(response)
    writer.writerow(["dispatch_no", "wip_no", "recipe", "verdict", "summary", "created_at"])
    for result in ExperimentResult.objects.select_related("dispatch__wip__recipe"):
        writer.writerow(
            [
                result.dispatch.dispatch_no,
                result.dispatch.wip.wip_no,
                result.dispatch.wip.recipe.recipe_code,
                result.verdict,
                result.summary,
                result.created_at.isoformat(),
            ]
        )
    return response
