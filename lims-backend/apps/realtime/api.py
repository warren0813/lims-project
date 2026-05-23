from __future__ import annotations

import json
import time

from django.contrib.auth.models import User
from django.http import HttpRequest, StreamingHttpResponse
from ninja import Query, Router

from apps.accounts.auth import decode_access_token
from apps.accounts.permissions import has_lab_role
from apps.dispatch.models import DispatchJob
from apps.dispatch.serializers import dispatch_out
from apps.dispatch.services import dispatch_qs
from apps.equipment.api import _equipment_qs
from apps.equipment.serializers import equipment_out
from apps.realtime.events import read_json

router = Router(tags=["Realtime"], auth=None)


def _user_from_token(token: str | None):
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    try:
        return User.objects.get(pk=int(payload["sub"]), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError):
        return None


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


@router.get("/equipment/events")
def equipment_events(request: HttpRequest, token: str | None = Query(None)):  # noqa: B008
    user = _user_from_token(token)
    request.auth = user
    if user is None or not has_lab_role(request):
        return StreamingHttpResponse(
            iter([_sse({"error": "unauthorized"})]),
            content_type="text/event-stream",
            status=401,
        )

    def stream():
        for _ in range(120):
            rows = []
            for equipment in _equipment_qs():
                cached = read_json(f"equipment:{equipment.id}:status")
                rows.append(cached or equipment_out(equipment))
            yield _sse({"type": "equipment.snapshot", "items": rows})
            time.sleep(1)

    return StreamingHttpResponse(stream(), content_type="text/event-stream")


@router.get("/dispatches/{dispatch_id}/events")
def dispatch_events(
    request: HttpRequest,
    dispatch_id: str,
    token: str | None = Query(None),  # noqa: B008
):
    user = _user_from_token(token)
    request.auth = user
    if user is None or not has_lab_role(request):
        return StreamingHttpResponse(
            iter([_sse({"error": "unauthorized"})]),
            content_type="text/event-stream",
            status=401,
        )
    try:
        dispatch = dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return StreamingHttpResponse(
            iter([_sse({"error": "not_found"})]),
            content_type="text/event-stream",
            status=404,
        )

    def stream():
        for _ in range(120):
            cached = read_json(f"dispatch:{dispatch.id}:state")
            latest = dispatch_qs().get(pk=dispatch.id)
            yield _sse({"type": "dispatch.progress", "item": cached or dispatch_out(latest)})
            if latest.status in {"completed", "failed", "cancelled"}:
                break
            time.sleep(1)

    return StreamingHttpResponse(stream(), content_type="text/event-stream")
