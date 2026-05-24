from __future__ import annotations

from datetime import datetime
from typing import Any

from ninja import Field, Schema


class DispatchCreateIn(Schema):
    wip_id: str
    equipment_id: str | None = None
    simulate_failure: bool = False


class DispatchRetryIn(Schema):
    simulate_failure: bool = False


class FinalConfirmIn(Schema):
    notes: str = ""


class ResultOut(Schema):
    id: str
    summary: str
    verdict: str
    data: dict[str, Any]
    data_source: str
    created_at: datetime


class DispatchLogOut(Schema):
    level: str
    message: str
    payload: dict[str, Any]
    created_at: datetime


class DispatchOut(Schema):
    id: str
    dispatch_no: str
    wip_id: str
    wip_no: str
    equipment_id: str | None
    equipment_name: str | None
    equipment_code: str | None
    recipe_id: str
    recipe_name: str
    experiment_type_id: str
    experiment_type_name: str
    status: str
    progress: float
    current_step: str
    worker_node: str
    queue_name: str
    queue_position: int
    error_message: str
    attempt: int
    celery_task_id: str
    queued_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    final_confirmed_at: datetime | None
    final_confirmation_notes: str
    result: ResultOut | None
    created_at: datetime
    updated_at: datetime


class ManualResultIn(Schema):
    summary: str = Field(..., min_length=1)
    verdict: str = Field("pass", pattern="^(pass|fail)$")
    data: dict[str, Any] = {}
