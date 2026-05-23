"""Ninja schemas for the reports app."""

from __future__ import annotations

from ninja import Schema

# --- Equipment Utilization schemas ---


class EquipmentBriefOut(Schema):
    """Brief equipment info nested in utilization responses."""

    id: int
    name: str


class EquipmentUtilizationEntryOut(Schema):
    """Per-equipment utilization entry."""

    equipment: EquipmentBriefOut
    wip_count: int
    sample_count: int


class EquipmentUtilizationOut(Schema):
    """Output schema for the equipment-utilization endpoint."""

    period: str
    start_date: str
    end_date: str
    data: list[EquipmentUtilizationEntryOut]


# --- Request Statistics schemas ---


class DateRangeOut(Schema):
    """Date range nested in request statistics responses."""

    start_date: str
    end_date: str


class RequestStatisticsOut(Schema):
    """Output schema for the request-statistics endpoint."""

    period: DateRangeOut
    status_distribution: dict[str, int]
    average_tat_hours: float | None
    total_requests: int
