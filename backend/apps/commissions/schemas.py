from __future__ import annotations

from datetime import date, datetime
from typing import Any

from ninja import Field, Schema


class SampleIn(Schema):
    sample_name: str = Field(..., min_length=1, max_length=255)
    lot_id: str = Field(..., min_length=1, max_length=100)
    wafer_id: str = ""
    material_type: str = "Silicon"
    quantity: int = Field(1, ge=1)
    description: str = ""
    handling_notes: str = ""
    experiment_type_ids: list[str] = []


class RequestIn(Schema):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    department: str = "Fab Operations"
    project_code: str = ""
    priority: str = "normal"
    experiment_type_id: str
    preferred_recipe_id: str | None = None
    material_type: str = "Silicon"
    target_measurement: str = ""
    expected_output_format: str = "json"
    special_instruction: str = ""
    safety_rules_confirmed: bool = True
    required_completion_date: date | None = None
    samples: list[SampleIn] = Field(..., min_length=1)


class RequestUpdateIn(Schema):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    department: str | None = None
    project_code: str | None = None
    priority: str | None = None
    preferred_recipe_id: str | None = None
    required_completion_date: date | None = None
    target_measurement: str | None = None
    expected_output_format: str | None = None
    special_instruction: str | None = None
    safety_rules_confirmed: bool | None = None


class ApprovalIn(Schema):
    comment: str = ""
    priority_override: str | None = None
    suggested_recipe_id: str | None = None
    expected_completion_date: date | None = None
    assigned_lab_user_id: int | None = None


class RejectIn(Schema):
    comment: str = Field(..., min_length=1)


class AssignRequestIn(Schema):
    lab_user_id: int | None = None


class CancelIn(Schema):
    reason: str = Field("Cancelled by user", min_length=1)


class ReceiveSampleIn(Schema):
    condition: str = "Good"
    holding_area: str = ""
    note: str = ""


class BulkReceiveIn(Schema):
    sample_ids: list[str] = Field(..., min_length=1)
    condition: str = "Good"
    holding_area: str = ""


class SampleStatusIn(Schema):
    status: str
    reason: str = ""


class UserBriefOut(Schema):
    id: int
    username: str
    department: str


class ExperimentBriefOut(Schema):
    id: str
    code: str
    name: str


class RecipeBriefOut(Schema):
    id: str
    recipe_code: str
    name: str


class SampleExperimentOut(Schema):
    id: str
    experiment_type: ExperimentBriefOut
    recipe: RecipeBriefOut | None
    sequence: int
    status: str
    current_wip_id: str | None
    started_at: datetime | None
    completed_at: datetime | None


class ExperimentProgressOut(Schema):
    total: int
    completed: int
    failed: int | None = 0
    active: int | None = 0
    pending: int
    percent: int
    all_done: bool | None = False
    has_failed: bool | None = False


class WaferProgressOut(Schema):
    total: int
    completed: int
    pending: int
    percent: int


class SampleOut(Schema):
    id: str
    sample_no: str
    sample_name: str
    lot_id: str
    wafer_id: str
    material_type: str
    quantity: int
    status: str
    request_id: str
    request_no: str
    requester: UserBriefOut
    experiment_type: ExperimentBriefOut
    received_at: datetime | None
    received_by: UserBriefOut | None
    current_wip_id: str | None
    holding_area: str
    condition: str
    experiments: list[SampleExperimentOut] = []
    experiment_progress: ExperimentProgressOut | None = None
    safe_to_close: bool = False
    latest_dispatch_id: str | None = None
    final_review_dispatch_id: str | None = None
    created_at: datetime
    updated_at: datetime


class StatusHistoryOut(Schema):
    previous_status: str
    new_status: str
    actor: UserBriefOut | None
    reason: str
    created_at: datetime


class ApprovalRecordOut(Schema):
    reviewer: UserBriefOut
    decision: str
    comment: str
    created_at: datetime


class RequestOut(Schema):
    id: str
    request_no: str
    title: str
    description: str
    requester: UserBriefOut
    department: str
    project_code: str
    priority: str
    status: str
    experiment_type: ExperimentBriefOut
    experiment_types: list[ExperimentBriefOut] = []
    preferred_recipe: RecipeBriefOut | None
    material_type: str
    required_completion_date: date | None
    submitted_at: datetime | None
    approved_at: datetime | None
    approved_by: UserBriefOut | None
    assigned_lab_user: UserBriefOut | None
    manager_comment: str
    sample_count: int
    wafer_progress: WaferProgressOut | None = None
    experiment_progress: ExperimentProgressOut | None = None
    safe_to_close: bool = False
    samples: list[SampleOut] = []
    approval_records: list[ApprovalRecordOut] = []
    status_history: list[StatusHistoryOut] = []
    result: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
