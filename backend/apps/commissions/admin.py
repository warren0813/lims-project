from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.commissions.models import (
    ApprovalRecord,
    CommissionRequest,
    RequestAttachment,
    RequestStatusHistory,
    Sample,
    SampleStatusHistory,
)


class SampleInline(TabularInline):
    model = Sample
    extra = 0
    readonly_fields = ("sample_no", "created_at", "updated_at")


@admin.register(CommissionRequest)
class CommissionRequestAdmin(ModelAdmin):
    list_display = ("request_no", "title", "requester", "priority", "status", "created_at")
    list_filter = ("status", "priority", "experiment_type")
    search_fields = ("request_no", "title", "requester__username", "project_code")
    readonly_fields = ("request_no", "submitted_at", "approved_at", "created_at", "updated_at")
    list_select_related = ("requester", "experiment_type", "preferred_recipe")
    inlines = (SampleInline,)


@admin.register(Sample)
class SampleAdmin(ModelAdmin):
    list_display = ("sample_no", "sample_name", "request", "status", "material_type")
    list_filter = ("status", "material_type")
    search_fields = ("sample_no", "sample_name", "lot_id", "wafer_id")
    readonly_fields = ("sample_no", "created_at", "updated_at")


admin.site.register(ApprovalRecord, ModelAdmin)
admin.site.register(RequestAttachment, ModelAdmin)
admin.site.register(RequestStatusHistory, ModelAdmin)
admin.site.register(SampleStatusHistory, ModelAdmin)
