from __future__ import annotations

import pytest
from django.test import Client, override_settings


def _auth(token: str) -> dict[str, str]:
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def _post_json(client: Client, path: str, payload: dict | None = None, token: str | None = None):
    return client.post(
        path,
        data=payload or {},
        content_type="application/json",
        **(_auth(token) if token else {}),
    )


def _login(client: Client, username: str, password: str) -> str:
    response = _post_json(client, "/api/auth/login", {"username": username, "password": password})
    assert response.status_code == 200, response.content
    return response.json()["access_token"]


@pytest.mark.django_db
def test_clean_database_bootstraps_first_manager_only():
    client = Client()

    response = client.get("/api/auth/bootstrap-status")
    assert response.status_code == 200
    assert response.json() == {"needs_bootstrap": True, "user_count": 0}

    response = _post_json(
        client,
        "/api/auth/bootstrap-manager",
        {
            "username": "manager",
            "password": "ChangeMe123!",
            "email": "manager@example.test",
            "department": "Lab Management",
        },
    )
    assert response.status_code == 201, response.content
    assert response.json()["role"] == "lab_manager"

    response = client.get("/api/auth/bootstrap-status")
    assert response.status_code == 200
    assert response.json()["needs_bootstrap"] is False
    assert response.json()["user_count"] == 1

    response = _post_json(
        client,
        "/api/auth/bootstrap-manager",
        {"username": "second", "password": "ChangeMe123!"},
    )
    assert response.status_code == 409


@pytest.mark.django_db
@override_settings(CELERY_TASK_ALWAYS_EAGER=True, EQUIPMENT_SIMULATION_STEP_SECONDS=0)
def test_clean_database_full_api_workflow_without_seed_data():
    client = Client()
    manager = _post_json(
        client,
        "/api/auth/bootstrap-manager",
        {"username": "manager", "password": "ChangeMe123!", "department": "Lab Management"},
    ).json()
    manager_token = manager["access_token"]

    for payload in [
        {"username": "fab", "password": "ChangeMe123!", "role": "fab_user", "department": "Fab"},
        {"username": "lab", "password": "ChangeMe123!", "role": "lab_user", "department": "Lab"},
    ]:
        response = _post_json(client, "/api/users/", payload, manager_token)
        assert response.status_code == 201, response.content

    exp = _post_json(
        client,
        "/api/experiment-types/",
        {"code": "SEM", "name": "SEM Defect Inspection", "lab_category": "FA"},
        manager_token,
    )
    assert exp.status_code == 201, exp.content
    exp_id = exp.json()["id"]

    eq_type = _post_json(
        client,
        "/api/equipment/types",
        {"code": "SEM_TOOL", "name": "Scanning Electron Microscope", "queue_name": "queue.sem"},
        manager_token,
    )
    assert eq_type.status_code == 201, eq_type.content
    eq_type_id = eq_type.json()["id"]

    recipe = _post_json(
        client,
        "/api/recipes/",
        {
            "recipe_code": "SEM_SCAN",
            "name": "SEM scan",
            "experiment_type_id": exp_id,
            "equipment_type_id": eq_type_id,
            "parameters": {"voltage_kv": 5},
            "estimated_runtime_sec": 1,
            "max_batch_size": 4,
        },
        manager_token,
    )
    assert recipe.status_code == 201, recipe.content
    recipe_id = recipe.json()["id"]

    equipment = _post_json(
        client,
        "/api/equipment/",
        {
            "equipment_code": "SEM-01",
            "name": "SEM-01",
            "model_name": "Regulus",
            "equipment_type_id": eq_type_id,
            "capacity": 4,
            "recipe_ids": [recipe_id],
        },
        manager_token,
    )
    assert equipment.status_code == 201, equipment.content

    fab_token = _login(client, "fab", "ChangeMe123!")
    request = _post_json(
        client,
        "/api/requests/",
        {
            "title": "Clean workflow SEM request",
            "description": "Created from a clean database",
            "experiment_type_id": exp_id,
            "preferred_recipe_id": recipe_id,
            "samples": [{"sample_name": "Wafer A", "lot_id": "LOT-A", "wafer_id": "W01"}],
        },
        fab_token,
    )
    assert request.status_code == 201, request.content
    request_id = request.json()["id"]

    approved = _post_json(client, f"/api/requests/{request_id}/approve", {"comment": "Approved"}, manager_token)
    assert approved.status_code == 200, approved.content
    assert approved.json()["status"] == "waiting_sample_receive"

    lab_token = _login(client, "lab", "ChangeMe123!")
    samples = client.get("/api/samples/", **_auth(lab_token)).json()
    assert len(samples) == 1
    received = _post_json(client, f"/api/samples/{samples[0]['id']}/receive", {}, lab_token)
    assert received.status_code == 200, received.content

    wips = _post_json(client, "/api/wip/auto-create", {}, lab_token)
    assert wips.status_code == 201, wips.content
    wip = wips.json()[0]

    locked = _post_json(client, f"/api/wip/{wip['id']}/lock", {}, lab_token)
    assert locked.status_code == 200, locked.content

    dispatch = _post_json(client, "/api/dispatches/", {"wip_id": wip["id"]}, lab_token)
    assert dispatch.status_code == 201, dispatch.content
    assert dispatch.json()["status"] == "completed"
    assert dispatch.json()["result"]["verdict"] in {"pass", "fail"}
