from __future__ import annotations

import socket
import time

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.dispatch.models import DispatchJob, DispatchLog, DispatchStatus
from apps.dispatch.services import (
    dispatch_qs,
    publish_dispatch,
    sync_request_completion,
)
from apps.dispatch.simulator import build_steps, generate_result
from apps.equipment.models import EquipmentEventLog, EquipmentStatus
from apps.experiments.models import ExperimentResult
from apps.realtime.events import append_log
from apps.wip.models import WipStatus


def _log(dispatch: DispatchJob, message: str, level: str = "info", payload: dict | None = None) -> None:
    DispatchLog.objects.create(
        dispatch=dispatch, level=level, message=message, payload=payload or {}
    )
    append_log(
        f"dispatch:{dispatch.id}:logs",
        {"level": level, "message": message, "payload": payload or {}},
    )


@shared_task(bind=True, autoretry_for=(), max_retries=0)
def run_dispatch_job(self, dispatch_id: str) -> dict:
    worker_name = f"{socket.gethostname()}:{self.request.hostname or 'worker'}"
    dispatch = dispatch_qs().get(pk=dispatch_id)
    recipe = dispatch.wip.recipe
    equipment = dispatch.equipment
    if equipment is None:
        raise RuntimeError("Dispatch has no assigned equipment")

    try:
        with transaction.atomic():
            dispatch.status = DispatchStatus.RUNNING
            dispatch.started_at = timezone.now()
            dispatch.assigned_at = dispatch.assigned_at or timezone.now()
            dispatch.worker_node = worker_name
            dispatch.current_step = "Starting"
            dispatch.progress = 0
            dispatch.save()
            dispatch.wip.status = WipStatus.RUNNING
            dispatch.wip.save(update_fields=["status", "updated_at"])
            equipment.status = EquipmentStatus.RUNNING
            equipment.current_dispatch = dispatch
            equipment.current_step = "Starting"
            equipment.progress = 0
            equipment.worker_node_name = worker_name
            equipment.last_heartbeat_at = timezone.now()
            equipment.save()
        _log(dispatch, "Equipment simulation started", payload={"worker": worker_name})
        publish_dispatch(dispatch)

        steps = build_steps(recipe.recipe_code, dispatch.wip.experiment_type.name)
        failure_index = max(1, len(steps) // 2)
        for index, step in enumerate(steps, start=1):
            if dispatch.simulate_failure and dispatch.attempt == 1 and index == failure_index:
                raise RuntimeError(f"Simulated equipment fault during {step}")
            progress = round(index / len(steps) * 100, 2)
            time.sleep(settings.EQUIPMENT_SIMULATION_STEP_SECONDS)
            dispatch = dispatch_qs().get(pk=dispatch_id)
            dispatch.current_step = step
            dispatch.progress = progress
            dispatch.save(update_fields=["current_step", "progress", "updated_at"])
            equipment.current_step = step
            equipment.progress = progress
            equipment.last_heartbeat_at = timezone.now()
            equipment.save(
                update_fields=[
                    "current_step",
                    "progress",
                    "last_heartbeat_at",
                    "updated_at",
                ]
            )
            EquipmentEventLog.objects.create(
                equipment=equipment,
                dispatch=dispatch,
                event_type="step",
                message=step,
                payload={"progress": progress},
            )
            _log(dispatch, step, payload={"progress": progress})
            publish_dispatch(dispatch)

        summary, result_data, verdict = generate_result(
            recipe.recipe_code, dispatch.wip.experiment_type.name
        )
        with transaction.atomic():
            dispatch = dispatch_qs().select_for_update(of=("self",)).get(pk=dispatch_id)
            ExperimentResult.objects.update_or_create(
                dispatch=dispatch,
                defaults={
                    "summary": summary,
                    "verdict": verdict,
                    "data": result_data,
                    "data_source": ExperimentResult.Source.AUTOMATED,
                },
            )
            dispatch.status = DispatchStatus.COMPLETED
            dispatch.progress = 100
            dispatch.current_step = "Completed"
            dispatch.finished_at = timezone.now()
            dispatch.save()
            equipment = dispatch.equipment
            equipment.status = EquipmentStatus.IDLE
            equipment.current_dispatch = None
            equipment.current_step = ""
            equipment.progress = 0
            equipment.error_message = ""
            equipment.completed_count_today += 1
            equipment.last_heartbeat_at = timezone.now()
            equipment.save()
            sync_request_completion(dispatch.wip, verdict)
        _log(dispatch, "Simulation completed", payload={"verdict": verdict, "result": result_data})
        publish_dispatch(dispatch)
        return {"dispatch_id": dispatch_id, "status": "completed", "verdict": verdict}
    except Exception as exc:
        with transaction.atomic():
            dispatch = dispatch_qs().select_for_update(of=("self",)).get(pk=dispatch_id)
            dispatch.status = DispatchStatus.FAILED
            dispatch.error_message = str(exc)
            dispatch.finished_at = timezone.now()
            dispatch.save()
            equipment = dispatch.equipment
            if equipment:
                equipment.status = EquipmentStatus.ERROR
                equipment.current_dispatch = None
                equipment.current_step = ""
                equipment.progress = 0
                equipment.error_message = str(exc)
                equipment.last_heartbeat_at = timezone.now()
                equipment.save()
            dispatch.wip.status = WipStatus.FAILED
            dispatch.wip.save(update_fields=["status", "updated_at"])
        _log(dispatch, str(exc), level="error")
        publish_dispatch(dispatch)
        return {"dispatch_id": dispatch_id, "status": "failed", "error": str(exc)}
