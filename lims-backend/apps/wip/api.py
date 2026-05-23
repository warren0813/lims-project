from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role
from apps.common.exceptions import DomainError
from apps.wip import services
from apps.wip.models import WipBatch, WipStatus
from apps.wip.schemas import AutoWipIn, WipCreateIn, WipOut
from apps.wip.serializers import wip_out

router = Router(tags=["WIP"], auth=JWTAuth())


def _qs():
    return (
        WipBatch.objects.select_related("experiment_type", "recipe", "equipment_type")
        .prefetch_related("items__sample__request", "dispatches")
        .order_by("-created_at")
    )


def _err(error: DomainError):
    return 400, {"detail": error.message}


@router.get("/", response={200: list[WipOut], 403: ErrorOut})
def list_wip(
    request: HttpRequest,
    status: WipStatus | None = Query(None),  # noqa: B008
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    qs = _qs()
    if status:
        qs = qs.filter(status=status)
    return 200, [wip_out(wip) for wip in qs]


@router.post("/", response={201: WipOut, 400: ErrorOut, 403: ErrorOut})
def create_wip(request: HttpRequest, payload: WipCreateIn):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        wip = services.create_wip(
            request.auth,
            payload.sample_ids,
            payload.recipe_id,
            payload.priority,
            payload.note,
        )
    except DomainError as error:
        return _err(error)
    return 201, wip_out(_qs().get(pk=wip.pk))


@router.post("/auto-create", response={201: list[WipOut], 400: ErrorOut, 403: ErrorOut})
def auto_create_wip(request: HttpRequest, payload: AutoWipIn | None = None):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    payload = payload or AutoWipIn()
    try:
        wips = services.auto_create_wip_batches(request.auth, payload.max_batches)
    except DomainError as error:
        return _err(error)
    return 201, [wip_out(_qs().get(pk=wip.pk)) for wip in wips]


@router.get("/{wip_id}", response={200: WipOut, 403: ErrorOut, 404: ErrorOut})
def get_wip(request: HttpRequest, wip_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        wip = _qs().get(pk=wip_id)
    except WipBatch.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, wip_out(wip)


@router.post("/{wip_id}/lock", response={200: WipOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def lock_wip(request: HttpRequest, wip_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        wip = WipBatch.objects.get(pk=wip_id)
    except WipBatch.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        wip = services.lock_wip(request.auth, wip)
    except DomainError as error:
        return _err(error)
    return 200, wip_out(_qs().get(pk=wip.pk))


@router.post("/{wip_id}/cancel", response={200: WipOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def cancel_wip(request: HttpRequest, wip_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        wip = WipBatch.objects.get(pk=wip_id)
    except WipBatch.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        wip = services.cancel_wip(request.auth, wip)
    except DomainError as error:
        return _err(error)
    return 200, wip_out(_qs().get(pk=wip.pk))
