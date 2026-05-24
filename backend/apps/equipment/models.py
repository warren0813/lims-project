from __future__ import annotations

from django.db import models

from apps.common.models import UUIDTimeStampedModel


class EquipmentStatus(models.TextChoices):
    IDLE = "idle", "Idle"
    WORKING = "working", "Working"
    FAULTY = "faulty", "Faulty"
    MAINTENANCE = "maintenance", "Maintenance"
    OFFLINE = "offline", "Offline"


class EquipmentType(UUIDTimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=160)
    queue_name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "equipment_type"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Equipment(UUIDTimeStampedModel):
    equipment_code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=200)
    model_name = models.CharField(max_length=200)
    equipment_type = models.ForeignKey(
        EquipmentType, on_delete=models.PROTECT, related_name="equipment"
    )
    worker_queue_name = models.CharField(max_length=120)
    worker_node_name = models.CharField(max_length=120, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=30, choices=EquipmentStatus.choices, default=EquipmentStatus.IDLE
    )
    current_dispatch = models.ForeignKey(
        "dispatch.DispatchJob",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_on_equipment",
    )
    current_step = models.CharField(max_length=255, blank=True)
    progress = models.FloatField(default=0)
    location = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    last_heartbeat_at = models.DateTimeField(null=True, blank=True)
    completed_count_today = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "equipment"
        indexes = [
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["equipment_type", "status"]),
        ]
        ordering = ["equipment_code"]

    def __str__(self) -> str:
        return f"{self.equipment_code} {self.name}"


class Recipe(UUIDTimeStampedModel):
    recipe_code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    experiment_type = models.ForeignKey(
        "experiments.ExperimentType", on_delete=models.PROTECT, related_name="recipes"
    )
    equipment_type = models.ForeignKey(
        EquipmentType, on_delete=models.PROTECT, related_name="recipes"
    )
    parameters = models.JSONField(default=dict, blank=True)
    estimated_runtime_sec = models.PositiveIntegerField(default=60)
    max_batch_size = models.PositiveIntegerField(default=10)
    material_constraints = models.JSONField(default=dict, blank=True)
    safety_constraints = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="created_recipes",
    )

    class Meta:
        db_table = "recipe"
        indexes = [
            models.Index(fields=["experiment_type", "equipment_type", "is_active"]),
            models.Index(fields=["recipe_code"]),
        ]
        ordering = ["recipe_code"]

    def __str__(self) -> str:
        return self.recipe_code


class EquipmentCapability(UUIDTimeStampedModel):
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name="capability_links"
    )
    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name="equipment_capabilities"
    )

    class Meta:
        db_table = "equipment_capability"
        unique_together = ("equipment", "recipe")


class EquipmentEventLog(UUIDTimeStampedModel):
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name="event_logs"
    )
    dispatch = models.ForeignKey(
        "dispatch.DispatchJob",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="equipment_events",
    )
    event_type = models.CharField(max_length=80)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "equipment_event_log"
        indexes = [models.Index(fields=["equipment", "created_at"])]
