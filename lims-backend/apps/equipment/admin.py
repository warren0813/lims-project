from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.equipment.models import (
    Equipment,
    EquipmentCapability,
    EquipmentEventLog,
    EquipmentType,
    Recipe,
)


class EquipmentCapabilityInline(TabularInline):
    model = EquipmentCapability
    extra = 0


@admin.register(Equipment)
class EquipmentAdmin(ModelAdmin):
    list_display = ("equipment_code", "name", "equipment_type", "status", "is_active")
    list_filter = ("status", "equipment_type", "is_active")
    search_fields = ("equipment_code", "name", "model_name")
    readonly_fields = ("created_at", "updated_at", "last_heartbeat_at")
    inlines = (EquipmentCapabilityInline,)


@admin.register(Recipe)
class RecipeAdmin(ModelAdmin):
    list_display = ("recipe_code", "name", "experiment_type", "equipment_type", "is_active")
    list_filter = ("is_active", "experiment_type", "equipment_type")
    search_fields = ("recipe_code", "name")
    readonly_fields = ("created_at", "updated_at")


admin.site.register(EquipmentType, ModelAdmin)
admin.site.register(EquipmentCapability, ModelAdmin)
admin.site.register(EquipmentEventLog, ModelAdmin)
