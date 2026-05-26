from __future__ import annotations

from builtins import range as builtins_range
from datetime import timedelta
from statistics import mean, pstdev

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import HttpRequest
from django.utils import timezone
from ninja import Query, Router

from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role
from apps.commissions.models import (
    ApprovalRecord,
    CommissionRequest,
    RequestStatus,
    Sample,
    SampleStatus,
    SampleStatusHistory,
)
from apps.equipment.models import Equipment, EquipmentEventLog, EquipmentStatus
from apps.wip.models import WipBatch, WipStatus

dashboard_router = Router(tags=["Dashboard"], auth=JWTAuth())
activity_router = Router(tags=["Activity"], auth=JWTAuth())


def _period_days(period: str | None) -> int:
    return {"7d": 7, "30d": 30, "90d": 90}.get(period or "30d", 30)


def _delta(current: int, previous: int) -> dict:
    delta = current - previous
    return {
        "current": current,
        "previous": previous,
        "delta": delta,
        "deltaPercent": None if previous == 0 else round((delta / previous) * 100, 2),
    }


def _previous_count(qs, days: int) -> int:
    now = timezone.now()
    return qs.filter(updated_at__gte=now - timedelta(days=days * 2), updated_at__lt=now - timedelta(days=days)).count()


@dashboard_router.get("/stats", response={200: dict, 403: dict})
def dashboard_stats(request: HttpRequest, period: str | None = Query("30d")):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    days = _period_days(period)
    to_approve = CommissionRequest.objects.filter(status=RequestStatus.WAITING_APPROVAL)
    in_progress = WipBatch.objects.filter(
        status__in=[
            WipStatus.DRAFT,
            WipStatus.READY_FOR_DISPATCH,
            WipStatus.DISPATCHING,
            WipStatus.RUNNING,
        ]
    )
    completed = CommissionRequest.objects.filter(status__in=[RequestStatus.COMPLETED, RequestStatus.CLOSED])
    equipment = Equipment.objects.filter(is_active=True)
    return 200, {
        "toApprove": _delta(to_approve.count(), _previous_count(to_approve, days)),
        "inProgress": _delta(in_progress.count(), _previous_count(in_progress, days)),
        "completed": _delta(
            completed.filter(updated_at__gte=timezone.now() - timedelta(days=days)).count(),
            _previous_count(completed, days),
        ),
        "equipment": _delta(equipment.count(), _previous_count(equipment, days)),
    }


def _daily_series(qs, date_field: str, days: int) -> dict[str, int]:
    start = timezone.now().date() - timedelta(days=days - 1)
    rows = (
        qs.filter(**{f"{date_field}__date__gte": start})
        .annotate(day=TruncDate(date_field))
        .values("day")
        .annotate(count=Count("id"))
    )
    return {str(row["day"]): int(row["count"]) for row in rows}


@dashboard_router.get("/chart", response={200: dict, 403: dict})
def dashboard_chart(
    request: HttpRequest,
    metric: str = Query("samples"),
    range_: str = Query("30d", alias="range"),
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    days = _period_days(range_)
    if metric == "wip":
        series = _daily_series(WipBatch.objects.all(), "created_at", days)
    elif metric == "equipment":
        series = _daily_series(EquipmentEventLog.objects.all(), "created_at", days)
    else:
        series = _daily_series(Sample.objects.all(), "created_at", days)
    start = timezone.now().date() - timedelta(days=days - 1)
    labels = [str(start + timedelta(days=i)) for i in builtins_range(days)]
    daily_count = [series.get(label, 0) for label in labels]
    capacity = max(Equipment.objects.filter(is_active=True).count(), 1)
    utilization = [round(value / capacity, 2) for value in daily_count]
    avg = mean(daily_count) if daily_count else 0
    std = pstdev(daily_count) if len(daily_count) > 1 else 0
    anomalies = [
        {"date": label, "reason": "spike"}
        for label, value in zip(labels, daily_count, strict=False)
        if std > 0 and value > avg + (2 * std)
    ]
    return 200, {
        "labels": labels,
        "dailyCount": daily_count,
        "utilizationPct": utilization,
        "anomalies": anomalies,
    }


@activity_router.get("/recent", response={200: list[dict], 403: dict})
def recent_activity(request: HttpRequest, limit: int = Query(5)):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    since = timezone.now() - timedelta(hours=24)
    max_limit = max(min(limit, 20), 1)
    events: list[dict] = []
    for sample in Sample.objects.select_related("request").filter(created_at__gte=since).order_by("-created_at")[:max_limit]:
        events.append(
            {
                "id": f"sample-{sample.id}",
                "type": "sample_received" if sample.status != SampleStatus.PENDING_RECEIVE else "approval_requested",
                "label": f"Sample {sample.sample_no} received" if sample.status != SampleStatus.PENDING_RECEIVE else f"Sample {sample.sample_no} submitted",
                "timestamp": sample.created_at,
                "linkTo": f"/samples/{sample.id}",
            }
        )
    for history in SampleStatusHistory.objects.select_related("sample").filter(created_at__gte=since).order_by("-created_at")[:max_limit]:
        events.append(
            {
                "id": f"sample-status-{history.id}",
                "type": "sample_received" if history.new_status == SampleStatus.RECEIVED else "test_completed",
                "label": f"Sample {history.sample.sample_no} {history.new_status.replace('_', ' ')}",
                "timestamp": history.created_at,
                "linkTo": f"/samples/{history.sample_id}",
            }
        )
    for approval in ApprovalRecord.objects.select_related("request").filter(created_at__gte=since).order_by("-created_at")[:max_limit]:
        events.append(
            {
                "id": f"approval-{approval.id}",
                "type": "approval_requested",
                "label": f"Request {approval.request.request_no} {approval.decision}",
                "timestamp": approval.created_at,
                "linkTo": "/samples?status=pending",
            }
        )
    for equipment in Equipment.objects.filter(status=EquipmentStatus.FAULTY, updated_at__gte=since).order_by("-updated_at")[:max_limit]:
        events.append(
            {
                "id": f"equipment-{equipment.id}",
                "type": "equipment_alert",
                "label": f"Equipment {equipment.name} flagged",
                "timestamp": equipment.updated_at,
                "linkTo": "/equipment?filter=alerts",
            }
        )
    events.sort(key=lambda item: item["timestamp"], reverse=True)
    return 200, [{**item, "timestamp": item["timestamp"].isoformat()} for item in events[:max_limit]]
