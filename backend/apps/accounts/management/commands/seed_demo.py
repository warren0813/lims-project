"""Seed deterministic demo users and semiconductor lab master data."""

from __future__ import annotations

from typing import Any

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, UserProfile
from apps.commissions.models import (
    CommissionRequest,
    RequestStatus,
    RequestStatusHistory,
    Sample,
    SampleStatus,
    SampleStatusHistory,
)
from apps.equipment.models import Equipment, EquipmentCapability, EquipmentType, Recipe
from apps.experiments.models import ExperimentType, LabCategory

USERS = [
    ("fab_user", "mcv8uPKSvqz8Yru", Role.FAB_USER, "Fab Operations"),
    ("lab_member", "t26fnPyedon6aFz", Role.LAB_USER, "Metrology Lab"),
    ("lab_manager", "eWoN48kU0QrEV8B", Role.LAB_MANAGER, "Lab Management"),
]


class Command(BaseCommand):
    help = "Seed demo accounts and LIMS semiconductor workflow data."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        users = {}
        for username, password, role, department in USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"email": f"{username}@lims.local", "is_staff": role != Role.FAB_USER},
            )
            user.email = f"{username}@lims.local"
            user.is_staff = role != Role.FAB_USER
            user.is_active = True
            user.set_password(password)
            user.save(update_fields=["email", "is_staff", "is_active", "password"])
            UserProfile.objects.update_or_create(
                user=user, defaults={"role": role, "department": department}
            )
            users[username] = user

        experiments = {
            "SEM": ("SEM Defect Inspection", LabCategory.FA),
            "THIN_FILM": ("Thin Film Thickness Measurement", LabCategory.MA),
            "ETCH": ("Etch Rate Test", LabCategory.MA),
            "SHEET_RES": ("Sheet Resistance Measurement", LabCategory.TM),
        }
        exp_objs = {}
        for code, (name, category) in experiments.items():
            exp, _ = ExperimentType.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "lab_category": category,
                    "description": f"Demo recipe family for {name}.",
                    "is_active": True,
                },
            )
            exp_objs[code] = exp

        equipment_types = {
            "SEM_TOOL": ("Scanning Electron Microscope", "queue.sem"),
            "ELLIPSOMETER": ("Spectroscopic Ellipsometer", "queue.ellipsometer"),
            "ETCH_CHAMBER": ("Etch Chamber Simulator", "queue.etch"),
            "PROBE": ("Four-Point Probe", "queue.probe"),
        }
        type_objs = {}
        for code, (name, queue) in equipment_types.items():
            item, _ = EquipmentType.objects.update_or_create(
                code=code,
                defaults={"name": name, "queue_name": queue, "description": name},
            )
            type_objs[code] = item

        recipe_specs = [
            (
                "SEM_DEFECT_SCAN_V1",
                "SEM defect scan preset",
                "SEM",
                "SEM_TOOL",
                {
                    "voltage_kv": 5,
                    "scan_area_um": 100,
                    "magnification": "25k x",
                    "dwell_us": 8,
                },
                45,
                4,
            ),
            (
                "THIN_FILM_ELLIPSO_V1",
                "Thin film ellipsometry preset",
                "THIN_FILM",
                "ELLIPSOMETER",
                {
                    "wavelength_nm": 632,
                    "points": 49,
                    "angle_deg": 70,
                    "fit_model": "SiO2 baseline",
                },
                40,
                6,
            ),
            (
                "ETCH_RATE_V1",
                "Etch rate check preset",
                "ETCH",
                "ETCH_CHAMBER",
                {
                    "target_depth_nm": 120,
                    "gas": "CF4",
                    "rf_power_w": 250,
                    "duration_s": 90,
                },
                50,
                3,
            ),
            (
                "SHEET_RES_PROBE_V1",
                "Sheet resistance map preset",
                "SHEET_RES",
                "PROBE",
                {
                    "measurement_points": 49,
                    "current_ma": 10,
                    "edge_exclusion_mm": 3,
                    "map": "full wafer",
                },
                35,
                8,
            ),
        ]
        recipe_objs = {}
        for code, name, exp_code, type_code, params, runtime, batch_size in recipe_specs:
            recipe, _ = Recipe.objects.update_or_create(
                recipe_code=code,
                defaults={
                    "name": name,
                    "description": name,
                    "experiment_type": exp_objs[exp_code],
                    "equipment_type": type_objs[type_code],
                    "parameters": params,
                    "estimated_runtime_sec": runtime,
                    "max_batch_size": batch_size,
                    "created_by": users["lab_manager"],
                    "is_active": True,
                },
            )
            recipe_objs[code] = recipe

        equipment_specs = [
            ("SEM-01", "SEM-01", "Hitachi Regulus 8230", "SEM_TOOL", "SEM_DEFECT_SCAN_V1", 4, "Metrology Bay A"),
            ("ELLIP-01", "Ellipsometer-01", "J.A. Woollam M-2000", "ELLIPSOMETER", "THIN_FILM_ELLIPSO_V1", 6, "Metrology Bay B"),
            ("ETCH-01", "Etch-01", "PlasmaPro 100 Cobra", "ETCH_CHAMBER", "ETCH_RATE_V1", 3, "Reliability Bay C"),
            ("PROBE-01", "Probe-01", "CDE ResMap 178", "PROBE", "SHEET_RES_PROBE_V1", 8, "Test Bay D"),
        ]
        for code, name, model, type_code, recipe_code, capacity, location in equipment_specs:
            equipment, _ = Equipment.objects.update_or_create(
                equipment_code=code,
                defaults={
                    "name": name,
                    "model_name": model,
                    "equipment_type": type_objs[type_code],
                    "worker_queue_name": type_objs[type_code].queue_name,
                    "capacity": capacity,
                    "location": location,
                    "is_active": True,
                    "status": "idle",
                },
            )
            EquipmentCapability.objects.get_or_create(
                equipment=equipment, recipe=recipe_objs[recipe_code]
            )

        req, created = CommissionRequest.objects.get_or_create(
            request_no="REQ-DEMO-00001",
            defaults={
                "requester": users["fab_user"],
                "title": "Demo SEM defect inspection for lot CND-24A",
                "description": "Seeded request ready for sample receiving and WIP grouping.",
                "department": "Fab Operations",
                "project_code": "CND-24A",
                "priority": "high",
                "status": RequestStatus.APPROVED,
                "experiment_type": exp_objs["SEM"],
                "preferred_recipe": recipe_objs["SEM_DEFECT_SCAN_V1"],
                "material_type": "Silicon",
                "submitted_at": timezone.now(),
                "approved_at": timezone.now(),
                "approved_by": users["lab_manager"],
                "safety_rules_confirmed": True,
            },
        )
        if created:
            RequestStatusHistory.objects.create(
                request=req,
                previous_status="",
                new_status=RequestStatus.APPROVED,
                actor=users["lab_manager"],
                reason="seeded demo request",
            )
            for index in range(1, 3):
                sample = Sample.objects.create(
                    sample_no=f"SMP-DEMO-0000{index}",
                    request=req,
                    sample_name=f"Wafer CND-24A-{index}",
                    lot_id="CND-24A",
                    wafer_id=f"W{index:02d}",
                    material_type="Silicon",
                    status=SampleStatus.PENDING_RECEIVE,
                )
                SampleStatusHistory.objects.create(
                    sample=sample,
                    previous_status="",
                    new_status=sample.status,
                    actor=users["fab_user"],
                    reason="seeded demo sample",
                )

        self.stdout.write(self.style.SUCCESS("Seeded demo LIMS data."))
