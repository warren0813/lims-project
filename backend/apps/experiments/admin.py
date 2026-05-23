from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.experiments.models import ExperimentResult, ExperimentType


@admin.register(ExperimentType)
class ExperimentTypeAdmin(ModelAdmin):
    list_display = ("code", "name", "lab_category", "is_active", "created_at")
    list_filter = ("lab_category", "is_active")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25


@admin.register(ExperimentResult)
class ExperimentResultAdmin(ModelAdmin):
    list_display = ("dispatch", "verdict", "data_source", "created_at")
    list_filter = ("verdict", "data_source")
    readonly_fields = ("created_at", "updated_at")
