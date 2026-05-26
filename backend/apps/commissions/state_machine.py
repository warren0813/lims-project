"""State machine validation for Request and Sample status transitions."""

from apps.commissions.models import RequestStatus, SampleStatus


class InvalidTransitionError(Exception):
    """Raised when a state transition is not allowed."""

    def __init__(self, model_name: str, current: str, action: str) -> None:
        self.model_name = model_name
        self.current = current
        self.action = action
        super().__init__(
            f"{model_name} cannot perform '{action}' from status '{current}'"
        )


# Mapping: action -> set of allowed source statuses
REQUEST_TRANSITIONS: dict[str, set[str]] = {
    "submit": {RequestStatus.DRAFT},
    "approve": {RequestStatus.WAITING_APPROVAL},
    "return": {RequestStatus.WAITING_APPROVAL},
    "reject": {RequestStatus.WAITING_APPROVAL},
    "ship": {RequestStatus.APPROVED, RequestStatus.WAITING_SAMPLE_RECEIVE},
    "cancel": {
        RequestStatus.DRAFT,
        RequestStatus.WAITING_APPROVAL,
        RequestStatus.APPROVED,
        RequestStatus.WAITING_SAMPLE_RECEIVE,
        RequestStatus.RECEIVED,
        RequestStatus.IN_WIP,
        RequestStatus.QUEUED,
        RequestStatus.RUNNING,
    },
    "close": {RequestStatus.FINAL_CHECK, RequestStatus.COMPLETED},
}

# Mapping: action -> target status
REQUEST_TARGET: dict[str, str] = {
    "submit": RequestStatus.WAITING_APPROVAL,
    "approve": RequestStatus.WAITING_SAMPLE_RECEIVE,
    "return": RequestStatus.SUBMITTED,
    "reject": RequestStatus.REJECTED,
    "ship": RequestStatus.WAITING_SAMPLE_RECEIVE,
    "cancel": RequestStatus.CANCELLED,
    "close": RequestStatus.CLOSED,
}

SAMPLE_TRANSITIONS: dict[str, set[str]] = {
    "receive": {SampleStatus.PENDING_RECEIVE},
    "reject_receiving": {SampleStatus.PENDING_RECEIVE, SampleStatus.RECEIVED},
    "start_processing": {SampleStatus.RECEIVED},
    "queue": {SampleStatus.IN_WIP},
    "run": {SampleStatus.QUEUED},
    "complete": {SampleStatus.RUNNING},
    "processing_exception": {SampleStatus.RUNNING},
}

SAMPLE_TARGET: dict[str, str] = {
    "receive": SampleStatus.RECEIVED,
    "reject_receiving": SampleStatus.REJECTED,
    "start_processing": SampleStatus.IN_WIP,
    "queue": SampleStatus.QUEUED,
    "run": SampleStatus.RUNNING,
    "complete": SampleStatus.COMPLETED,
    "processing_exception": SampleStatus.FAILED,
}


def validate_request_transition(current_status: str, action: str) -> str:
    """Validate and return the target status for a request action.

    Raises InvalidTransitionError if the transition is not allowed.
    """
    allowed = REQUEST_TRANSITIONS.get(action)
    if allowed is None:
        raise InvalidTransitionError("Request", current_status, action)
    if current_status not in allowed:
        raise InvalidTransitionError("Request", current_status, action)
    return REQUEST_TARGET[action]


def validate_sample_transition(current_status: str, action: str) -> str:
    """Validate and return the target status for a sample action.

    Raises InvalidTransitionError if the transition is not allowed.
    """
    allowed = SAMPLE_TRANSITIONS.get(action)
    if allowed is None:
        raise InvalidTransitionError("Sample", current_status, action)
    if current_status not in allowed:
        raise InvalidTransitionError("Sample", current_status, action)
    return SAMPLE_TARGET[action]
