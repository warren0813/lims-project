from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.dispatch.models import DispatchJob, DispatchLog, DispatchStep


class DispatchLogInline(TabularInline):
    model = DispatchLog
    extra = 0
    readonly_fields = ("created_at", "updated_at")


@admin.register(DispatchJob)
class DispatchJobAdmin(ModelAdmin):
    list_display = ("dispatch_no", "wip", "equipment", "status", "progress", "created_at")
    list_filter = ("status", "queue_name")
    search_fields = ("dispatch_no", "wip__wip_no", "equipment__equipment_code")
    readonly_fields = ("dispatch_no", "created_at", "updated_at")
    inlines = (DispatchLogInline,)


admin.site.register(DispatchStep, ModelAdmin)
admin.site.register(DispatchLog, ModelAdmin)
