"use client"

import type { Route } from "@/components/lims/shell"
import { MgrDashboard } from "@/components/lims/pages/mgr/dashboard"
import { MgrAllRequests } from "@/components/lims/pages/mgr/all-requests"
import { MgrRequestDetail } from "@/components/lims/pages/mgr/request-detail"
import { MgrRecipes } from "@/components/lims/pages/mgr/recipes"
import { MgrReports } from "@/components/lims/pages/mgr/reports"

interface ManagerFeatureProps {
  route: Route
  navigate: (route: Route) => void
}

export function ManagerFeature({ route, navigate }: ManagerFeatureProps) {
  if (route.page === 'mgr_all_requests') {
    return <MgrAllRequests navigate={navigate} />
  }

  if (route.page === 'mgr_request') {
    return <MgrRequestDetail id={route.id} navigate={navigate} />
  }

  if (route.page === 'mgr_recipes') {
    return <MgrRecipes />
  }

  if (route.page === 'mgr_reports') {
    return <MgrReports />
  }

  return <MgrDashboard navigate={navigate} />
}
