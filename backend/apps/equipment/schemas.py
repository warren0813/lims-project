from __future__ import annotations

from datetime import datetime
from typing import Any

from ninja import Field, Schema


class EquipmentTypeIn(Schema):
    code: str = Field(..., min_length=1, max_length=40)
    name: str = Field(..., min_length=1, max_length=160)
    queue_name: str = Field(..., min_length=1, max_length=120)
    description: str = ""


class EquipmentTypeOut(Schema):
    id: str
    code: str
    name: str
    queue_name: str
    description: str


class EquipmentIn(Schema):
    equipment_code: str | None = None
    name: str = Field(..., min_length=1, max_length=200)
    model_name: str = Field(..., min_length=1, max_length=200)
    equipment_type_id: str
    capacity: int = Field(1, ge=1)
    location: str = ""
    recipe_ids: list[str] = []


class EquipmentUpdate(Schema):
    name: str | None = None
    model_name: str | None = None
    capacity: int | None = Field(None, ge=1)
    status: str | None = None
    is_active: bool | None = None
    location: str | None = None
    recipe_ids: list[str] | None = None


class RecipeIn(Schema):
    recipe_code: str | None = None
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    experiment_type_id: str
    equipment_type_id: str
    parameters: dict[str, Any] = {}
    estimated_runtime_sec: int = Field(60, ge=1)
    max_batch_size: int = Field(10, ge=1)
    material_constraints: dict[str, Any] = {}
    safety_constraints: dict[str, Any] = {}
    version: int = Field(1, ge=1)


class RecipeUpdate(Schema):
    name: str | None = None
    description: str | None = None
    parameters: dict[str, Any] | None = None
    estimated_runtime_sec: int | None = Field(None, ge=1)
    max_batch_size: int | None = Field(None, ge=1)
    material_constraints: dict[str, Any] | None = None
    safety_constraints: dict[str, Any] | None = None
    is_active: bool | None = None


class ExperimentTypeBriefOut(Schema):
    id: str
    code: str
    name: str


class RecipeOut(Schema):
    id: str
    recipe_code: str
    name: str
    description: str
    experiment_type: ExperimentTypeBriefOut
    equipment_type: EquipmentTypeOut
    parameters: dict[str, Any]
    estimated_runtime_sec: int
    max_batch_size: int
    material_constraints: dict[str, Any]
    safety_constraints: dict[str, Any]
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CapabilityOut(Schema):
    id: str
    recipe: RecipeOut


class EquipmentOut(Schema):
    id: str
    equipment_code: str
    name: str
    model_name: str
    equipment_type: EquipmentTypeOut
    worker_queue_name: str
    worker_node_name: str
    capacity: int
    status: str
    current_dispatch_id: str | None
    current_step: str
    progress: float
    metrics: dict[str, Any]
    wafer_count: int
    location: str
    is_active: bool
    last_heartbeat_at: datetime | None
    completed_count_today: int
    error_message: str
    capabilities: list[dict[str, str]]
    created_at: datetime
    updated_at: datetime
