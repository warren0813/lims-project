"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/lims/hooks"
import { defaultRouteForRole, isRouteAllowedForRole, routeToPath } from "@/components/lims/routes/path"
import type { Route, User } from "@/components/lims/shell"
import { createReferenceApi } from "@/components/lims/reference/compat-api"
import { MgrAccounts } from "@/components/lims/pages/mgr/accounts"
import { NotificationsPage } from "@/components/lims/pages/notifications"

type ReferenceWindow = Window & {
  React?: typeof React
  api?: ReturnType<typeof createReferenceApi>
  I?: Record<string, React.ComponentType<any>>
  UI?: Record<string, React.ComponentType<any>>
  SHELL?: {
    Sidebar: React.ComponentType<any>
    NAV_ITEMS: any[]
    FAB_NAV_ITEMS: any[]
  }
  LoginPage?: React.ComponentType<{ onLogin: (user: User) => void }>
  FabApp?: React.ComponentType<any>
  LabApp?: React.ComponentType<any>
  MgrApp?: React.ComponentType<any>
}

export function ReferenceLimsApp({ initialRoute }: { initialRoute?: Route } = {}) {
  return (
    <AuthProvider>
      <ReferenceAppContent initialRoute={initialRoute} />
    </AuthProvider>
  )
}

function useReferenceBundle() {
  const [ready, setReady] = useState(false)
  const referenceApi = useMemo(() => createReferenceApi(), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const win = window as ReferenceWindow
      win.React = React
      win.api = referenceApi
      await import("./reference/icons.jsx")
      await import("./reference/primitives.jsx")
      await import("./reference/shell.jsx")
      await import("./reference/login.jsx")
      await import("./reference/postlogin.jsx")
      await import("./reference/fab.jsx")
      await import("./reference/lab.jsx")
      await import("./reference/mgr.jsx")
      if (!cancelled) setReady(true)
    }

    load().catch((error) => {
      console.error("Failed to load reference LIMS UI", error)
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [referenceApi])

  return ready
}

function ReferenceAppContent({ initialRoute }: { initialRoute?: Route }) {
  const router = useRouter()
  const { user, loading, adoptUser, logout } = useAuth()
  const bundleReady = useReferenceBundle()
  const [route, setRoute] = useState<Route>(initialRoute ?? { page: "lab_dashboard" })
  const unreadCount = useUnreadNotificationCount(Boolean(user))

  const navigate = useCallback((nextRoute: Route) => {
    setRoute((current) => sameRoute(current, nextRoute) ? current : nextRoute)
    if (!user) return
    const nextPath = routeToPath(nextRoute, user.role)
    if (currentPathWithSearch() !== nextPath) router.push(nextPath)
  }, [router, user])

  const onLogin = useCallback((nextUser: User) => {
    const normalizedUser = normalizeUiUser(nextUser)
    adoptUser(normalizedUser)
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, normalizedUser.role)
      ? initialRoute
      : defaultRouteForRole(normalizedUser.role)
    setRoute((current) => sameRoute(current, nextRoute) ? current : nextRoute)
    const nextPath = routeToPath(nextRoute, normalizedUser.role)
    if (currentPathWithSearch() !== nextPath) router.push(nextPath)
  }, [adoptUser, initialRoute, router])

  const onLogout = useCallback(() => {
    logout()
    setRoute((current) => sameRoute(current, { page: "lab_dashboard" }) ? current : { page: "lab_dashboard" })
    if (currentPathWithSearch() !== "/") router.push("/")
  }, [logout, router])

  useEffect(() => {
    if (!user) {
      if (!loading && currentPathWithSearch() !== "/") router.replace("/")
      return
    }
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, user.role)
      ? initialRoute
      : defaultRouteForRole(user.role)
    const nextPath = routeToPath(nextRoute, user.role)
    setRoute((current) => sameRoute(current, nextRoute) ? current : nextRoute)
    if (currentPathWithSearch() !== nextPath) router.replace(nextPath)
  }, [initialRoute, loading, router, user])

  const win = typeof window !== "undefined" ? window as ReferenceWindow : undefined

  if (loading || !bundleReady || !win?.LoginPage || !win?.SHELL) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-secondary)", background: "var(--bg-app)" }}>
        Loading LIMS...
      </div>
    )
  }

  const tweaksUI = null

  if (!user) {
    const LoginPage = win.LoginPage
    return (
      <div data-screen-label="Login">
        <LoginPage onLogin={onLogin} />
        {tweaksUI}
      </div>
    )
  }

  if (user.role === "fab_user") {
    return <FabRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} unreadCount={unreadCount} />
  }

  if (user.role === "lab_manager") {
    return <ManagerRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} unreadCount={unreadCount} />
  }

  return <LabRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} unreadCount={unreadCount} />
}

function useUnreadNotificationCount(enabled: boolean): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    let cancelled = false
    const refresh = async () => {
      try {
        const next = await (window as ReferenceWindow).api?.notifications.unreadCount()
        if (!cancelled) setCount(Number(next || 0))
      } catch {
        if (!cancelled) setCount(0)
      }
    }
    refresh()
    const h = setInterval(refresh, 5000)
    return () => {
      cancelled = true
      clearInterval(h)
    }
  }, [enabled])
  return count
}

function LabRoot({ user, route, navigate, onLogout, tweaksUI, unreadCount }: RootProps) {
  const win = window as ReferenceWindow
  const { Sidebar, NAV_ITEMS } = win.SHELL!
  const LabApp = win.LabApp!
  const navItems = [
    ...NAV_ITEMS.map((item) => ({ ...item, id: `lab_${item.id}` })),
    { id: "lab_notifications", label: "Notifications", cn: "通知", icon: "Bell" },
  ]
  return (
    <div className="app" data-screen-label={`App · lab_mem · ${route.page}`}>
      <Sidebar
        route={route}
        navigate={navigate}
        navItems={navItems}
        sectionLabel="Lab Operations"
        sublabel="Lab Member"
        user={user}
        onLogout={onLogout}
        counts={{ lab_notifications: unreadCount }}
      />
      <main className="main">
        {route.page === "lab_notifications" ? <NotificationsPage /> : <LabApp route={route} navigate={navigate} />}
      </main>
      {tweaksUI}
    </div>
  )
}

function FabRoot({ user, route, navigate, onLogout, tweaksUI, unreadCount }: RootProps) {
  const win = window as ReferenceWindow
  const { Sidebar, FAB_NAV_ITEMS } = win.SHELL!
  const FabApp = win.FabApp!
  const navFromSidebar = (nextRoute: Route) => {
    navigate(nextRoute.page === "fab_requests" ? { page: "fab_requests", tab: "all" } : nextRoute)
  }
  return (
    <div className="app" data-screen-label={`App · fab_user · ${route.page}`}>
      <Sidebar
        route={route}
        navigate={navFromSidebar}
        navItems={[...FAB_NAV_ITEMS, { id: "fab_notifications", label: "Notifications", cn: "通知", icon: "Bell" }]}
        sectionLabel="Requests"
        user={user}
        onLogout={onLogout}
        counts={{ fab_notifications: unreadCount }}
      />
      <main className="main">
        {route.page === "fab_notifications" ? <NotificationsPage /> : <FabApp route={route} navigate={navigate} />}
      </main>
      {tweaksUI}
    </div>
  )
}

function ManagerRoot({ user, route, navigate, onLogout, tweaksUI, unreadCount }: RootProps) {
  const win = window as ReferenceWindow
  const { Sidebar, NAV_ITEMS } = win.SHELL!
  const LabApp = win.LabApp!
  const MgrApp = win.MgrApp!
  const labNav = NAV_ITEMS.map((item) => (
    item.id === "dashboard"
      ? { ...item, id: "mgr_dashboard" }
      : { ...item, id: `lab_${item.id}` }
  ))
  const managerNav = [
    { id: "mgr_all_requests", label: "All Requests", cn: "全部申請", icon: "ClipboardList" },
    { id: "mgr_recipes", label: "Recipes", cn: "食譜", icon: "Layers" },
    { id: "mgr_reports", label: "Reports", cn: "報表", icon: "TrendUp" },
    { id: "mgr_accounts", label: "Accounts", cn: "帳號", icon: "User" },
    { id: "mgr_notifications", label: "Notifications", cn: "通知", icon: "Bell" },
  ]
  const isManagerRoute = route.page?.startsWith("mgr_")

  return (
    <div className="app" data-screen-label={`App · lab_manager · ${route.page}`}>
      <Sidebar
        route={route}
        navigate={navigate}
        navSections={[
          { label: "Lab Operations", items: labNav },
          { label: "Management", items: managerNav },
        ]}
        user={user}
        onLogout={onLogout}
        counts={{ mgr_notifications: unreadCount }}
      />
      <main className="main">
        {route.page === "mgr_accounts"
          ? <MgrAccounts />
          : route.page === "mgr_notifications"
            ? <NotificationsPage />
            : isManagerRoute
              ? <MgrApp route={route} navigate={navigate} />
              : <LabApp route={route} navigate={navigate} canManage />}
      </main>
      {tweaksUI}
    </div>
  )
}

function currentPathWithSearch(): string {
  if (typeof window === "undefined") return ""
  return `${window.location.pathname}${window.location.search}`
}

function sameRoute(left: Route, right: Route): boolean {
  return left.page === right.page
    && left.id === right.id
    && left.tab === right.tab
}

interface RootProps {
  user: User
  route: Route
  navigate: (route: Route) => void
  onLogout: () => void
  tweaksUI: React.ReactNode
  unreadCount?: number
}

function normalizeUiUser(user: User): User {
  return {
    ...user,
    role: user.role === "lab_member" ? "lab_user" : user.role,
    display: user.display || user.username,
    subtitle: user.subtitle || (user.role === "fab_user" ? "廠區使用者" : user.role === "lab_manager" ? "實驗室主管" : "實驗室成員"),
  }
}

export default ReferenceLimsApp
