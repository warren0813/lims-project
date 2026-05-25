from __future__ import annotations

import django.db.models.deletion
import uuid
from django.db import migrations, models


def create_existing_sample_experiments(apps, schema_editor):
    Sample = apps.get_model("commissions", "Sample")
    SampleExperiment = apps.get_model("commissions", "SampleExperiment")
    Recipe = apps.get_model("equipment", "Recipe")

    rows = []
    for sample in Sample.objects.select_related("request").all():
        if SampleExperiment.objects.filter(sample_id=sample.id).exists():
            continue
        recipe = (
            Recipe.objects.filter(
                experiment_type_id=sample.request.experiment_type_id,
                is_active=True,
            )
            .order_by("recipe_code")
            .first()
        )
        rows.append(
            SampleExperiment(
                sample_id=sample.id,
                experiment_type_id=sample.request.experiment_type_id,
                recipe_id=recipe.id if recipe else None,
                current_wip_id=sample.current_wip_id,
                sequence=1,
                status="completed" if sample.status == "completed" else "ready",
                completed_at=sample.updated_at if sample.status == "completed" else None,
            )
        )
    if rows:
        SampleExperiment.objects.bulk_create(rows)


class Migration(migrations.Migration):
    dependencies = [
        ("commissions", "0003_commissionrequest_assigned_lab_user_and_more"),
        ("equipment", "0003_alter_equipment_status"),
        ("experiments", "0001_initial"),
        ("wip", "0002_alter_wipbatch_status_dispatchqueueproposal_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SampleExperiment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sequence", models.PositiveIntegerField(default=1)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("ready", "Ready"),
                            ("in_wip", "In WIP"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=40,
                    ),
                ),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "current_wip",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sample_experiments",
                        to="wip.wipbatch",
                    ),
                ),
                (
                    "experiment_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="sample_experiments",
                        to="experiments.experimenttype",
                    ),
                ),
                (
                    "recipe",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sample_experiments",
                        to="equipment.recipe",
                    ),
                ),
                (
                    "sample",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="experiments",
                        to="commissions.sample",
                    ),
                ),
            ],
            options={
                "db_table": "sample_experiment",
                "ordering": ["sequence", "created_at"],
                "indexes": [
                    models.Index(fields=["sample", "sequence"], name="sample_expe_sample__eb79d2_idx"),
                    models.Index(fields=["experiment_type", "status"], name="sample_expe_experim_97e9bc_idx"),
                    models.Index(fields=["status", "created_at"], name="sample_expe_status_5a5a1b_idx"),
                ],
                "unique_together": {("sample", "experiment_type")},
            },
        ),
        migrations.RunPython(create_existing_sample_experiments, migrations.RunPython.noop),
    ]
