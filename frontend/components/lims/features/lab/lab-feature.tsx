"use client"

import type { Route } from "@/components/lims/shell"
import { LabDashboard } from "@/components/lims/pages/lab/dashboard"
import { LabSamples } from "@/components/lims/pages/lab/samples"
import { LabWaferDetail } from "@/components/lims/pages/lab/wafer-detail"
import { LabWIP } from "@/components/lims/pages/lab/wip"
import { LabWipDetail } from "@/components/lims/pages/lab/wip-detail"
import { LabDispatches } from "@/components/lims/pages/lab/dispatches"
import { LabDispatchDetail } from "@/components/lims/pages/lab/dispatch-detail"
import { LabEquipment } from "@/components/lims/pages/lab/equipment"

interface LabFeatureProps {
  route: Route
  navigate: (route: Route) => void
  canManage?: boolean
}

export function LabFeature({ route, navigate, canManage = false }: LabFeatureProps) {
  if (route.page === 'lab_samples' || route.page === 'samples') {
    return <LabSamples navigate={navigate} tab={route.tab || 'all'} />
  }

  if (route.page === 'lab_wafer') {
    return <LabWaferDetail id={route.id} navigate={navigate} />
  }

  if (route.page === 'lab_wip' || route.page === 'wip') {
    return <LabWIP navigate={navigate} />
  }

  if (route.page === 'lab_wip_detail') {
    return <LabWipDetail id={route.id} navigate={navigate} />
  }

  if (route.page === 'lab_dispatches' || route.page === 'dispatches') {
    return <LabDispatches navigate={navigate} tab={route.tab || 'active'} />
  }

  if (route.page === 'lab_dispatch_detail') {
    return <LabDispatchDetail id={route.id} navigate={navigate} />
  }

  if (route.page === 'lab_equipment' || route.page === 'equipment') {
    return <LabEquipment navigate={navigate} canManage={canManage} />
  }

  return <LabDashboard navigate={navigate} />
}
