from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    FAB_USER = "fab_user", "Fab User"
    LAB_USER = "lab_user", "Lab User"
    LAB_MEMBER = "lab_member", "Lab Member (legacy)"
    LAB_MANAGER = "lab_manager", "Lab Manager"
    ADMIN = "admin", "Admin"


LAB_ROLE_VALUES = {Role.LAB_USER, Role.LAB_MEMBER, Role.LAB_MANAGER, Role.ADMIN}


def normalize_role(role: str) -> str:
    """Return the canonical public role value."""
    if role == Role.LAB_MEMBER:
        return Role.LAB_USER
    return role


class UserProfile(models.Model):
    """Extends Django User with role and department fields."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FAB_USER)
    department = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profile"

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"


class RefreshToken(models.Model):
    """Stores refresh tokens for JWT authentication.

    Each row represents one active session. Deleting a row revokes that session.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="refresh_tokens"
    )
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refresh_token"
        indexes = [
            models.Index(
                fields=["user", "expires_at"], name="idx_refresh_user_expires"
            ),
        ]

    def __str__(self) -> str:
        return f"RefreshToken(user={self.user.username}, expires={self.expires_at})"

    @property
    def is_expired(self) -> bool:
        """Return True if this token has passed its expiry time."""
        return timezone.now() >= self.expires_at


class AuditLog(models.Model):
    """Append-only user operation log for important workflow actions."""

    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_log"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]


class Notification(models.Model):
    """Per-user workflow notification with optional entity link."""

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    role_context = models.CharField(max_length=40, blank=True)
    notification_type = models.CharField(max_length=80)
    title = models.CharField(max_length=180)
    body = models.TextField(blank=True)
    related_entity_type = models.CharField(max_length=80, blank=True)
    related_entity_id = models.CharField(max_length=80, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notification"
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
            models.Index(fields=["related_entity_type", "related_entity_id"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.recipient.username}: {self.title}"
