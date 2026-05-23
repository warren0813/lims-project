from __future__ import annotations

from django.db import models

from apps.commissions.models import Priority
from apps.common.models import UUIDTimeStampedModel


class WipStatus(models.TextChoices):
    CREATED = "created", "Created"
    READY_FOR_DISPATCH = "ready_for_dispatch", "Ready for Dispatch"
    QUEUED = "queued", "Queued"
    DISPATCHED = "dispatched", "Dispatched"
    RUNNING = "running", "Running"
    PARTIALLY_COMPLETED = "partially_completed", "Partially Completed"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class WipItemStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class WipBatch(UUIDTimeStampedModel):
    wip_no = models.CharField(max_length=32, unique=True)
    experiment_type = models.ForeignKey(
        "experiments.ExperimentType", on_delete=models.PROTECT, related_name="wips"
    )
    recipe = models.ForeignKey(
        "equipment.Recipe", on_delete=models.PROTECT, related_name="wips"
    )
    equipment_type = models.ForeignKey(
        "equipment.EquipmentType", on_delete=models.PROTECT, related_name="wips"
    )
    status = models.CharField(
        max_length=40, choices=WipStatus.choices, default=WipStatus.CREATED
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    compatibility_key = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.PROTECT, related_name="created_wip_batches"
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        db_table = "wip_batch"
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["experiment_type", "recipe", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.wip_no


class WipItem(UUIDTimeStampedModel):
    wip = models.ForeignKey(
        WipBatch, related_name="items", on_delete=models.CASCADE
    )
    sample = models.ForeignKey(
        "commissions.Sample", related_name="wip_items", on_delete=models.PROTECT
    )
    request = models.ForeignKey(
        "commissions.CommissionRequest",
        related_name="wip_items",
        on_delete=models.PROTECT,
    )
    sequence = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=40, choices=WipItemStatus.choices, default=WipItemStatus.QUEUED
    )

    class Meta:
        db_table = "wip_item"
        unique_together = ("wip", "sample")
        ordering = ["sequence", "created_at"]


class WipStatusHistory(UUIDTimeStampedModel):
    wip = models.ForeignKey(
        WipBatch, related_name="status_history", on_delete=models.CASCADE
    )
    previous_status = models.CharField(max_length=40, blank=True)
    new_status = models.CharField(max_length=40)
    actor = models.ForeignKey(
        "auth.User", null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "wip_status_history"
        ordering = ["created_at"]
