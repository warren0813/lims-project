from __future__ import annotations

from django.db import models

from apps.commissions.models import Priority
from apps.common.models import UUIDTimeStampedModel


class WipStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    READY_FOR_DISPATCH = "ready_for_dispatch", "Ready for Dispatch"
    DISPATCHING = "dispatching", "Dispatching"
    RUNNING = "running", "Running"
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
        max_length=40, choices=WipStatus.choices, default=WipStatus.DRAFT
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


class DispatchQueueProposalStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"


class DispatchQueueProposal(UUIDTimeStampedModel):
    proposal_no = models.CharField(max_length=32, unique=True)
    status = models.CharField(
        max_length=40,
        choices=DispatchQueueProposalStatus.choices,
        default=DispatchQueueProposalStatus.DRAFT,
    )
    source = models.CharField(max_length=40, default="auto")
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.PROTECT, related_name="created_wip_proposals"
    )
    confirmed_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="confirmed_wip_proposals",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    note = models.TextField(blank=True)
    estimated_total_runtime_sec = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "dispatch_queue_proposal"
        indexes = [models.Index(fields=["status", "created_at"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.proposal_no


class DispatchQueueProposalBatch(UUIDTimeStampedModel):
    proposal = models.ForeignKey(
        DispatchQueueProposal, related_name="batches", on_delete=models.CASCADE
    )
    experiment_type = models.ForeignKey(
        "experiments.ExperimentType",
        on_delete=models.PROTECT,
        related_name="proposal_batches",
    )
    recipe = models.ForeignKey(
        "equipment.Recipe", on_delete=models.PROTECT, related_name="proposal_batches"
    )
    equipment_type = models.ForeignKey(
        "equipment.EquipmentType",
        on_delete=models.PROTECT,
        related_name="proposal_batches",
    )
    equipment = models.ForeignKey(
        "equipment.Equipment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="proposal_batches",
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    order = models.PositiveIntegerField(default=0)
    compatibility_key = models.CharField(max_length=255)
    estimated_runtime_sec = models.PositiveIntegerField(default=0)
    reason = models.TextField(blank=True)
    warnings = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "dispatch_queue_proposal_batch"
        ordering = ["order", "created_at"]


class DispatchQueueProposalItem(UUIDTimeStampedModel):
    batch = models.ForeignKey(
        DispatchQueueProposalBatch, related_name="items", on_delete=models.CASCADE
    )
    sample = models.ForeignKey(
        "commissions.Sample",
        related_name="proposal_items",
        on_delete=models.PROTECT,
    )
    request = models.ForeignKey(
        "commissions.CommissionRequest",
        related_name="proposal_items",
        on_delete=models.PROTECT,
    )
    order = models.PositiveIntegerField(default=0)
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "dispatch_queue_proposal_item"
        unique_together = ("batch", "sample")
        ordering = ["order", "created_at"]
