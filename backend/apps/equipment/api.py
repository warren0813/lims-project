from __future__ import annotations

from django.db import transaction
from django.http import HttpRequest
from ninja import Query, Router

from api.schemas import ErrorOut
from apps.accounts.auth import JWTAuth
from apps.accounts.permissions import has_lab_role, has_manager_role
from apps.common.codes import next_business_code
from apps.equipment.models import (
    Equipment,
    EquipmentCapability,
    EquipmentStatus,
    EquipmentType,
    Recipe,
)
from apps.equipment.schemas import (
    EquipmentIn,
    EquipmentOut,
    EquipmentTypeIn,
    EquipmentTypeOut,
    EquipmentUpdate,
    RecipeIn,
    RecipeOut,
    RecipeUpdate,
)
from apps.equipment.serializers import equipment_out, equipment_type_out, recipe_out
from apps.experiments.models import ExperimentType

router = Router(tags=["Equipment"], auth=JWTAuth())
recipe_router = Router(tags=["Recipes"], auth=JWTAuth())


def _equipment_qs():
    return Equipment.objects.select_related("equipment_type", "current_dispatch").prefetch_related(
        "capability_links__recipe__experiment_type",
        "capability_links__recipe__equipment_type",
    )


def _recipe_qs():
    return Recipe.objects.select_related("experiment_type", "equipment_type")


@router.get("/types", response={200: list[EquipmentTypeOut], 403: ErrorOut})
def list_equipment_types(request: HttpRequest):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    return 200, [equipment_type_out(item) for item in EquipmentType.objects.all()]


@router.post("/types", response={201: EquipmentTypeOut, 403: ErrorOut})
def create_equipment_type(request: HttpRequest, payload: EquipmentTypeIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can create equipment types"}
    item = EquipmentType.objects.create(**payload.model_dump())
    return 201, equipment_type_out(item)


@router.get("/", response={200: list[EquipmentOut], 403: ErrorOut})
def list_equipment(
    request: HttpRequest,
    status: EquipmentStatus | None = Query(None),  # noqa: B008
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    qs = _equipment_qs().order_by("equipment_code")
    if status:
        qs = qs.filter(status=status)
    return 200, [equipment_out(item) for item in qs]


@router.post("/", response={201: EquipmentOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def create_equipment(request: HttpRequest, payload: EquipmentIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can create equipment"}
    try:
        equipment_type = EquipmentType.objects.get(pk=payload.equipment_type_id)
    except EquipmentType.DoesNotExist:
        return 404, {"detail": "Equipment type not found"}
    with transaction.atomic():
        equipment = Equipment.objects.create(
            equipment_code=payload.equipment_code
            or next_business_code(Equipment, "equipment_code", "EQP"),
            name=payload.name,
            model_name=payload.model_name,
            equipment_type=equipment_type,
            worker_queue_name=equipment_type.queue_name,
            capacity=payload.capacity,
            location=payload.location,
        )
        for recipe in Recipe.objects.filter(pk__in=payload.recipe_ids):
            EquipmentCapability.objects.get_or_create(equipment=equipment, recipe=recipe)
    return 201, equipment_out(_equipment_qs().get(pk=equipment.pk))


@router.get("/{equipment_id}", response={200: EquipmentOut, 403: ErrorOut, 404: ErrorOut})
def get_equipment(request: HttpRequest, equipment_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        equipment = _equipment_qs().get(pk=equipment_id)
    except Equipment.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, equipment_out(equipment)


@router.patch("/{equipment_id}", response={200: EquipmentOut, 403: ErrorOut, 404: ErrorOut})
def update_equipment(request: HttpRequest, equipment_id: str, payload: EquipmentUpdate):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can update equipment"}
    try:
        equipment = Equipment.objects.get(pk=equipment_id)
    except Equipment.DoesNotExist:
        return 404, {"detail": "Not found"}
    updates = payload.model_dump(exclude_unset=True)
    recipe_ids = updates.pop("recipe_ids", None)
    for field, value in updates.items():
        setattr(equipment, field, value)
    equipment.save()
    if recipe_ids is not None:
        EquipmentCapability.objects.filter(equipment=equipment).delete()
        for recipe in Recipe.objects.filter(pk__in=recipe_ids):
            EquipmentCapability.objects.create(equipment=equipment, recipe=recipe)
    return 200, equipment_out(_equipment_qs().get(pk=equipment.pk))


@router.post("/{equipment_id}/maintenance", response={200: EquipmentOut, 403: ErrorOut, 404: ErrorOut})
def mark_maintenance(request: HttpRequest, equipment_id: str):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can update equipment"}
    try:
        equipment = Equipment.objects.get(pk=equipment_id)
    except Equipment.DoesNotExist:
        return 404, {"detail": "Not found"}
    equipment.status = EquipmentStatus.MAINTENANCE
    equipment.save(update_fields=["status", "updated_at"])
    return 200, equipment_out(_equipment_qs().get(pk=equipment.pk))


@router.post("/{equipment_id}/activate", response={200: EquipmentOut, 403: ErrorOut, 404: ErrorOut})
def activate_equipment(request: HttpRequest, equipment_id: str):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can update equipment"}
    try:
        equipment = Equipment.objects.get(pk=equipment_id)
    except Equipment.DoesNotExist:
        return 404, {"detail": "Not found"}
    equipment.status = EquipmentStatus.IDLE
    equipment.is_active = True
    equipment.save(update_fields=["status", "is_active", "updated_at"])
    return 200, equipment_out(_equipment_qs().get(pk=equipment.pk))


@router.post("/{equipment_id}/deactivate", response={200: EquipmentOut, 403: ErrorOut, 404: ErrorOut})
def deactivate_equipment(request: HttpRequest, equipment_id: str):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can update equipment"}
    try:
        equipment = Equipment.objects.get(pk=equipment_id)
    except Equipment.DoesNotExist:
        return 404, {"detail": "Not found"}
    equipment.status = EquipmentStatus.OFFLINE
    equipment.is_active = False
    equipment.save(update_fields=["status", "is_active", "updated_at"])
    return 200, equipment_out(_equipment_qs().get(pk=equipment.pk))


@recipe_router.get("/", response={200: list[RecipeOut], 403: ErrorOut})
def list_recipes(
    request: HttpRequest,
    experiment_type_id: str | None = Query(None),  # noqa: B008
    equipment_type_id: str | None = Query(None),  # noqa: B008
    is_active: bool | None = Query(None),  # noqa: B008
):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    qs = _recipe_qs()
    if experiment_type_id:
        qs = qs.filter(experiment_type_id=experiment_type_id)
    if equipment_type_id:
        qs = qs.filter(equipment_type_id=equipment_type_id)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    else:
        qs = qs.filter(is_active=True)
    return 200, [recipe_out(recipe) for recipe in qs]


@recipe_router.post("/", response={201: RecipeOut, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def create_recipe(request: HttpRequest, payload: RecipeIn):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can create recipes"}
    try:
        experiment_type = ExperimentType.objects.get(pk=payload.experiment_type_id)
        equipment_type = EquipmentType.objects.get(pk=payload.equipment_type_id)
    except (ExperimentType.DoesNotExist, EquipmentType.DoesNotExist):
        return 404, {"detail": "Experiment type or equipment type not found"}
    recipe = Recipe.objects.create(
        recipe_code=payload.recipe_code or next_business_code(Recipe, "recipe_code", "RCP"),
        name=payload.name,
        description=payload.description,
        experiment_type=experiment_type,
        equipment_type=equipment_type,
        parameters=payload.parameters,
        estimated_runtime_sec=payload.estimated_runtime_sec,
        max_batch_size=payload.max_batch_size,
        material_constraints=payload.material_constraints,
        safety_constraints=payload.safety_constraints,
        version=payload.version,
        created_by=request.auth,
    )
    return 201, recipe_out(_recipe_qs().get(pk=recipe.pk))


@recipe_router.get("/{recipe_id}", response={200: RecipeOut, 403: ErrorOut, 404: ErrorOut})
def get_recipe(request: HttpRequest, recipe_id: str):
    if not has_lab_role(request):
        return 403, {"detail": "Permission denied"}
    try:
        recipe = _recipe_qs().get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return 404, {"detail": "Not found"}
    return 200, recipe_out(recipe)


@recipe_router.patch("/{recipe_id}", response={200: RecipeOut, 403: ErrorOut, 404: ErrorOut})
def update_recipe(request: HttpRequest, recipe_id: str, payload: RecipeUpdate):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can update recipes"}
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return 404, {"detail": "Not found"}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    recipe.save()
    return 200, recipe_out(_recipe_qs().get(pk=recipe.pk))


@recipe_router.delete("/{recipe_id}", response={200: RecipeOut, 403: ErrorOut, 404: ErrorOut})
def delete_recipe(request: HttpRequest, recipe_id: str):
    if not has_manager_role(request):
        return 403, {"detail": "Only managers can deactivate recipes"}
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return 404, {"detail": "Not found"}
    recipe.is_active = False
    recipe.save(update_fields=["is_active", "updated_at"])
    return 200, recipe_out(_recipe_qs().get(pk=recipe.pk))
