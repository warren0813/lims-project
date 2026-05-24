import type { Route } from "@/components/lims/shell"

export type LimsRolePath = "fab" | "lab" | "manager"

export function defaultRouteForRole(role?: string): Route {
  if (role === 'fab_user') return { page: 'fab_dashboard' }
  if (role === 'lab_manager') return { page: 'mgr_dashboard' }
  return { page: 'lab_dashboard' }
}

export function rolePathForUserRole(role?: string): LimsRolePath {
  if (role === 'fab_user') return 'fab'
  if (role === 'lab_manager') return 'manager'
  return 'lab'
}

export function isRouteAllowedForRole(route: Route, role?: string): boolean {
  if (role === 'fab_user') return route.page.startsWith('fab_')
  if (role === 'lab_manager') return route.page.startsWith('mgr_') || route.page.startsWith('lab_')
  return role === 'lab_user' && (route.page.startsWith('lab_') || ['dashboard', 'samples', 'wip', 'dispatches', 'equipment'].includes(route.page))
}

export function routeToPath(route: Route, role?: string): string {
  const rolePath = rolePathForUserRole(role)
  switch (route.page) {
    case 'fab_dashboard': return '/fab/dashboard'
    case 'fab_requests': return route.tab && route.tab !== 'all' ? `/fab/requests?tab=${encodeURIComponent(route.tab)}` : '/fab/requests'
    case 'fab_drafts': return '/fab/drafts'
    case 'fab_new': return '/fab/new'
    case 'fab_notifications': return '/fab/notifications'
    case 'fab_draft_edit': return `/fab/drafts/${route.id}/edit`
    case 'fab_request': return `/fab/requests/${route.id}`
    case 'mgr_dashboard': return '/manager/dashboard'
    case 'mgr_all_requests': return '/manager/requests'
    case 'mgr_request': return `/manager/requests/${route.id}`
    case 'mgr_recipes': return '/manager/recipes'
    case 'mgr_reports': return '/manager/reports'
    case 'mgr_accounts': return '/manager/accounts'
    case 'mgr_notifications': return '/manager/notifications'
    case 'lab_dashboard':
    case 'dashboard': return rolePath === 'manager' ? '/manager/lab/dashboard' : '/lab/dashboard'
    case 'lab_samples':
    case 'samples': return labPath('samples', route, rolePath)
    case 'lab_wafer': return labPath(`samples/${route.id}`, route, rolePath)
    case 'lab_wip':
    case 'wip': return labPath('wip', route, rolePath)
    case 'lab_wip_detail': return labPath(`wip/${route.id}`, route, rolePath)
    case 'lab_dispatches':
    case 'dispatches': return labPath('dispatches', route, rolePath)
    case 'lab_dispatch_detail': return labPath(`dispatches/${route.id}`, route, rolePath)
    case 'lab_equipment':
    case 'equipment': return labPath('equipment', route, rolePath)
    case 'lab_notifications':
    case 'notifications': return labPath('notifications', route, rolePath)
    default: return rolePath === 'fab' ? '/fab/dashboard' : rolePath === 'manager' ? '/manager/dashboard' : '/lab/dashboard'
  }
}

function labPath(segment: string, route: Route, rolePath: LimsRolePath): string {
  const prefix = rolePath === 'manager' ? '/manager/lab' : '/lab'
  const tab = route.tab ? `?tab=${encodeURIComponent(route.tab)}` : ''
  return `${prefix}/${segment}${tab}`
}

export function routeFromPath(role: string | undefined, segments: string[] = [], tab?: string): Route {
  const [first, second, third] = segments

  if (role === 'fab') {
    if (!first || first === 'dashboard') return { page: 'fab_dashboard' }
    if (first === 'requests' && second) return { page: 'fab_request', id: numericId(second) }
    if (first === 'requests') return { page: 'fab_requests', tab: tab || 'all' }
    if (first === 'drafts' && second && third === 'edit') return { page: 'fab_draft_edit', id: numericId(second) }
    if (first === 'drafts') return { page: 'fab_drafts' }
    if (first === 'new') return { page: 'fab_new' }
    if (first === 'notifications') return { page: 'fab_notifications' }
    return { page: 'fab_dashboard' }
  }

  if (role === 'manager') {
    const managerSegments = first === 'lab' ? segments.slice(1) : segments
    if (first === 'lab') return labRouteFromSegments(managerSegments, tab)
    if (!first || first === 'dashboard') return { page: 'mgr_dashboard' }
    if (first === 'requests' && second) return { page: 'mgr_request', id: numericId(second) }
    if (first === 'requests') return { page: 'mgr_all_requests' }
    if (first === 'recipes') return { page: 'mgr_recipes' }
    if (first === 'reports') return { page: 'mgr_reports' }
    if (first === 'accounts') return { page: 'mgr_accounts' }
    if (first === 'notifications') return { page: 'mgr_notifications' }
    return { page: 'mgr_dashboard' }
  }

  return labRouteFromSegments(segments, tab)
}

function labRouteFromSegments(segments: string[], tab?: string): Route {
  const [first, second] = segments
  if (!first || first === 'dashboard') return { page: 'lab_dashboard' }
  if (first === 'samples' && second) return { page: 'lab_wafer', id: numericId(second) }
  if (first === 'samples') return { page: 'lab_samples', tab: tab || 'all' }
  if (first === 'wip' && second) return { page: 'lab_wip_detail', id: numericId(second) }
  if (first === 'wip') return { page: 'lab_wip' }
  if (first === 'dispatches' && second) return { page: 'lab_dispatch_detail', id: numericId(second) }
  if (first === 'dispatches') return { page: 'lab_dispatches', tab: tab || 'active' }
  if (first === 'equipment') return { page: 'lab_equipment' }
  if (first === 'notifications') return { page: 'lab_notifications' }
  return { page: 'lab_dashboard' }
}

function numericId(value: string): string | number {
  const n = Number(value)
  return Number.isFinite(n) && String(n) === value ? n : value
}
