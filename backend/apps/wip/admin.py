from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.wip.models import WipBatch, WipItem, WipStatusHistory


class WipItemInline(TabularInline):
    model = WipItem
    extra = 0
    readonly_fields = ("created_at", "updated_at")


@admin.register(WipBatch)
class WipBatchAdmin(ModelAdmin):
    list_display = ("wip_no", "experiment_type", "recipe", "priority", "status", "created_at")
    list_filter = ("status", "priority", "experiment_type")
    search_fields = ("wip_no", "recipe__recipe_code")
    readonly_fields = ("wip_no", "locked_at", "dispatched_at", "completed_at", "created_at", "updated_at")
    inlines = (WipItemInline,)


admin.site.register(WipItem, ModelAdmin)
admin.site.register(WipStatusHistory, ModelAdmin)
