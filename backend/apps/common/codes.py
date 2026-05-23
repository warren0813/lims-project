from __future__ import annotations

from django.db import models
from django.utils import timezone


def next_business_code(
    model: type[models.Model],
    field_name: str,
    prefix: str,
    *,
    width: int = 5,
) -> str:
    """Return a human-readable yearly business code such as REQ-2026-00001."""

    year = timezone.now().year
    starts_with = f"{prefix}-{year}-"
    count = model.objects.filter(**{f"{field_name}__startswith": starts_with}).count()
    return f"{starts_with}{count + 1:0{width}d}"


PRIORITY_WEIGHTS = {
    "urgent": 100,
    "high": 70,
    "normal": 40,
    "low": 10,
}


def priority_score(priority: str) -> int:
    return PRIORITY_WEIGHTS.get(priority, 40)
