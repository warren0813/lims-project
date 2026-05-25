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


class ProposalBatchUpdateIn(Schema):
    order: int | None = Field(None, ge=1)
    equipment_id: str | None = None
    priority: str | None = None
    reason: str | None = None


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
    experiments: list[dict] = []
    experiment_progress: dict | None = None
    safe_to_close: bool = False


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
    experiment_progress: dict | None = None
    safe_to_close: bool = False
    dispatch_count: int
    created_at: datetime
    updated_at: datetime


class ProposalItemOut(Schema):
    id: str
    sample_id: str
    sample_no: str
    sample_status: str
    request_id: str
    request_no: str
    fab_user: str
    priority: str
    order: int
    reason: str


class ProposalBatchOut(Schema):
    id: str
    experiment_type_id: str
    experiment_type_name: str
    recipe_id: str
    recipe_name: str
    equipment_type_id: str
    equipment_type_name: str
    equipment_id: str | None
    equipment_name: str | None
    equipment_capacity: int | None
    equipment_status: str | None
    equipment_queue_name: str | None
    recipe_max_batch_size: int
    priority: str
    order: int
    estimated_runtime_sec: int
    reason: str
    warnings: list[str]
    items: list[ProposalItemOut]


class ProposalOut(Schema):
    id: str
    proposal_no: str
    status: str
    source: str
    warnings: list[str]
    note: str
    estimated_total_runtime_sec: int
    batches: list[ProposalBatchOut]
    created_at: datetime
    updated_at: datetime
