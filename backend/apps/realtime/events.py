from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import redis
from django.conf import settings
from django.utils import timezone


def _client():
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def iso_now() -> str:
    return timezone.now().isoformat()


def publish_state(key: str, payload: dict[str, Any], *, ttl: int = 60 * 60 * 12) -> None:
    payload = {**payload, "updated_at": iso_now()}
    try:
        client = _client()
        client.set(key, json.dumps(payload), ex=ttl)
        channel = key.replace(":", ".")
        client.publish(channel, json.dumps(payload))
    except redis.RedisError:
        return


def append_log(key: str, payload: dict[str, Any], *, max_items: int = 250) -> None:
    payload = {**payload, "created_at": iso_now()}
    try:
        client = _client()
        client.rpush(key, json.dumps(payload))
        client.ltrim(key, -max_items, -1)
        client.expire(key, 60 * 60 * 12)
    except redis.RedisError:
        return


def read_json(key: str) -> dict[str, Any] | None:
    try:
        raw = _client().get(key)
    except redis.RedisError:
        return None
    if not raw:
        return None
    return json.loads(raw)


def read_logs(key: str) -> list[dict[str, Any]]:
    try:
        rows = _client().lrange(key, 0, -1)
    except redis.RedisError:
        return []
    return [json.loads(row) for row in rows]


def datetime_to_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
