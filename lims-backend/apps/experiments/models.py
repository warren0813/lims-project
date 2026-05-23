from django.db import models

from apps.common.models import UUIDTimeStampedModel


class LabCategory(models.TextChoices):
    RA = "RA", "可靠度分析 (Reliability Analysis)"
    MA = "MA", "材料分析 (Material Analysis)"
    FA = "FA", "失效分析 (Failure Analysis)"
    TM = "TM", "電性測試 (Test & Measurement)"


class ExperimentType(UUIDTimeStampedModel):
    """Experiment type maintained by lab staff and selected by fab users."""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    lab_category = models.CharField(max_length=10, choices=LabCategory.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "experiment_type"

    def __str__(self) -> str:
        return self.name


class ExperimentResult(UUIDTimeStampedModel):
    """Final persisted result generated manually or by equipment simulation."""

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        AUTOMATED = "automated", "Automated"

    class Verdict(models.TextChoices):
        PASS = "pass", "Pass"
        FAIL = "fail", "Fail"

    dispatch = models.OneToOneField(
        "dispatch.DispatchJob",
        on_delete=models.CASCADE,
        related_name="result",
    )
    summary = models.TextField()
    verdict = models.CharField(max_length=10, choices=Verdict.choices)
    data = models.JSONField(default=dict, blank=True)
    data_source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.AUTOMATED
    )
    recorded_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="experiment_results",
    )

    class Meta:
        db_table = "experiment_result"
        indexes = [models.Index(fields=["verdict", "created_at"])]

    def __str__(self) -> str:
        return f"Result {self.dispatch_id} ({self.verdict})"
