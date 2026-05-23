from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role, has_manager_role, is_fab_user
from apps.commissions import services
from apps.commissions.models import (
    CommissionRequest,
    RequestStatus,
    Sample,
    SampleStatus,
)
from apps.commissions.schemas import (
    ApprovalIn,
    BulkReceiveIn,
    CancelIn,
    ReceiveSampleIn,
    RejectIn,
    RequestIn,
    RequestOut,
    RequestUpdateIn,
    SampleOut,
    SampleStatusIn,
)
from apps.commissions.selectors import visible_requests, visible_samples
from apps.commissions.serializers import request_out, sample_out
from apps.common.exceptions import DomainError

router = Router(tags=["Requests"], auth=JWTAuth())
sample_router = Router(tags=["Samples"], auth=JWTAuth())


def _domain_error(error: DomainError):
    status = 403 if error.code == "FORBIDDEN" else 400
    return status, {"detail": error.message}


@router.get("/", response={200: list[RequestOut]})
def list_requests(
    request: HttpRequest,
    status: RequestStatus | None = Query(None),  # noqa: B008
):
    qs = visible_requests(request.auth)
    if status:
        qs = qs.filter(status=status)
    return 200, [request_out(req, include_detail=False) for req in qs]


@router.get("/my", response={200: list[RequestOut]})
def list_my_requests(request: HttpRequest):
    qs = visible_requests(request.auth).filter(requester=request.auth)
    return 200, [request_out(req, include_detail=False) for req in qs]


@router.post("/", response={201: RequestOut, 400: ErrorOut, 403: ErrorOut})
def create_and_submit_request(request: HttpRequest, payload: RequestIn):
    if not is_fab_user(request):
        return 403, {"detail": "Only fab users can create requests"}
    try:
        req = services.create_request(request.auth, payload, as_draft=False)
    except DomainError as error:
        return _domain_error(error)
    req = visible_requests(request.auth).get(pk=req.pk)
    return 201, request_out(req)


@router.post("/drafts", response={201: RequestOut, 400: ErrorOut, 403: ErrorOut})
def create_draft_request(request: HttpRequest, payload: RequestIn):
    if not is_fab_user(request):
        return 403, {"detail": "Only fab users can create drafts"}
    try:
        req = services.create_request(request.auth, payload, as_draft=True)
    except DomainError as error:
        return _domain_error(error)
    req = visible_requests(request.auth).get(pk=req.pk)
    return 201, request_out(req)


@router.get("/{request_id}", response={200: RequestOut, 404: ErrorOut})
def get_request(request: HttpRequest, request_id: str):
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, request_out(req)


@router.patch(
    "/{request_id}", response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut}
)
def update_request(request: HttpRequest, request_id: str, payload: RequestUpdateIn):
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        req = services.update_request(request.auth, req, payload)
    except DomainError as error:
        return _domain_error(error)
    return 200, request_out(visible_requests(request.auth).get(pk=req.pk))


@router.delete(
    "/{request_id}", response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut}
)
def delete_request(request: HttpRequest, request_id: str):
    return cancel_request(request, request_id, CancelIn(reason="Deleted draft"))


@router.post(
    "/{request_id}/submit",
    response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def submit_request(request: HttpRequest, request_id: str):
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        req = services.submit_request(request.auth, req)
    except DomainError as error:
        return _domain_error(error)
    return 200, request_out(visible_requests(request.auth).get(pk=req.pk))


@router.post(
    "/{request_id}/approve",
    response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def approve_request(
    request: HttpRequest, request_id: str, payload: ApprovalIn | None = None
):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can approve requests"}
    payload = payload or ApprovalIn()
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        req = services.approve_request(request.auth, req, payload)
    except DomainError as error:
        return _domain_error(error)
    return 200, request_out(visible_requests(request.auth).get(pk=req.pk))


@router.post(
    "/{request_id}/reject",
    response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def reject_request(request: HttpRequest, request_id: str, payload: RejectIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only lab managers can reject requests"}
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        req = services.reject_request(request.auth, req, payload)
    except DomainError as error:
        return _domain_error(error)
    return 200, request_out(visible_requests(request.auth).get(pk=req.pk))


@router.post(
    "/{request_id}/cancel",
    response={200: RequestOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def cancel_request(request: HttpRequest, request_id: str, payload: CancelIn):
    try:
        req = visible_requests(request.auth).get(pk=request_id)
    except CommissionRequest.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        req = services.cancel_request(request.auth, req, payload.reason)
    except DomainError as error:
        return _domain_error(error)
    return 200, request_out(visible_requests(request.auth).get(pk=req.pk))


@sample_router.get("/", response={200: list[SampleOut]})
def list_samples(
    request: HttpRequest,
    status: SampleStatus | None = Query(None),  # noqa: B008
    request_id: str | None = Query(None),  # noqa: B008
):
    qs = visible_samples(request.auth)
    if status:
        qs = qs.filter(status=status)
    if request_id:
        qs = qs.filter(request_id=request_id)
    return 200, [sample_out(sample) for sample in qs]


@sample_router.get("/{sample_id}", response={200: SampleOut, 404: ErrorOut})
def get_sample(request: HttpRequest, sample_id: str):
    try:
        sample = visible_samples(request.auth).get(pk=sample_id)
    except Sample.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, sample_out(sample)


@sample_router.post(
    "/{sample_id}/receive",
    response={200: SampleOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def receive_sample(
    request: HttpRequest, sample_id: str, payload: ReceiveSampleIn | None = None
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    payload = payload or ReceiveSampleIn()
    try:
        sample = visible_samples(request.auth).get(pk=sample_id)
    except Sample.DoesNotExist:
        return 404, {"detail": "Not found"}
    try:
        sample = services.receive_sample(request.auth, sample, payload)
    except DomainError as error:
        return _domain_error(error)
    return 200, sample_out(visible_samples(request.auth).get(pk=sample.pk))


@sample_router.patch(
    "/{sample_id}/status",
    response={200: SampleOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def update_sample_status(request: HttpRequest, sample_id: str, payload: SampleStatusIn):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        sample = visible_samples(request.auth).get(pk=sample_id)
    except Sample.DoesNotExist:
        return 404, {"detail": "Not found"}
    if payload.status not in SampleStatus.values:
        return 400, {"detail": "Invalid sample status"}
    sample.status = payload.status
    if payload.reason:
        sample.handling_notes = f"{sample.handling_notes}\n{payload.reason}".strip()
    sample.save(update_fields=["status", "handling_notes", "updated_at"])
    return 200, sample_out(visible_samples(request.auth).get(pk=sample.pk))


@sample_router.post(
    "/bulk-receive", response={200: list[SampleOut], 400: ErrorOut, 403: ErrorOut}
)
def bulk_receive_samples(request: HttpRequest, payload: BulkReceiveIn):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    received = []
    for sample in visible_samples(request.auth).filter(pk__in=payload.sample_ids):
        try:
            received.append(
                services.receive_sample(
                    request.auth,
                    sample,
                    ReceiveSampleIn(
                        condition=payload.condition,
                        holding_area=payload.holding_area,
                    ),
                )
            )
        except DomainError as error:
            return _domain_error(error)
    return 200, [sample_out(sample) for sample in received]
