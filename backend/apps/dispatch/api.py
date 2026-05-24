from __future__ import annotations

from django.http import HttpRequest
from ninja import Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role
from apps.common.exceptions import DomainError
from apps.dispatch import services
from apps.dispatch.models import DispatchJob
from apps.dispatch.schemas import (
    DispatchCreateIn,
    DispatchLogOut,
    DispatchOut,
    DispatchRetryIn,
    FinalConfirmIn,
)
from apps.dispatch.serializers import dispatch_out
from apps.realtime.events import read_json, read_logs
from apps.wip.models import WipBatch

router = Router(tags=["Dispatches"], auth=JWTAuth())


def _err(error: DomainError):
    return 400, {"detail": error.message}


@router.get("/", response={200: list[DispatchOut], 403: ErrorOut})
def list_dispatches(request: HttpRequest):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    return 200, [dispatch_out(item) for item in services.dispatch_qs()]


@router.post("/", response={201: DispatchOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def create_dispatch(request: HttpRequest, payload: DispatchCreateIn):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        wip = WipBatch.objects.get(pk=payload.wip_id)
    except WipBatch.DoesNotExist:
        return 404, {"detail": "WIP not found"}
    try:
        dispatch = services.create_dispatch(
            request.auth,
            wip,
            payload.equipment_id,
            simulate_failure=payload.simulate_failure,
        )
    except DomainError as error:
        return _err(error)
    return 201, dispatch_out(services.dispatch_qs().get(pk=dispatch.pk))


@router.get("/{dispatch_id}", response={200: DispatchOut, 403: ErrorOut, 404: ErrorOut})
def get_dispatch(request: HttpRequest, dispatch_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, dispatch_out(dispatch)


@router.get("/{dispatch_id}/progress", response={200: dict, 403: ErrorOut, 404: ErrorOut})
def get_dispatch_progress(request: HttpRequest, dispatch_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, read_json(f"dispatch:{dispatch.id}:state") or dispatch_out(dispatch)


@router.get("/{dispatch_id}/logs", response={200: list[DispatchLogOut], 403: ErrorOut, 404: ErrorOut})
def get_dispatch_logs(request: HttpRequest, dispatch_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    redis_logs = read_logs(f"dispatch:{dispatch.id}:logs")
    if redis_logs:
        return 200, redis_logs
    return 200, [
        {
            "level": item.level,
            "message": item.message,
            "payload": item.payload,
            "created_at": item.created_at,
        }
        for item in dispatch.logs.all()
    ]


@router.post(
    "/{dispatch_id}/retry",
    response={201: DispatchOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def retry_dispatch(
    request: HttpRequest, dispatch_id: str, payload: DispatchRetryIn | None = None
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    payload = payload or DispatchRetryIn()
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        new_dispatch = services.retry_dispatch(
            request.auth, dispatch, simulate_failure=payload.simulate_failure
        )
    except DomainError as error:
        return _err(error)
    return 201, dispatch_out(services.dispatch_qs().get(pk=new_dispatch.pk))


@router.post("/{dispatch_id}/cancel", response={200: DispatchOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def cancel_dispatch(request: HttpRequest, dispatch_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        dispatch = services.cancel_dispatch(request.auth, dispatch)
    except DomainError as error:
        return _err(error)
    return 200, dispatch_out(services.dispatch_qs().get(pk=dispatch.pk))


@router.post(
    "/{dispatch_id}/final-confirm",
    response={200: DispatchOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def final_confirm_dispatch(
    request: HttpRequest, dispatch_id: str, payload: FinalConfirmIn | None = None
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    payload = payload or FinalConfirmIn()
    try:
        dispatch = services.dispatch_qs().get(pk=dispatch_id)
    except DispatchJob.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        dispatch = services.final_confirm_dispatch(request.auth, dispatch, payload.notes)
    except DomainError as error:
        return _err(error)
    return 200, dispatch_out(services.dispatch_qs().get(pk=dispatch.pk))
