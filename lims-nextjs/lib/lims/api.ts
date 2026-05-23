// Typed LIMS API client for the Django Ninja backend.

export type ID = string

const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'
const DEFAULT_REALTIME = process.env.NEXT_PUBLIC_REALTIME_URL || `${DEFAULT_BASE}/realtime`

export interface User {
  id: number
  username: string
  role: string
  raw_role?: string
  department?: string
}

export interface ExperimentType {
  id: ID
  code: string
  name: string
  description?: string
  labCategory?: string
}

export interface SampleRow {
  id: ID
  sampleNo: string
  wafer: string
  size: string
  status: string
  raw_status?: string
  requestId?: ID
  requestNo?: string
  sampleName?: string
  lotId?: string
  materialType?: string
  hasWip?: boolean
  receivedAt?: string | null
  arrivedAt?: string | null
  created?: string | null
  urgency?: string
}

export interface RequestRow {
  id: ID
  requestNo: string
  title: string
  status: string
  raw_status?: string
  urgency: string
  priority: string
  requester?: { username: string }
  note?: string
  created: string | null
  submitted: string | null
  updated?: string | null
  sampleCount: number
  expIds: ID[]
  samples: SampleRow[]
  history: HistoryItem[]
}

export interface RequestDetail extends RequestRow {
  experiment_types: ExperimentType[]
  completed_at?: string | null
  closed_at?: string | null
  result?: Record<string, unknown> | null
}

export interface WipRow {
  id: ID
  code: string
  experimentId: ID
  experimentName: string
  recipeId: ID
  recipeName: string
  sampleCount: number
  dispatchCount: number
  samples: SampleRow[]
  status: string
  raw_status?: string
  note?: string
  created: string | null
  updated?: string | null
  completed?: string | null
  dispatches: DispatchRow[]
}

export interface DispatchRow {
  id: ID
  code: string
  wipId: ID
  wipNo?: string
  experimentId: ID
  experimentName?: string
  equipmentId: ID | null
  equipmentName?: string | null
  recipeId: ID
  recipeName?: string
  operator?: string | null
  operatorId?: number | null
  operatorDepartment?: string | null
  status: string
  raw_status?: string
  progress?: number
  currentStep?: string
  workerNode?: string
  queueName?: string
  errorMessage?: string
  dispatchedAt: string | null
  dispatchedAtIso?: string | null
  completedAt?: string | null
  completedAtIso?: string | null
  created: string | null
  estimatedDurationSeconds?: number | null
  result?: DispatchResult | null
}

export interface DispatchResult {
  summary: string
  verdict: string
  data: Record<string, unknown>
  source?: string
}

export interface EquipmentRow {
  id: ID
  name: string
  code: string
  model: string
  capacity: number
  status: string
  raw_status?: string
  progress?: number
  currentStep?: string
  currentDispatchId?: ID | null
  workerNode?: string
  lastHeartbeat?: string | null
  errorMessage?: string
  capabilities: { id: ID; name: string; recipe_code?: string; experiment_type?: string }[]
  parameters: Record<string, unknown>
}

export interface RecipeRow {
  id: ID
  code: string
  name: string
  description?: string
  experimentId: ID | null
  experimentName?: string | null
  equipmentTypeId?: ID | null
  equipmentTypeName?: string | null
  params: Record<string, unknown>
  active: boolean
  maxBatchSize?: number
}

export interface HistoryItem {
  action: string
  by: string
  at: string | null
  note?: string
}

const ROLE_MAP: Record<string, string> = {
  fab_user: 'fab_user',
  lab_member: 'lab_member',
  lab_staff: 'lab_member',
  lab_manager: 'lab_manager',
  admin: 'lab_manager',
}

const REQUEST_STATUS_MAP: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  pending_approval: 'submitted',
  approved: 'in_progress',
  sample_received: 'in_progress',
  wip_created: 'in_progress',
  dispatched: 'in_progress',
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

const SAMPLE_STATUS_MAP: Record<string, string> = {
  pending_receive: 'incoming',
  received: 'received',
  waiting_wip: 'received',
  in_wip: 'in_wip',
  dispatched: 'in_wip',
  running: 'in_wip',
  completed: 'completed',
  failed: 'rejected',
  returned: 'returned',
  scrapped: 'cancelled',
}

const DISPATCH_STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  queued: 'pending',
  assigned: 'dispatched',
  running: 'running',
  paused: 'running',
  completed: 'result_recorded',
  failed: 'exception',
  retrying: 'exception',
  cancelled: 'aborted',
}

const normalizeRole = (role: string) => ROLE_MAP[role] || role

const formatTimestamp = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function urgencyFromPriority(priority?: string) {
  if (priority === 'urgent') return '3d'
  if (priority === 'high') return '1w'
  return '2w'
}

function normalizeSampleRow(s: any): SampleRow {
  const raw = s.status || 'pending_receive'
  const mapped = SAMPLE_STATUS_MAP[raw] || raw
  return {
    id: String(s.id),
    sampleNo: s.sample_no || s.sampleNo || '',
    wafer: s.wafer_id || s.wafer || s.sample_name || s.sample_no,
    size: s.quantity ? String(s.quantity) : '1',
    status: mapped,
    raw_status: raw,
    requestId: s.request_id ? String(s.request_id) : undefined,
    requestNo: s.request_no,
    sampleName: s.sample_name,
    lotId: s.lot_id,
    materialType: s.material_type,
    hasWip: Boolean(s.current_wip_id),
    receivedAt: formatTimestamp(s.received_at),
    arrivedAt: formatTimestamp(s.received_at),
    created: formatTimestamp(s.created_at),
  }
}

function normalizeRequestRow(r: any): RequestRow {
  const raw = r.status || 'draft'
  return {
    id: String(r.id),
    requestNo: r.request_no || r.requestNo || '',
    title: r.title,
    status: REQUEST_STATUS_MAP[raw] || raw,
    raw_status: raw,
    urgency: urgencyFromPriority(r.priority),
    priority: r.priority || 'normal',
    requester: r.requester,
    note: r.description || r.manager_comment || '',
    created: formatTimestamp(r.created_at),
    submitted: formatTimestamp(r.submitted_at),
    updated: formatTimestamp(r.updated_at),
    sampleCount: r.sample_count ?? (r.samples || []).length,
    expIds: r.experiment_type?.id ? [String(r.experiment_type.id)] : [],
    samples: (r.samples || []).map(normalizeSampleRow),
    history: (r.status_history || []).map((h: any) => ({
      action: `${h.previous_status || 'created'} → ${h.new_status}`,
      by: h.actor?.username || 'system',
      at: formatTimestamp(h.created_at),
      note: h.reason,
    })),
  }
}

function normalizeRequestDetail(r: any): RequestDetail {
  const row = normalizeRequestRow(r)
  return {
    ...row,
    experiment_types: r.experiment_type ? [{
      id: String(r.experiment_type.id),
      code: r.experiment_type.code,
      name: r.experiment_type.name,
    }] : [],
    completed_at: null,
    closed_at: null,
    result: r.result,
  }
}

function normalizeWip(w: any): WipRow {
  const samples = (w.samples || []).map((s: any) => normalizeSampleRow({
    ...s,
    sample_no: s.sample_no,
    sample_name: s.sample_name,
    request_id: s.request_id,
    request_no: s.request_no,
    material_type: s.material_type,
  }))
  return {
    id: String(w.id),
    code: w.wip_no || w.code,
    experimentId: String(w.experiment_type_id || ''),
    experimentName: w.experiment_type_name || 'Experiment',
    recipeId: String(w.recipe_id || ''),
    recipeName: w.recipe_name || 'Recipe',
    sampleCount: w.sample_count ?? samples.length,
    dispatchCount: w.dispatch_count ?? 0,
    samples,
    status: w.status,
    raw_status: w.status,
    note: w.note,
    created: formatTimestamp(w.created_at),
    updated: formatTimestamp(w.updated_at),
    completed: formatTimestamp(w.completed_at),
    dispatches: (w.dispatches || []).map(normalizeDispatch),
  }
}

function normalizeDispatch(d: any): DispatchRow {
  const raw = d.status || 'pending'
  return {
    id: String(d.id),
    code: d.dispatch_no || d.code,
    wipId: String(d.wip_id),
    wipNo: d.wip_no,
    experimentId: String(d.experiment_type_id || ''),
    experimentName: d.experiment_type_name,
    equipmentId: d.equipment_id ? String(d.equipment_id) : null,
    equipmentName: d.equipment_name,
    recipeId: String(d.recipe_id || ''),
    recipeName: d.recipe_name,
    operator: d.created_by?.username || null,
    operatorId: d.created_by?.id || null,
    operatorDepartment: d.created_by?.department || null,
    status: DISPATCH_STATUS_MAP[raw] || raw,
    raw_status: raw,
    progress: d.progress ?? 0,
    currentStep: d.current_step || '',
    workerNode: d.worker_node || '',
    queueName: d.queue_name || '',
    errorMessage: d.error_message || '',
    dispatchedAt: formatTimestamp(d.queued_at || d.started_at),
    dispatchedAtIso: d.queued_at ?? d.started_at ?? null,
    completedAt: formatTimestamp(d.finished_at),
    completedAtIso: d.finished_at ?? null,
    created: formatTimestamp(d.created_at),
    result: d.result ? {
      summary: d.result.summary,
      verdict: d.result.verdict,
      data: d.result.data || {},
      source: d.result.data_source,
    } : null,
  }
}

function normalizeEquipment(e: any): EquipmentRow {
  return {
    id: String(e.id),
    code: e.equipment_code || '',
    name: e.name,
    model: e.model_name,
    capacity: e.capacity,
    status: e.status,
    raw_status: e.status,
    progress: e.progress ?? 0,
    currentStep: e.current_step || '',
    currentDispatchId: e.current_dispatch_id ? String(e.current_dispatch_id) : null,
    workerNode: e.worker_node_name || '',
    lastHeartbeat: formatTimestamp(e.last_heartbeat_at),
    errorMessage: e.error_message || '',
    capabilities: e.capabilities || [],
    parameters: {},
  }
}

function normalizeRecipe(r: any): RecipeRow {
  return {
    id: String(r.id),
    code: r.recipe_code,
    name: r.name,
    description: r.description,
    experimentId: r.experiment_type?.id ? String(r.experiment_type.id) : null,
    experimentName: r.experiment_type?.name || null,
    equipmentTypeId: r.equipment_type?.id ? String(r.equipment_type.id) : null,
    equipmentTypeName: r.equipment_type?.name || null,
    params: r.parameters || {},
    active: r.is_active,
    maxBatchSize: r.max_batch_size,
  }
}

const memStore: Record<string, string | null> = {}
const store = {
  get(k: string): string | null {
    if (typeof window === 'undefined') return memStore[k] || null
    return window.localStorage.getItem(k)
  },
  set(k: string, v: string | null) {
    if (typeof window === 'undefined') {
      if (v == null) delete memStore[k]
      else memStore[k] = v
      return
    }
    if (v == null) window.localStorage.removeItem(k)
    else window.localStorage.setItem(k, v)
  },
  clear() {
    ;['lims.access', 'lims.refresh', 'lims.user'].forEach(k => this.set(k, null))
  },
}

let refreshInflight: Promise<boolean> | null = null

async function rawFetch(path: string, opts?: RequestInit) {
  const url = path.startsWith('http') ? path : `${DEFAULT_BASE}${path}`
  const access = store.get('lims.access')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...(opts?.headers as Record<string, string> || {}),
  }
  const init: RequestInit = { ...opts, headers }
  if (init.body && typeof init.body !== 'string') {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(init.body)
  } else if (init.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  return fetch(url, init)
}

async function doRefresh(): Promise<boolean> {
  const refresh = store.get('lims.refresh')
  if (!refresh) return false
  try {
    const res = await rawFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) throw new Error()
    const out = await res.json()
    store.set('lims.access', out.access_token)
    store.set('lims.refresh', out.refresh_token)
    return true
  } catch {
    store.clear()
    return false
  }
}

async function call<T = any>(path: string, opts?: RequestInit): Promise<T> {
  let res = await rawFetch(path, opts)
  if (res.status === 401 && store.get('lims.refresh') && path !== '/auth/refresh') {
    if (!refreshInflight) refreshInflight = doRefresh()
    const refreshed = await refreshInflight
    refreshInflight = null
    if (refreshed) res = await rawFetch(path, opts)
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      detail = body?.detail || JSON.stringify(body)
    } catch {}
    const err = new Error(detail) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null as T
  const ct = res.headers.get('Content-Type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text() as T
}

export const api = {
  base: DEFAULT_BASE,
  realtimeBase: DEFAULT_REALTIME,
  token: () => store.get('lims.access'),

  auth: {
    async login(username: string, password: string): Promise<User> {
      const out = await call<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      store.set('lims.access', out.access_token)
      store.set('lims.refresh', out.refresh_token)
      const user = {
        id: out.id,
        username: out.username,
        role: normalizeRole(out.role),
        raw_role: out.role,
        department: out.department,
      }
      store.set('lims.user', JSON.stringify(user))
      return user
    },
    async logout(): Promise<void> {
      const refresh = store.get('lims.refresh')
      try {
        if (refresh) await call('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) })
      } finally {
        store.clear()
      }
    },
    async me(): Promise<User> {
      const out = await call<any>('/auth/me')
      return {
        id: out.id,
        username: out.username,
        role: normalizeRole(out.role),
        raw_role: out.role,
        department: out.department,
      }
    },
    cachedUser(): User | null {
      try {
        const raw = store.get('lims.user')
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
  },

  experimentTypes: {
    async list(q: Record<string, string> = {}): Promise<ExperimentType[]> {
      const out = await call<any[]>(`/experiment-types/?${new URLSearchParams(q)}`)
      return out.map(e => ({
        id: String(e.id),
        code: e.code,
        name: e.name,
        description: e.description,
        labCategory: e.lab_category,
      }))
    },
  },

  equipment: {
    async list(q: Record<string, string> = {}): Promise<EquipmentRow[]> {
      const out = await call<any[]>(`/equipment/?${new URLSearchParams(q)}`)
      return out.map(normalizeEquipment)
    },
    async create(payload: any): Promise<EquipmentRow> {
      return normalizeEquipment(await call<any>('/equipment/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async update(id: ID, payload: any): Promise<EquipmentRow> {
      return normalizeEquipment(await call<any>(`/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }))
    },
  },

  recipes: {
    async list(q: Record<string, string> = {}): Promise<RecipeRow[]> {
      const out = await call<any[]>(`/recipes/?${new URLSearchParams(q)}`)
      return out.map(normalizeRecipe)
    },
    async create(payload: any): Promise<RecipeRow> {
      return normalizeRecipe(await call<any>('/recipes/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async update(id: ID, payload: any): Promise<RecipeRow> {
      return normalizeRecipe(await call<any>(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }))
    },
    async remove(id: ID): Promise<void> {
      await call<any>(`/recipes/${id}`, { method: 'DELETE' })
    },
  },

  requests: {
    async list(q: Record<string, string> = {}): Promise<RequestRow[]> {
      const out = await call<any[]>(`/requests/?${new URLSearchParams(q)}`)
      return out.map(normalizeRequestRow)
    },
    async my(): Promise<RequestRow[]> {
      const out = await call<any[]>('/requests/my')
      return out.map(normalizeRequestRow)
    },
    async get(id: ID): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}`))
    },
    async create(payload: any): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>('/requests/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async createDraft(payload: any): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>('/requests/drafts', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async update(id: ID, payload: any): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }))
    },
    async submit(id: ID): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/submit`, { method: 'POST' }))
    },
    async approve(id: ID, payload: any = {}): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) }))
    },
    async reject(id: ID, comment: string): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }))
    },
    async cancel(id: ID, reason = 'Cancelled by user'): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }))
    },
  },

  samples: {
    async list(q: Record<string, string> = {}): Promise<SampleRow[]> {
      const out = await call<any[]>(`/samples/?${new URLSearchParams(q)}`)
      return out.map(normalizeSampleRow)
    },
    async get(id: ID): Promise<SampleRow> {
      return normalizeSampleRow(await call<any>(`/samples/${id}`))
    },
    async receive(id: ID, payload: any = {}): Promise<SampleRow> {
      return normalizeSampleRow(await call<any>(`/samples/${id}/receive`, { method: 'POST', body: JSON.stringify(payload) }))
    },
    async reject(id: ID, reason: string): Promise<SampleRow> {
      return normalizeSampleRow(await call<any>(`/samples/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'returned', reason }) }))
    },
  },

  wips: {
    async list(q: Record<string, string> = {}): Promise<WipRow[]> {
      const out = await call<any[]>(`/wip/?${new URLSearchParams(q)}`)
      return out.map(normalizeWip)
    },
    async get(id: ID): Promise<WipRow> {
      return normalizeWip(await call<any>(`/wip/${id}`))
    },
    async create(payload: { sample_ids: ID[]; recipe_id: ID; priority?: string; note?: string }): Promise<WipRow> {
      return normalizeWip(await call<any>('/wip/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async autoCreate(): Promise<WipRow[]> {
      const out = await call<any[]>('/wip/auto-create', { method: 'POST', body: JSON.stringify({}) })
      return out.map(normalizeWip)
    },
    async lock(id: ID): Promise<WipRow> {
      return normalizeWip(await call<any>(`/wip/${id}/lock`, { method: 'POST' }))
    },
    async cancel(id: ID): Promise<WipRow> {
      return normalizeWip(await call<any>(`/wip/${id}/cancel`, { method: 'POST' }))
    },
    async createDispatch(wipId: ID, payload: { equipment_id?: ID; equipmentId?: ID; simulate_failure?: boolean }): Promise<DispatchRow> {
      return api.dispatches.create({
        wip_id: wipId,
        equipment_id: payload.equipment_id ?? payload.equipmentId,
        simulate_failure: payload.simulate_failure,
      })
    },
  },

  dispatches: {
    async list(q: Record<string, string> = {}): Promise<DispatchRow[]> {
      const out = await call<any[]>(`/dispatches/?${new URLSearchParams(q)}`)
      return out.map(normalizeDispatch)
    },
    async get(id: ID): Promise<DispatchRow> {
      return normalizeDispatch(await call<any>(`/dispatches/${id}`))
    },
    async create(payload: { wip_id: ID; equipment_id?: ID; simulate_failure?: boolean }): Promise<DispatchRow> {
      return normalizeDispatch(await call<any>('/dispatches/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async retry(id: ID, simulate_failure = false): Promise<DispatchRow> {
      return normalizeDispatch(await call<any>(`/dispatches/${id}/retry`, { method: 'POST', body: JSON.stringify({ simulate_failure }) }))
    },
    async cancel(id: ID): Promise<DispatchRow> {
      return normalizeDispatch(await call<any>(`/dispatches/${id}/cancel`, { method: 'POST' }))
    },
    async logs(id: ID) {
      return call<any[]>(`/dispatches/${id}/logs`)
    },
    eventUrl(id: ID) {
      const token = store.get('lims.access')
      return `${DEFAULT_REALTIME}/dispatches/${id}/events?token=${encodeURIComponent(token || '')}`
    },
  },

  reports: {
    async summary() {
      return call<any>('/reports/summary')
    },
    async equipmentUtilization() {
      return call<any>('/reports/equipment-utilization')
    },
    async requestStatistics() {
      return call<any>('/reports/request-statistics')
    },
    async throughput() {
      return call<any>('/reports/throughput')
    },
  },

  realtime: {
    equipmentEventsUrl() {
      const token = store.get('lims.access')
      return `${DEFAULT_REALTIME}/equipment/events?token=${encodeURIComponent(token || '')}`
    },
  },
}

export default api
