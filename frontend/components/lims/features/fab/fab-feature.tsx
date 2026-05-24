"use client"

import type { Route } from "@/components/lims/shell"
import { FabDashboard } from "@/components/lims/pages/fab/dashboard"
import { FabRequests } from "@/components/lims/pages/fab/requests"
import { FabDrafts } from "@/components/lims/pages/fab/drafts"
import { FabNewRequest } from "@/components/lims/pages/fab/new-request"
import { FabRequestDetail } from "@/components/lims/pages/fab/request-detail"
import { NotificationsPage } from "@/components/lims/pages/notifications"

interface FabFeatureProps {
  route: Route
  navigate: (route: Route) => void
}

export function FabFeature({ route, navigate }: FabFeatureProps) {
  if (route.page === 'fab_requests') {
    return <FabRequests navigate={navigate} initialTab={route.tab || 'all'} />
  }

  if (route.page === 'fab_drafts') {
    return <FabDrafts navigate={navigate} />
  }

  if (route.page === 'fab_new' || route.page === 'fab_draft_edit') {
    return <FabNewRequest navigate={navigate} />
  }

  if (route.page === 'fab_request') {
    return <FabRequestDetail id={route.id} navigate={navigate} />
  }

  if (route.page === 'fab_notifications') {
    return <NotificationsPage />
  }

  return <FabDashboard />
}
