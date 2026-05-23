"""Shared permission helpers for Django Ninja endpoints."""

from django.http import HttpRequest

from apps.accounts.models import Role, UserProfile


def has_lab_role(request: HttpRequest) -> bool:
    """Return True if the user is lab_member, lab_manager, or admin."""
    try:
        role = request.auth.profile.role
    except (UserProfile.DoesNotExist, AttributeError):
        return False
    return role in (Role.LAB_MEMBER, Role.LAB_MANAGER, Role.ADMIN)


def has_manager_role(request: HttpRequest) -> bool:
    try:
        role = request.auth.profile.role
    except (UserProfile.DoesNotExist, AttributeError):
        return False
    return role in (Role.LAB_MANAGER, Role.ADMIN)


def is_fab_user(request: HttpRequest) -> bool:
    try:
        return request.auth.profile.role == Role.FAB_USER
    except (UserProfile.DoesNotExist, AttributeError):
        return False
