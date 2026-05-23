from __future__ import annotations

from django.db.models import QuerySet

from apps.accounts.models import Role
from apps.commissions.models import CommissionRequest, Sample


def request_queryset() -> QuerySet[CommissionRequest]:
    return (
        CommissionRequest.objects.select_related(
            "requester__profile",
            "experiment_type",
            "preferred_recipe",
            "approved_by__profile",
        )
        .prefetch_related(
            "samples__request__requester__profile",
            "samples__request__experiment_type",
            "samples__received_by__profile",
            "approval_records__reviewer__profile",
            "status_history__actor__profile",
        )
        .order_by("-created_at")
    )


def visible_requests(user) -> QuerySet[CommissionRequest]:
    role = getattr(getattr(user, "profile", None), "role", None)
    qs = request_queryset()
    if role == Role.FAB_USER:
        return qs.filter(requester=user)
    return qs


def sample_queryset() -> QuerySet[Sample]:
    return Sample.objects.select_related(
        "request__requester__profile",
        "request__experiment_type",
        "received_by__profile",
        "current_wip",
    ).order_by("-created_at")


def visible_samples(user) -> QuerySet[Sample]:
    role = getattr(getattr(user, "profile", None), "role", None)
    qs = sample_queryset()
    if role == Role.FAB_USER:
        return qs.filter(request__requester=user)
    return qs
