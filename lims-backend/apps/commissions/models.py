from __future__ import annotations

from django.db import models

from apps.common.models import UUIDTimeStampedModel


class Priority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class RequestStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    SAMPLE_RECEIVED = "sample_received", "Sample Received"
    WIP_CREATED = "wip_created", "WIP Created"
    DISPATCHED = "dispatched", "Dispatched"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"


class SampleStatus(models.TextChoices):
    PENDING_RECEIVE = "pending_receive", "Pending Receive"
    RECEIVED = "received", "Received"
    WAITING_WIP = "waiting_wip", "Waiting WIP"
    IN_WIP = "in_wip", "In WIP"
    DISPATCHED = "dispatched", "Dispatched"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    RETURNED = "returned", "Returned"
    SCRAPPED = "scrapped", "Scrapped"


class CommissionRequest(UUIDTimeStampedModel):
    request_no = models.CharField(max_length=32, unique=True)
    requester = models.ForeignKey(
        "auth.User", on_delete=models.PROTECT, related_name="commission_requests"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    department = models.CharField(max_length=100)
    project_code = models.CharField(max_length=100, blank=True)
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    status = models.CharField(
        max_length=40, choices=RequestStatus.choices, default=RequestStatus.DRAFT
    )
    experiment_type = models.ForeignKey(
        "experiments.ExperimentType", on_delete=models.PROTECT, related_name="requests"
    )
    preferred_recipe = models.ForeignKey(
        "equipment.Recipe",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="preferred_by_requests",
    )
    material_type = models.CharField(max_length=100, default="Silicon")
    target_measurement = models.CharField(max_length=255, blank=True)
    expected_output_format = models.CharField(max_length=120, blank=True)
    special_instruction = models.TextField(blank=True)
    safety_rules_confirmed = models.BooleanField(default=False)
    required_completion_date = models.DateField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_commission_requests",
    )
    manager_comment = models.TextField(blank=True)

    class Meta:
        db_table = "commission_request"
        indexes = [
            models.Index(fields=["requester", "status"]),
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["required_completion_date"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.request_no


class Sample(UUIDTimeStampedModel):
    sample_no = models.CharField(max_length=32, unique=True)
    request = models.ForeignKey(
        CommissionRequest, related_name="samples", on_delete=models.CASCADE
    )
    sample_name = models.CharField(max_length=255)
    lot_id = models.CharField(max_length=100)
    wafer_id = models.CharField(max_length=100, blank=True)
    material_type = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    description = models.TextField(blank=True)
    handling_notes = models.TextField(blank=True)
    holding_area = models.CharField(max_length=120, blank=True)
    condition = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=40,
        choices=SampleStatus.choices,
        default=SampleStatus.PENDING_RECEIVE,
    )
    received_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="received_samples",
    )
    received_at = models.DateTimeField(null=True, blank=True)
    current_wip = models.ForeignKey(
        "wip.WipBatch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_samples",
    )

    class Meta:
        db_table = "sample"
        indexes = [
            models.Index(fields=["request", "status"]),
            models.Index(fields=["status", "material_type"]),
            models.Index(fields=["sample_no"]),
        ]

    def __str__(self) -> str:
        return self.sample_no


class RequestAttachment(UUIDTimeStampedModel):
    request = models.ForeignKey(
        CommissionRequest, related_name="attachments", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="request-attachments/")
    label = models.CharField(max_length=120, blank=True)
    uploaded_by = models.ForeignKey("auth.User", on_delete=models.PROTECT)

    class Meta:
        db_table = "request_attachment"


class ApprovalRecord(UUIDTimeStampedModel):
    class Decision(models.TextChoices):
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        MORE_INFO = "more_info", "More Information"

    request = models.ForeignKey(
        CommissionRequest, related_name="approval_records", on_delete=models.CASCADE
    )
    reviewer = models.ForeignKey("auth.User", on_delete=models.PROTECT)
    decision = models.CharField(max_length=20, choices=Decision.choices)
    comment = models.TextField(blank=True)
    priority_override = models.CharField(
        max_length=20, choices=Priority.choices, blank=True
    )
    suggested_recipe = models.ForeignKey(
        "equipment.Recipe", null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "approval_record"
        ordering = ["-created_at"]


class RequestStatusHistory(UUIDTimeStampedModel):
    request = models.ForeignKey(
        CommissionRequest, related_name="status_history", on_delete=models.CASCADE
    )
    previous_status = models.CharField(max_length=40, blank=True)
    new_status = models.CharField(max_length=40)
    actor = models.ForeignKey(
        "auth.User", null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "request_status_history"
        ordering = ["created_at"]


class SampleStatusHistory(UUIDTimeStampedModel):
    sample = models.ForeignKey(
        Sample, related_name="status_history", on_delete=models.CASCADE
    )
    previous_status = models.CharField(max_length=40, blank=True)
    new_status = models.CharField(max_length=40)
    actor = models.ForeignKey(
        "auth.User", null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "sample_status_history"
        ordering = ["created_at"]
