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
    WAITING_APPROVAL = "waiting_approval", "Waiting Approval"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    WAITING_SAMPLE_RECEIVE = "waiting_sample_receive", "Waiting for Sample Receive"
    RECEIVED = "received", "Received"
    IN_WIP = "in_wip", "In WIP"
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    FINAL_CHECK = "final_check", "Final Check"
    COMPLETED = "completed", "Completed"
    CLOSED = "closed", "Closed"
    CANCELLED = "cancelled", "Cancelled"


class SampleStatus(models.TextChoices):
    PENDING_RECEIVE = "pending_receive", "Pending Receive"
    RECEIVED = "received", "Received"
    REJECTED = "rejected", "Rejected"
    IN_WIP = "in_wip", "In WIP"
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class SampleExperimentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    READY = "ready", "Ready"
    IN_WIP = "in_wip", "In WIP"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


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
    assigned_lab_user = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_commission_requests",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
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


class SampleExperiment(UUIDTimeStampedModel):
    """One required experiment for one physical wafer/sample."""

    sample = models.ForeignKey(
        Sample, related_name="experiments", on_delete=models.CASCADE
    )
    experiment_type = models.ForeignKey(
        "experiments.ExperimentType",
        on_delete=models.PROTECT,
        related_name="sample_experiments",
    )
    recipe = models.ForeignKey(
        "equipment.Recipe",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sample_experiments",
    )
    current_wip = models.ForeignKey(
        "wip.WipBatch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sample_experiments",
    )
    sequence = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=40,
        choices=SampleExperimentStatus.choices,
        default=SampleExperimentStatus.PENDING,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sample_experiment"
        unique_together = ("sample", "experiment_type")
        indexes = [
            models.Index(fields=["sample", "sequence"], name="sample_expe_sample__eb79d2_idx"),
            models.Index(fields=["experiment_type", "status"], name="sample_expe_experim_97e9bc_idx"),
            models.Index(fields=["status", "created_at"], name="sample_expe_status_5a5a1b_idx"),
        ]
        ordering = ["sequence", "created_at"]

    def __str__(self) -> str:
        return f"{self.sample.sample_no} · {self.experiment_type.name}"


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
