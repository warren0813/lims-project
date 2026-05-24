from __future__ import annotations

from django.db import models

from apps.common.models import UUIDTimeStampedModel


class DispatchStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    QUEUED = "queued", "Queued"
    ASSIGNED = "assigned", "Assigned"
    RUNNING = "running", "Running"
    PAUSED = "paused", "Paused"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    RETRYING = "retrying", "Retrying"
    CANCELLED = "cancelled", "Cancelled"


class DispatchJob(UUIDTimeStampedModel):
    dispatch_no = models.CharField(max_length=32, unique=True)
    wip = models.ForeignKey(
        "wip.WipBatch", on_delete=models.PROTECT, related_name="dispatches"
    )
    equipment = models.ForeignKey(
        "equipment.Equipment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dispatch_jobs",
    )
    celery_task_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=40, choices=DispatchStatus.choices, default=DispatchStatus.PENDING
    )
    progress = models.FloatField(default=0)
    current_step = models.CharField(max_length=255, blank=True)
    worker_node = models.CharField(max_length=120, blank=True)
    queue_name = models.CharField(max_length=120, blank=True)
    queue_position = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    attempt = models.PositiveIntegerField(default=1)
    simulate_failure = models.BooleanField(default=False)
    queued_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    final_confirmed_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="final_confirmed_dispatch_jobs",
    )
    final_confirmed_at = models.DateTimeField(null=True, blank=True)
    final_confirmation_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.PROTECT, related_name="created_dispatch_jobs"
    )

    class Meta:
        db_table = "dispatch_job"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["wip", "status"]),
            models.Index(fields=["equipment", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.dispatch_no


class DispatchStep(UUIDTimeStampedModel):
    dispatch = models.ForeignKey(
        DispatchJob, related_name="steps", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255)
    sequence = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=40, default="pending")
    progress = models.FloatField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "dispatch_step"
        ordering = ["sequence", "created_at"]


class DispatchLog(UUIDTimeStampedModel):
    dispatch = models.ForeignKey(
        DispatchJob, related_name="logs", on_delete=models.CASCADE
    )
    level = models.CharField(max_length=20, default="info")
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "dispatch_log"
        indexes = [models.Index(fields=["dispatch", "created_at"])]
        ordering = ["created_at"]
