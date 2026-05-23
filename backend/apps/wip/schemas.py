from __future__ import annotations

from datetime import datetime

from ninja import Field, Schema


class WipCreateIn(Schema):
    sample_ids: list[str] = Field(..., min_length=1)
    recipe_id: str
    priority: str = "normal"
    note: str = ""


class AutoWipIn(Schema):
    max_batches: int | None = Field(None, ge=1)


class AddSampleIn(Schema):
    sample_id: str


class WipSampleOut(Schema):
    id: str
    sample_no: str
    sample_name: str
    request_id: str
    request_no: str
    material_type: str
    status: str


class WipOut(Schema):
    id: str
    wip_no: str
    experiment_type_id: str
    experiment_type_name: str
    recipe_id: str
    recipe_name: str
    equipment_type_id: str
    equipment_type_name: str
    sample_count: int
    priority: str
    status: str
    compatibility_key: str
    locked_at: datetime | None
    dispatched_at: datetime | None
    completed_at: datetime | None
    note: str
    samples: list[WipSampleOut]
    dispatch_count: int
    created_at: datetime
    updated_at: datetime
