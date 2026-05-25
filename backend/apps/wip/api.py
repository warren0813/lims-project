from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role
from apps.common.exceptions import DomainError
from apps.wip import services
from apps.wip.models import (
    DispatchQueueProposal,
    DispatchQueueProposalBatch,
    DispatchQueueProposalItem,
    WipBatch,
    WipStatus,
)
from apps.wip.schemas import (
    AutoWipIn,
    ProposalBatchUpdateIn,
    ProposalOut,
    WipCreateIn,
    WipOut,
)
from apps.wip.serializers import proposal_out, wip_out

router = Router(tags=["WIP"], auth=JWTAuth())


def _qs():
    return (
        WipBatch.objects.select_related("experiment_type", "recipe", "equipment_type")
        .prefetch_related(
            "items__sample__request",
            "items__sample__experiments__experiment_type",
            "items__sample__experiments__recipe",
            "dispatches",
        )
        .order_by("-created_at")
    )


def _proposal_qs():
    return (
        DispatchQueueProposal.objects.select_related(
            "created_by__profile",
            "confirmed_by__profile",
        )
        .prefetch_related(
            "batches__experiment_type",
            "batches__recipe",
            "batches__equipment_type",
            "batches__equipment",
            "batches__items__sample",
            "batches__items__request__requester",
        )
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


@router.post("/auto-propose", response={201: ProposalOut, 400: ErrorOut, 403: ErrorOut})
def auto_propose_wip(request: HttpRequest, payload: AutoWipIn | None = None):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    payload = payload or AutoWipIn()
    try:
        proposal = services.auto_propose_dispatch_queue(request.auth, payload.max_batches)
    except DomainError as error:
        return _err(error)
    return 201, proposal_out(_proposal_qs().get(pk=proposal.pk))


@router.get("/proposals", response={200: list[ProposalOut], 403: ErrorOut})
def list_proposals(request: HttpRequest):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    for proposal in list(_proposal_qs().filter(status="draft")[:50]):
        services.prune_proposal(request.auth, proposal)
    return 200, [proposal_out(item) for item in _proposal_qs()[:50]]


@router.get("/proposals/{proposal_id}", response={200: ProposalOut, 403: ErrorOut, 404: ErrorOut})
def get_proposal(request: HttpRequest, proposal_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        proposal = _proposal_qs().get(pk=proposal_id)
    except DispatchQueueProposal.DoesNotExist:
        return 404, {"detail": "Proposal not found"}
    proposal = services.prune_proposal(request.auth, proposal)
    return 200, proposal_out(_proposal_qs().get(pk=proposal.pk))


@router.post(
    "/proposals/{proposal_id}/cancel",
    response={200: ProposalOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def cancel_proposal(request: HttpRequest, proposal_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        proposal = DispatchQueueProposal.objects.get(pk=proposal_id)
    except DispatchQueueProposal.DoesNotExist:
        return 404, {"detail": "Proposal not found"}
    try:
        proposal = services.cancel_proposal(request.auth, proposal)
    except DomainError as error:
        return _err(error)
    return 200, proposal_out(_proposal_qs().get(pk=proposal.pk))


@router.patch(
    "/proposals/{proposal_id}/batches/{batch_id}",
    response={200: ProposalOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def update_proposal_batch(
    request: HttpRequest,
    proposal_id: str,
    batch_id: str,
    payload: ProposalBatchUpdateIn,
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        batch = DispatchQueueProposalBatch.objects.select_related("proposal").get(
            pk=batch_id, proposal_id=proposal_id
        )
    except DispatchQueueProposalBatch.DoesNotExist:
        return 404, {"detail": "Proposal batch not found"}
    try:
        services.update_proposal_batch(request.auth, batch, payload)
    except DomainError as error:
        return _err(error)
    return 200, proposal_out(_proposal_qs().get(pk=proposal_id))


@router.delete(
    "/proposals/{proposal_id}/items/{item_id}",
    response={200: ProposalOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def remove_proposal_item(request: HttpRequest, proposal_id: str, item_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        item = DispatchQueueProposalItem.objects.select_related("batch__proposal").get(
            pk=item_id, batch__proposal_id=proposal_id
        )
    except DispatchQueueProposalItem.DoesNotExist:
        return 404, {"detail": "Proposal item not found"}
    try:
        proposal = services.remove_proposal_item(request.auth, item)
    except DomainError as error:
        return _err(error)
    return 200, proposal_out(_proposal_qs().get(pk=proposal.pk))


@router.post(
    "/proposals/{proposal_id}/confirm",
    response={200: list[WipOut], 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def confirm_proposal(request: HttpRequest, proposal_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        proposal = DispatchQueueProposal.objects.get(pk=proposal_id)
    except DispatchQueueProposal.DoesNotExist:
        return 404, {"detail": "Proposal not found"}
    try:
        wips = services.confirm_proposal(request.auth, proposal)
    except DomainError as error:
        return _err(error)
    return 200, [wip_out(_qs().get(pk=wip.pk)) for wip in wips]


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
