"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, NAV_ITEMS, FAB_NAV_ITEMS, Route, NavItem, User } from "@/components/lims/shell"
import { LoginPage } from "@/components/lims/login"
import { AuthProvider, useAuth } from "@/lib/lims/hooks"
import { FabFeature } from "@/components/lims/features/fab"
import { LabFeature } from "@/components/lims/features/lab"
import { ManagerFeature } from "@/components/lims/features/manager"
import { defaultRouteForRole, isRouteAllowedForRole, routeToPath } from "@/components/lims/routes/path"

const MANAGER_NAV_ITEMS: NavItem[] = [
  { id: 'mgr_all_requests', label: 'All Requests', cn: '全部申請', icon: 'ClipboardList' },
  { id: 'mgr_recipes', label: 'Recipes', cn: '食譜', icon: 'Layers' },
  { id: 'mgr_reports', label: 'Reports', cn: '報表', icon: 'TrendUp' },
]

const labNavItems = NAV_ITEMS.map((item) => ({ ...item, id: `lab_${item.id}` }))
const managerLabNavItems = NAV_ITEMS.map((item) => (
  item.id === 'dashboard'
    ? { ...item, id: 'mgr_dashboard' }
    : { ...item, id: `lab_${item.id}` }
))

interface LimsAppProps { initialRoute?: Route }

export function LimsApp({ initialRoute }: LimsAppProps = {}) {
  return (
    <AuthProvider>
      <LimsAppContent initialRoute={initialRoute} />
    </AuthProvider>
  )
}

function LimsAppContent({ initialRoute }: LimsAppProps) {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [route, setRoute] = useState<Route>(initialRoute ?? { page: 'lab_dashboard' })

  const navigate = useCallback((nextRoute: Route) => {
    setRoute(nextRoute)
    if (user) router.push(routeToPath(nextRoute, user.role))
  }, [router, user])

  const onLogin = useCallback((u: User) => {
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, u.role)
      ? initialRoute
      : defaultRouteForRole(u.role)
    setRoute(nextRoute)
    router.push(routeToPath(nextRoute, u.role))
  }, [initialRoute, router])

  const onLogout = useCallback(() => {
    logout()
    setRoute({ page: 'lab_dashboard' })
    router.push('/')
  }, [logout, router])

  useEffect(() => {
    if (!user) return
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, user.role)
      ? initialRoute
      : defaultRouteForRole(user.role)
    setRoute(nextRoute)
  }, [initialRoute, user])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', background: 'var(--bg-app)' }}>
        Loading LIMS...
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={onLogin} />
  }

  if (user.role === 'fab_user') {
    const navFromSidebar = (nextRoute: Route) => {
      navigate(nextRoute.page === 'fab_requests' ? { page: 'fab_requests', tab: 'all' } : nextRoute)
    }

    return (
      <div className="app" data-screen-label={`App · fab_user · ${route.page}`}>
        <Sidebar
          route={route}
          navigate={navFromSidebar}
          navItems={FAB_NAV_ITEMS}
          sectionLabel="Requests"
          user={user}
          onLogout={onLogout}
        />
        <main className="main">
          <FabFeature route={route} navigate={navigate} />
        </main>
      </div>
    )
  }

  if (user.role === 'lab_manager') {
    const navSections = [
      { label: 'Lab Operations', items: managerLabNavItems },
      { label: 'Management', items: MANAGER_NAV_ITEMS },
    ]
    const isManagerRoute = route.page?.startsWith('mgr_')

    return (
      <div className="app" data-screen-label={`App · lab_manager · ${route.page}`}>
        <Sidebar
          route={route}
          navigate={navigate}
          navSections={navSections}
          user={user}
          onLogout={onLogout}
        />
        <main className="main">
          {isManagerRoute
            ? <ManagerFeature route={route} navigate={navigate} />
            : <LabFeature route={route} navigate={navigate} canManage />}
        </main>
      </div>
    )
  }

  return (
    <div className="app" data-screen-label={`App · lab_member · ${route.page}`}>
      <Sidebar
        route={route}
        navigate={navigate}
        navItems={labNavItems}
        sectionLabel="Lab Operations"
        user={user}
        onLogout={onLogout}
      />
      <main className="main">
        <LabFeature route={route} navigate={navigate} />
      </main>
    </div>
  )
}

export default LimsApp
