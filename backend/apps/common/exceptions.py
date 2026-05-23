from __future__ import annotations


class DomainError(Exception):
    """Expected workflow or validation failure that can be shown to API clients."""

    def __init__(self, message: str, *, code: str = "DOMAIN_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)
