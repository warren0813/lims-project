from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import Client, override_settings


@pytest.fixture
def client():
    return Client()


@pytest.fixture
def seeded(db):
    call_command("seed_demo")


def _login(client: Client, username: str, password: str) -> str:
    response = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
        content_type="application/json",
    )
    assert response.status_code == 200, response.content
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
@override_settings(CELERY_TASK_ALWAYS_EAGER=True, EQUIPMENT_SIMULATION_STEP_SECONDS=0)
def test_full_demo_workflow_reaches_result(client, seeded):
    lab_token = _login(client, "lab_member", "t26fnPyedon6aFz")

    samples = client.get("/api/samples/", **_auth(lab_token)).json()
    assert len(samples) >= 2

    for sample in samples:
        response = client.post(
            f"/api/samples/{sample['id']}/receive",
            data={},
            content_type="application/json",
            **_auth(lab_token),
        )
        assert response.status_code == 200, response.content
        assert response.json()["status"] == "waiting_wip"

    response = client.post(
        "/api/wip/auto-create",
        data={},
        content_type="application/json",
        **_auth(lab_token),
    )
    assert response.status_code == 201, response.content
    wip = response.json()[0]
    assert wip["sample_count"] == 2

    response = client.post(f"/api/wip/{wip['id']}/lock", **_auth(lab_token))
    assert response.status_code == 200, response.content
    assert response.json()["status"] == "ready_for_dispatch"

    response = client.post(
        "/api/dispatches/",
        data={"wip_id": wip["id"]},
        content_type="application/json",
        **_auth(lab_token),
    )
    assert response.status_code == 201, response.content
    dispatch = response.json()
    assert dispatch["status"] == "completed"
    assert dispatch["progress"] == 100
    assert dispatch["result"]["verdict"] in {"pass", "fail"}


@pytest.mark.django_db
@override_settings(CELERY_TASK_ALWAYS_EAGER=True, EQUIPMENT_SIMULATION_STEP_SECONDS=0)
def test_failed_dispatch_can_retry(client, seeded):
    lab_token = _login(client, "lab_member", "t26fnPyedon6aFz")
    for sample in client.get("/api/samples/", **_auth(lab_token)).json():
        client.post(
            f"/api/samples/{sample['id']}/receive",
            data={},
            content_type="application/json",
            **_auth(lab_token),
        )
    wip = client.post(
        "/api/wip/auto-create",
        data={},
        content_type="application/json",
        **_auth(lab_token),
    ).json()[0]
    client.post(f"/api/wip/{wip['id']}/lock", **_auth(lab_token))

    failed = client.post(
        "/api/dispatches/",
        data={"wip_id": wip["id"], "simulate_failure": True},
        content_type="application/json",
        **_auth(lab_token),
    ).json()
    assert failed["status"] == "failed"

    retry = client.post(
        f"/api/dispatches/{failed['id']}/retry",
        data={"simulate_failure": False},
        content_type="application/json",
        **_auth(lab_token),
    )
    assert retry.status_code == 201, retry.content
    assert retry.json()["status"] == "completed"


@pytest.mark.django_db
def test_fab_user_cannot_see_other_users_requests(client, seeded):
    other = User.objects.create_user(username="other_fab", password="pass12345")
    other.profile.role = "fab_user"
    other.profile.department = "Other Fab"
    other.profile.save()

    token = _login(client, "other_fab", "pass12345")
    response = client.get("/api/requests/", **_auth(token))
    assert response.status_code == 200
    assert response.json() == []
