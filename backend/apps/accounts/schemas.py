"""Ninja schemas for the accounts app."""

from typing import Any

from django.contrib.auth.models import User
from ninja import Field, Schema

from apps.accounts.models import UserProfile, normalize_role


class LoginIn(Schema):
    """Input schema for the login endpoint."""

    username: str
    password: str


class UserOut(Schema):
    """Output schema representing an authenticated user with role information."""

    id: int
    username: str
    role: str
    department: str

    @staticmethod
    def to_dict(user: User, profile: UserProfile) -> dict[str, Any]:
        """Build a dict matching UserOut fields from a User and its UserProfile.

        Returning a plain dict keeps the response on Ninja's normal
        schema-validation path (Pydantic). Validation is bypassed when
        returning `ninja.responses.Status`, so avoid that pattern here.
        """
        return {
            "id": user.pk,
            "username": user.username,
            "role": normalize_role(profile.role),
            "department": profile.department,
        }


class TokenOut(Schema):
    """Output schema for login response with JWT tokens and user data."""

    access_token: str
    refresh_token: str
    id: int
    username: str
    role: str
    department: str

    @staticmethod
    def to_dict(
        user: User,
        profile: UserProfile,
        access_token: str,
        refresh_token: str,
    ) -> dict[str, Any]:
        """Build a dict matching TokenOut fields."""
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "id": user.pk,
            "username": user.username,
            "role": normalize_role(profile.role),
            "department": profile.department,
        }


class RefreshIn(Schema):
    """Input schema for the token refresh endpoint."""

    refresh_token: str


class RefreshOut(Schema):
    """Output schema for the token refresh response."""

    access_token: str
    refresh_token: str


class BootstrapStatusOut(Schema):
    needs_bootstrap: bool
    user_count: int


class BootstrapManagerIn(Schema):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    email: str = ""
    department: str = "Lab Management"


class ErrorOut(Schema):
    """Output schema for generic detail messages (errors and confirmations)."""

    detail: str


class UserAdminOut(Schema):
    id: int
    username: str
    email: str
    role: str
    department: str
    is_active: bool
    is_staff: bool
    date_joined: str


class UserCreateIn(Schema):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    email: str = ""
    role: str = "fab_user"
    department: str = ""
    is_active: bool = True


class UserUpdateIn(Schema):
    email: str | None = None
    role: str | None = None
    department: str | None = None
    is_active: bool | None = None


class NotificationOut(Schema):
    id: int
    notification_type: str
    title: str
    body: str
    related_entity_type: str
    related_entity_id: str
    is_read: bool
    created_at: str
    read_at: str | None
