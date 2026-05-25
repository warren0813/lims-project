"""Django Ninja router for authentication endpoints."""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpRequest
from django.utils import timezone
from ninja import Query, Router

from apps.accounts.auth import JWTAuth, create_access_token, create_refresh_token
from apps.accounts.models import (
    Notification,
    RefreshToken,
    Role,
    UserProfile,
    normalize_role,
)
from apps.accounts.permissions import has_manager_role
from apps.accounts.schemas import (
    BootstrapManagerIn,
    BootstrapStatusOut,
    ErrorOut,
    LoginIn,
    NotificationOut,
    RefreshIn,
    RefreshOut,
    TokenOut,
    UserAdminOut,
    UserCreateIn,
    UserOut,
    UserUpdateIn,
)

router = Router(tags=["Auth"])
user_router = Router(tags=["Users"], auth=JWTAuth())
notification_router = Router(tags=["Notifications"], auth=JWTAuth())

# Single constant prevents info leakage by returning the same message
# for both wrong credentials and valid credentials without a profile.
_INVALID_CREDENTIALS = "Invalid credentials"


@router.post("/login", response={200: TokenOut, 401: ErrorOut}, auth=None)
def login_view(request: HttpRequest, payload: LoginIn):
    """Authenticate a user and return JWT tokens.

    Returns access token, refresh token, and user information on success,
    or 401 on invalid credentials.
    """
    user = authenticate(request, username=payload.username, password=payload.password)
    if user is None:
        return 401, {"detail": _INVALID_CREDENTIALS}
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return 401, {"detail": _INVALID_CREDENTIALS}

    access_token = create_access_token(user.pk)
    refresh_token = create_refresh_token(user)
    return 200, TokenOut.to_dict(user, profile, access_token, refresh_token)


@router.get("/bootstrap-status", response={200: BootstrapStatusOut}, auth=None)
def bootstrap_status(request: HttpRequest):
    """Return whether the deployment has no users yet.

    This enables a clean first-run database without shipping predefined demo
    accounts. The paired bootstrap endpoint only works while the user table is
    empty, so it cannot be used after normal account management begins.
    """
    user_count = User.objects.count()
    return 200, {"needs_bootstrap": user_count == 0, "user_count": user_count}


@router.post(
    "/bootstrap-manager",
    response={201: TokenOut, 409: ErrorOut},
    auth=None,
)
def bootstrap_manager(request: HttpRequest, payload: BootstrapManagerIn):
    """Create the first lab manager in a completely clean database."""
    with transaction.atomic():
        if User.objects.select_for_update().exists():
            return 409, {"detail": "Bootstrap is disabled after the first user exists"}
        user = User.objects.create_user(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            is_staff=True,
            is_active=True,
        )
        profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": Role.LAB_MANAGER, "department": payload.department},
        )
        access_token = create_access_token(user.pk)
        refresh_token = create_refresh_token(user)
    return 201, TokenOut.to_dict(user, profile, access_token, refresh_token)


@router.post("/logout", response={200: ErrorOut, 401: ErrorOut}, auth=JWTAuth())
def logout_view(request: HttpRequest, payload: RefreshIn):
    """Revoke a refresh token. Requires authentication."""
    RefreshToken.objects.filter(user=request.auth, token=payload.refresh_token).delete()
    return 200, {"detail": "Logged out"}


@router.get("/me", response={200: UserOut, 401: ErrorOut}, auth=JWTAuth())
def me_view(request: HttpRequest):
    """Return the currently authenticated user's information."""
    user = request.auth
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return 401, {"detail": _INVALID_CREDENTIALS}
    return 200, UserOut.to_dict(user, profile)


@router.post(
    "/refresh",
    response={200: RefreshOut, 401: ErrorOut},
    auth=None,
)
def refresh_view(request: HttpRequest, payload: RefreshIn):
    """Exchange a valid refresh token for a new access + refresh token pair.

    Implements refresh token rotation: the old token is deleted and a new
    one is created. This limits the window of abuse if a token is leaked.
    """
    try:
        token_obj = RefreshToken.objects.select_related("user").get(
            token=payload.refresh_token
        )
    except RefreshToken.DoesNotExist:
        return 401, {"detail": "Invalid refresh token"}

    if token_obj.is_expired:
        token_obj.delete()
        return 401, {"detail": "Refresh token expired"}

    if not token_obj.user.is_active:
        token_obj.delete()
        return 401, {"detail": "Invalid refresh token"}

    user = token_obj.user

    # Rotate atomically: if create fails, the old token is preserved.
    with transaction.atomic():
        token_obj.delete()
        new_access = create_access_token(user.pk)
        new_refresh = create_refresh_token(user)

    return 200, {"access_token": new_access, "refresh_token": new_refresh}


def _user_admin_out(user: User) -> dict:
    profile = user.profile
    return {
        "id": user.pk,
        "username": user.username,
        "email": user.email,
        "role": normalize_role(profile.role),
        "department": profile.department,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "date_joined": user.date_joined.isoformat(),
    }


def _normalize_role_input(role: str) -> str:
    if role == "lab_member":
        return Role.LAB_USER
    if role not in Role.values:
        raise ValueError("Invalid role")
    return role


@user_router.get("/", response={200: list[UserAdminOut], 403: ErrorOut})
def list_users(
    request: HttpRequest,
    role: str | None = Query(None),  # noqa: B008
    search: str | None = Query(None),  # noqa: B008
):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can manage accounts"}
    qs = User.objects.select_related("profile").order_by("username")
    if role:
        canonical = _normalize_role_input(role)
        legacy_roles = [canonical]
        if canonical == Role.LAB_USER:
            legacy_roles.append(Role.LAB_MEMBER)
        qs = qs.filter(profile__role__in=legacy_roles)
    if search:
        qs = qs.filter(username__icontains=search)
    return 200, [_user_admin_out(user) for user in qs]


@user_router.post("/", response={201: UserAdminOut, 400: ErrorOut, 403: ErrorOut})
def create_user(request: HttpRequest, payload: UserCreateIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can manage accounts"}
    if User.objects.filter(username=payload.username).exists():
        return 400, {"detail": "Username already exists"}
    try:
        role = _normalize_role_input(payload.role)
    except ValueError:
        return 400, {"detail": "Invalid role"}
    with transaction.atomic():
        user = User.objects.create_user(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            is_active=payload.is_active,
            is_staff=role in {Role.LAB_MANAGER, Role.ADMIN},
        )
        UserProfile.objects.update_or_create(
            user=user, defaults={"role": role, "department": payload.department}
        )
    return 201, _user_admin_out(User.objects.select_related("profile").get(pk=user.pk))


@user_router.patch("/{user_id}", response={200: UserAdminOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def update_user(request: HttpRequest, user_id: int, payload: UserUpdateIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can manage accounts"}
    try:
        user = User.objects.select_related("profile").get(pk=user_id)
    except User.DoesNotExist:
        return 404, {"detail": "User not found"}
    updates = payload.model_dump(exclude_unset=True)
    role = updates.pop("role", None)
    department = updates.pop("department", None)
    if role is not None:
        try:
            user.profile.role = _normalize_role_input(role)
        except ValueError:
            return 400, {"detail": "Invalid role"}
    if department is not None:
        user.profile.department = department
    for field, value in updates.items():
        setattr(user, field, value)
    if role is not None:
        user.is_staff = user.profile.role in {Role.LAB_MANAGER, Role.ADMIN}
    user.save()
    user.profile.save()
    return 200, _user_admin_out(user)


@user_router.post("/{user_id}/reset-password", response={200: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def reset_password_placeholder(request: HttpRequest, user_id: int):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can manage accounts"}
    if not User.objects.filter(pk=user_id).exists():
        return 404, {"detail": "User not found"}
    return 200, {"detail": "Password reset workflow is not configured yet"}


def _notification_out(item: Notification) -> dict:
    related_request_id = None
    related_request_no = None
    related_sample_id = None
    related_sample_no = None
    if item.related_entity_type == "CommissionRequest" and item.related_entity_id:
        from apps.commissions.models import CommissionRequest

        request_obj = (
            CommissionRequest.objects.filter(pk=item.related_entity_id)
            .only("id", "request_no")
            .first()
        )
        if request_obj:
            related_request_id = str(request_obj.id)
            related_request_no = request_obj.request_no
    elif item.related_entity_type == "Sample" and item.related_entity_id:
        from apps.commissions.models import Sample

        sample = (
            Sample.objects.select_related("request")
            .filter(pk=item.related_entity_id)
            .only("id", "sample_no", "request__id", "request__request_no")
            .first()
        )
        if sample:
            related_sample_id = str(sample.id)
            related_sample_no = sample.sample_no
            related_request_id = str(sample.request_id)
            related_request_no = sample.request.request_no
    return {
        "id": item.pk,
        "notification_type": item.notification_type,
        "title": item.title,
        "body": item.body,
        "related_entity_type": item.related_entity_type,
        "related_entity_id": item.related_entity_id,
        "related_request_id": related_request_id,
        "related_request_no": related_request_no,
        "related_sample_id": related_sample_id,
        "related_sample_no": related_sample_no,
        "is_read": item.is_read,
        "created_at": item.created_at.isoformat(),
        "read_at": item.read_at.isoformat() if item.read_at else None,
    }


@notification_router.get("/", response={200: list[NotificationOut]})
def list_notifications(request: HttpRequest, unread: bool | None = Query(None)):  # noqa: B008
    qs = Notification.objects.filter(recipient=request.auth)
    if unread is True:
        qs = qs.filter(is_read=False)
    elif unread is False:
        qs = qs.filter(is_read=True)
    return 200, [_notification_out(item) for item in qs[:100]]


@notification_router.get("/unread-count", response={200: dict})
def unread_count(request: HttpRequest):
    return 200, {"count": Notification.objects.filter(recipient=request.auth, is_read=False).count()}


@notification_router.post("/{notification_id}/read", response={200: NotificationOut, 404: ErrorOut})
def mark_notification_read(request: HttpRequest, notification_id: int):
    try:
        item = Notification.objects.get(pk=notification_id, recipient=request.auth)
    except Notification.DoesNotExist:
        return 404, {"detail": "Notification not found"}
    if not item.is_read:
        item.is_read = True
        item.read_at = timezone.now()
        item.save(update_fields=["is_read", "read_at"])
    return 200, _notification_out(item)


@notification_router.post("/mark-all-read", response={200: dict})
def mark_all_notifications_read(request: HttpRequest):
    updated = Notification.objects.filter(recipient=request.auth, is_read=False).update(
        is_read=True,
        read_at=timezone.now(),
    )
    return 200, {"updated": updated}
