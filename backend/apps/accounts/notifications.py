from __future__ import annotations

from collections.abc import Iterable

from django.contrib.auth.models import User

from apps.accounts.models import Notification, Role, normalize_role


def notify(
    recipients: User | Iterable[User],
    notification_type: str,
    title: str,
    body: str = "",
    related_entity: object | None = None,
) -> None:
    if isinstance(recipients, User):
        users = [recipients]
    else:
        users = list(recipients)

    entity_type = related_entity.__class__.__name__ if related_entity is not None else ""
    entity_id = str(getattr(related_entity, "pk", "")) if related_entity is not None else ""
    rows = []
    for user in users:
        if user is None or not user.is_active:
            continue
        role = ""
        if hasattr(user, "profile"):
            role = normalize_role(user.profile.role)
        rows.append(
            Notification(
                recipient=user,
                role_context=role,
                notification_type=notification_type,
                title=title,
                body=body,
                related_entity_type=entity_type,
                related_entity_id=entity_id,
            )
        )
    if rows:
        Notification.objects.bulk_create(rows)


def notify_role(
    role: str,
    notification_type: str,
    title: str,
    body: str = "",
    related_entity: object | None = None,
) -> None:
    roles = [role]
    if role == Role.LAB_USER:
        roles.append(Role.LAB_MEMBER)
    users = User.objects.filter(is_active=True, profile__role__in=roles)
    notify(
        users,
        notification_type=notification_type,
        title=title,
        body=body,
        related_entity=related_entity,
    )
