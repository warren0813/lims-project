"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { api } from "./api"
import type { Route } from "@/components/lims/shell"

// ── Demo accounts (offline fallback) ────────────────────────────
export const ACCOUNTS: Record<string, { password: string; role: string; display: string; subtitle: string }> = {
  fab_user:    { password: 'mcv8uPKSvqz8Yru', role: 'fab_user',    display: 'fab_user',    subtitle: '廠區使用者' },
  lab_member:  { password: 't26fnPyedon6aFz', role: 'lab_member',  display: 'lab_member',  subtitle: '實驗室成員' },
  lab_manager: { password: 'eWoN48kU0QrEV8B', role: 'lab_manager', display: 'lab_manager', subtitle: '實驗室主管' },
}

// ── Auth Context ────────────────────────────────────────────────
interface AuthUser {
  username: string
  role: string
  display: string
  subtitle: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  adoptUser: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      if (!api.hasAuthSession()) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      try {
        const current = await api.auth.me()
        if (!cancelled) {
          setUser({
            username: current.username,
            role: current.role,
            display: current.username,
            subtitle: current.department || current.role,
          })
        }
      } catch {
        api.auth.clearLocal()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = username.trim()
    const result = await api.auth.login(u, password)
    const nextUser = {
      username: result.username,
      role: result.role,
      display: result.username,
      subtitle: result.department || result.role,
    }
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, adoptUser: setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ── Router Context ────────────────────────────────────────────────
interface RouterContextValue {
  route: Route
  navigate: (r: Route) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ page: 'dashboard' })

  const navigate = useCallback((r: Route) => {
    setRoute(r)
  }, [])

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterProvider')
  return ctx
}

// ── Data hooks ────────────────────────────────────────────────────

// Generic data fetching hook
export function useData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Requests hooks
export function useRequests() {
  const state = useData(() => api.requests.list(), [])
  return { ...state, data: state.data ?? [] }
}

export function useRequestDetail(id: string | number | null) {
  return useData(
    async () => id != null ? api.requests.get(String(id)) : null,
    [id]
  )
}

// Samples hooks
export function useSamples() {
  const state = useData(() => api.samples.list(), [])
  return { ...state, data: state.data ?? [] }
}

// WIP hooks
export function useWips() {
  const state = useData(() => api.wips.list(), [])
  return { ...state, data: state.data ?? [] }
}

export function useWipDetail(id: string | number | null) {
  return useData(
    async () => id != null ? api.wips.get(String(id)) : null,
    [id]
  )
}

// Dispatch hooks
export function useDispatches() {
  const state = useData(() => api.dispatches.list(), [])
  return { ...state, data: state.data ?? [] }
}

export function useDispatchDetail(id: string | number | null) {
  return useData(
    async () => id != null ? api.dispatches.get(String(id)) : null,
    [id]
  )
}

// Equipment hooks
export function useEquipment() {
  const state = useData(() => api.equipment.list(), [])
  return { ...state, data: state.data ?? [] }
}

export function useNotifications(unread?: boolean) {
  const state = useData(() => api.notifications.list(unread), [unread])
  return { ...state, data: state.data ?? [] }
}

export function useUsers() {
  const state = useData(() => api.users.list(), [])
  return { ...state, data: state.data ?? [] }
}

export function useWipProposals() {
  const state = useData(() => api.wips.proposals(), [])
  return { ...state, data: state.data ?? [] }
}

// Recipes hooks
export function useRecipes() {
  const state = useData(() => api.recipes.list(), [])
  return { ...state, data: state.data ?? [] }
}

// Experiment types hooks
export function useExperimentTypes() {
  const state = useData(() => api.experimentTypes.list(), [])
  return { ...state, data: state.data ?? [] }
}

// Dashboard data hook
export function useDashboardData() {
  const [data, setData] = useState({
    samples: [] as Awaited<ReturnType<typeof api.samples.list>>,
    wips: [] as Awaited<ReturnType<typeof api.wips.list>>,
    dispatches: [] as Awaited<ReturnType<typeof api.dispatches.list>>,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [samples, wips, dispatches] = await Promise.all([
        api.samples.list(),
        api.wips.list(),
        api.dispatches.list(),
      ])
      setData({ samples, wips, dispatches })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, loading, error, refresh }
}
