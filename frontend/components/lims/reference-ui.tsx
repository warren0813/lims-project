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
  useTweaks?: (defaults: Record<string, string>) => [Record<string, string>, (key: string | Record<string, string>, value?: string) => void]
  TweaksPanel?: React.ComponentType<{ children: React.ReactNode }>
  TweakSection?: React.ComponentType<{ label: string }>
  TweakColor?: React.ComponentType<any>
  TweakButton?: React.ComponentType<any>
}

const TWEAK_DEFAULTS = {
  signInBg: "#1e1e24",
  signInFg: "#ffffff",
  fabBg: "linear-gradient(135deg, #f4a8bf, #6c67b8)",
}

const SIGNIN_OPTIONS = ["#6c67b8", "#1e1e24", "#f4a8bf", "#bbb7e8"]
const FAB_OPTIONS = [
  "linear-gradient(135deg, #f4a8bf, #bbb7e8)",
  "linear-gradient(135deg, #bbb7e8, #6c67b8)",
  "linear-gradient(135deg, #f4a8bf, #6c67b8)",
  "#1e1e24",
]

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
      await import("./reference/tweaks-panel.jsx")
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

  const navigate = useCallback((nextRoute: Route) => {
    setRoute(nextRoute)
    if (user) router.push(routeToPath(nextRoute, user.role))
  }, [router, user])

  const onLogin = useCallback((nextUser: User) => {
    const normalizedUser = normalizeUiUser(nextUser)
    adoptUser(normalizedUser)
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, normalizedUser.role)
      ? initialRoute
      : defaultRouteForRole(normalizedUser.role)
    setRoute(nextRoute)
    router.push(routeToPath(nextRoute, normalizedUser.role))
  }, [adoptUser, initialRoute, router])

  const onLogout = useCallback(() => {
    logout()
    setRoute({ page: "lab_dashboard" })
    router.push("/")
  }, [logout, router])

  useEffect(() => {
    if (!user) return
    const nextRoute = initialRoute && isRouteAllowedForRole(initialRoute, user.role)
      ? initialRoute
      : defaultRouteForRole(user.role)
    setRoute(nextRoute)
    router.replace(routeToPath(nextRoute, user.role))
  }, [initialRoute, router, user])

  const win = typeof window !== "undefined" ? window as ReferenceWindow : undefined

  if (loading || !bundleReady || !win?.LoginPage || !win?.SHELL) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-secondary)", background: "var(--bg-app)" }}>
        Loading LIMS...
      </div>
    )
  }

  const tweaksUI = <TweaksUI />

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
    return <FabRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} />
  }

  if (user.role === "lab_manager") {
    return <ManagerRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} />
  }

  return <LabRoot user={user} route={route} navigate={navigate} onLogout={onLogout} tweaksUI={tweaksUI} />
}

function LabRoot({ user, route, navigate, onLogout, tweaksUI }: RootProps) {
  const win = window as ReferenceWindow
  const { Sidebar, NAV_ITEMS } = win.SHELL!
  const LabApp = win.LabApp!
  const navItems = NAV_ITEMS.map((item) => ({ ...item, id: `lab_${item.id}` }))
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
      />
      <main className="main">
        <LabApp route={route} navigate={navigate} />
      </main>
      {tweaksUI}
    </div>
  )
}

function FabRoot({ user, route, navigate, onLogout, tweaksUI }: RootProps) {
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
        navItems={FAB_NAV_ITEMS}
        sectionLabel="Requests"
        user={user}
        onLogout={onLogout}
      />
      <main className="main">
        <FabApp route={route} navigate={navigate} />
      </main>
      {tweaksUI}
    </div>
  )
}

function ManagerRoot({ user, route, navigate, onLogout, tweaksUI }: RootProps) {
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

function TweaksUI() {
  const win = window as ReferenceWindow
  if (!win.useTweaks || !win.TweaksPanel || !win.TweakSection || !win.TweakColor || !win.TweakButton) return null
  return <TweaksUIReady />
}

function TweaksUIReady() {
  const win = window as ReferenceWindow
  const TweaksPanel = win.TweaksPanel!
  const TweakSection = win.TweakSection!
  const TweakColor = win.TweakColor!
  const TweakButton = win.TweakButton!
  const [t, setTweak] = win.useTweaks!(TWEAK_DEFAULTS)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--tweak-signin-bg", t.signInBg)
    root.style.setProperty("--tweak-signin-fg", t.signInFg)
    root.style.setProperty("--tweak-fab-bg", t.fabBg)
  }, [t.fabBg, t.signInBg, t.signInFg])

  return (
    <TweaksPanel>
      <TweakSection label="Sign in button" />
      <TweakColor label="Background" value={t.signInBg} options={SIGNIN_OPTIONS} onChange={(value: string) => setTweak("signInBg", value)} />
      <TweakColor label="Text" value={t.signInFg} options={["#ffffff", "#1e1e24", "#f7f8fa"]} onChange={(value: string) => setTweak("signInFg", value)} />
      <TweakSection label="fab_user icon" />
      <FabGradient value={t.fabBg} onChange={(value) => setTweak("fabBg", value)} />
      <TweakButton onClick={() => setTweak(TWEAK_DEFAULTS)}>Reset to theme defaults</TweakButton>
    </TweaksPanel>
  )
}

function FabGradient({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 10px 10px" }}>
      <div style={{ fontSize: 11, color: "#5a5a6e", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>fab_user icon</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FAB_OPTIONS.map((gradient) => {
          const active = value === gradient
          return (
            <button key={gradient} type="button" onClick={() => onChange(gradient)} title={gradient} style={{
              width: 36, height: 36, borderRadius: 8, padding: 0,
              background: gradient, cursor: "pointer",
              border: active ? "2px solid #1e1e24" : "1px solid rgba(0,0,0,0.15)",
              boxShadow: active ? "0 0 0 2px rgba(108,103,184,0.25)" : "none",
            }} />
          )
        })}
      </div>
    </div>
  )
}

interface RootProps {
  user: User
  route: Route
  navigate: (route: Route) => void
  onLogout: () => void
  tweaksUI: React.ReactNode
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
