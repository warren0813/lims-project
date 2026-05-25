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

export interface BootstrapStatus {
  needsBootstrap: boolean
  userCount: number
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
  rawStatus?: string
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
  expIds?: ID[]
  experiments?: SampleExperimentRow[]
  experimentProgress?: ProgressSummary
  safeToClose?: boolean
  latestDispatchId?: ID | null
  finalReviewDispatchId?: ID | null
}

export interface SampleExperimentRow {
  id: ID
  experimentTypeId: ID
  experimentTypeName: string
  recipeId?: ID | null
  recipeName?: string | null
  status: string
  sequence: number
  currentWipId?: ID | null
  startedAt?: string | null
  completedAt?: string | null
}

export interface RequestRow {
  id: ID
  requestNo: string
  title: string
  displayTitle?: string
  groupKey?: string
  status: string
  raw_status?: string
  rawStatus?: string
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
  experimentProgress?: ProgressSummary
  waferProgress?: WaferProgressSummary
  safeToClose?: boolean
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
  experimentProgress?: ProgressSummary
  safeToClose?: boolean
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
  metrics?: Record<string, unknown>
  waferCount?: number
  workerNode?: string
  queueName?: string
  errorMessage?: string
  dispatchedAt: string | null
  dispatchedAtIso?: string | null
  completedAt?: string | null
  completedAtIso?: string | null
  finalConfirmedAt?: string | null
  finalConfirmationNotes?: string
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

export interface ProgressSummary {
  total: number
  completed: number
  failed?: number
  active?: number
  pending: number
  percent: number
  allDone?: boolean
  hasFailed?: boolean
}

export interface WaferProgressSummary {
  total: number
  completed: number
  pending: number
  percent: number
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
  metrics?: Record<string, unknown>
  waferCount?: number
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

export interface NotificationRow {
  id: number
  type: string
  title: string
  body: string
  relatedEntityType: string
  relatedEntityId: string
  relatedRequestId?: string | null
  relatedRequestNo?: string | null
  relatedSampleId?: string | null
  relatedSampleNo?: string | null
  read: boolean
  createdAt: string | null
}

export interface UserAdminRow {
  id: number
  username: string
  email: string
  role: string
  department: string
  isActive: boolean
  isStaff: boolean
  dateJoined: string
}

export interface ProposalItemRow {
  id: ID
  sampleId: ID
  sampleNo: string
  sampleStatus?: string
  requestId: ID
  requestNo: string
  fabUser: string
  priority: string
  order: number
  reason: string
}

export interface ProposalBatchRow {
  id: ID
  experimentTypeId: ID
  experimentTypeName: string
  recipeId: ID
  recipeName: string
  equipmentTypeId: ID
  equipmentTypeName: string
  equipmentId: ID | null
  equipmentName: string | null
  equipmentCapacity?: number | null
  equipmentStatus?: string | null
  equipmentQueueName?: string | null
  recipeMaxBatchSize?: number
  priority: string
  order: number
  estimatedRuntimeSec: number
  reason: string
  warnings: string[]
  items: ProposalItemRow[]
}

export interface ProposalRow {
  id: ID
  proposalNo: string
  status: string
  source: string
  warnings: string[]
  note: string
  estimatedTotalRuntimeSec: number
  batches: ProposalBatchRow[]
  created: string | null
  updated: string | null
}

export interface HistoryItem {
  action: string
  by: string
  at: string | null
  note?: string
}

const ROLE_MAP: Record<string, string> = {
  fab_user: 'fab_user',
  lab_user: 'lab_user',
  lab_member: 'lab_user',
  lab_staff: 'lab_user',
  lab_manager: 'lab_manager',
  admin: 'lab_manager',
}

const REQUEST_STATUS_MAP: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  waiting_approval: 'submitted',
  pending_approval: 'submitted',
  approved: 'waiting_sample_receive',
  waiting_sample_receive: 'waiting_sample_receive',
  received: 'in_progress',
  sample_received: 'in_progress',
  in_wip: 'in_progress',
  wip_created: 'in_progress',
  queued: 'in_progress',
  dispatched: 'in_progress',
  running: 'in_progress',
  final_check: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

const SAMPLE_STATUS_MAP: Record<string, string> = {
  pending_receive: 'incoming',
  received: 'received',
  waiting_wip: 'received',
  rejected: 'rejected',
  in_wip: 'in_wip',
  queued: 'in_wip',
  dispatched: 'in_wip',
  running: 'in_wip',
  completed: 'completed',
  failed: 'rejected',
  returned: 'returned',
  scrapped: 'cancelled',
}

const DISPATCH_STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  queued: 'ready_for_dispatch',
  assigned: 'dispatched',
  running: 'running',
  paused: 'running',
  completed: 'completed',
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

function priorityFromUrgency(urgency?: string) {
  if (urgency === '3d') return 'urgent'
  if (urgency === '1w') return 'high'
  return 'normal'
}

function normalizeRequestPayload(payload: any) {
  const experimentTypeId = payload.experiment_type_id
    ?? payload.experimentTypeId
    ?? payload.experiment_type_ids?.[0]
    ?? payload.experimentTypeIds?.[0]
    ?? (payload.samples || []).flatMap((sample: any) => sample.expIds || sample.experimentTypeIds || sample.experiment_type_ids || [])[0]
  return {
    title: payload.title,
    description: payload.description ?? payload.note ?? '',
    department: payload.department ?? 'Fab Operations',
    project_code: payload.project_code ?? payload.projectCode ?? '',
    priority: payload.priority ?? priorityFromUrgency(payload.urgency),
    experiment_type_id: experimentTypeId,
    preferred_recipe_id: payload.preferred_recipe_id ?? payload.preferredRecipeId ?? null,
    material_type: payload.material_type ?? payload.materialType ?? 'Silicon',
    target_measurement: payload.target_measurement ?? payload.targetMeasurement ?? '',
    expected_output_format: payload.expected_output_format ?? payload.expectedOutputFormat ?? 'json',
    special_instruction: payload.special_instruction ?? payload.specialInstruction ?? '',
    safety_rules_confirmed: payload.safety_rules_confirmed ?? payload.safetyRulesConfirmed ?? true,
    required_completion_date: payload.required_completion_date ?? payload.requiredCompletionDate ?? null,
    samples: (payload.samples || []).map((sample: any, index: number) => ({
      sample_name: sample.sample_name ?? sample.sampleName ?? sample.wafer_id ?? sample.wafer ?? `Sample ${index + 1}`,
      lot_id: sample.lot_id ?? sample.lotId ?? payload.project_code ?? payload.projectCode ?? 'LOT',
      wafer_id: sample.wafer_id ?? sample.waferId ?? sample.wafer ?? '',
      material_type: sample.material_type ?? sample.materialType ?? payload.material_type ?? payload.materialType ?? 'Silicon',
      quantity: sample.quantity ?? 1,
      description: sample.description ?? '',
      handling_notes: sample.handling_notes ?? sample.handlingNotes ?? '',
      experiment_type_ids: sample.experiment_type_ids ?? sample.experimentTypeIds ?? sample.expIds ?? [experimentTypeId].filter(Boolean),
    })),
  }
}

function normalizeSampleRow(s: any): SampleRow {
  const raw = s.status || 'pending_receive'
  const mapped = SAMPLE_STATUS_MAP[raw] || raw
  const experiments = (s.experiments || []).map(normalizeSampleExperiment)
  return {
    id: String(s.id),
    sampleNo: s.sample_no || s.sampleNo || '',
    wafer: s.wafer_id || s.wafer || s.sample_name || s.sample_no,
    size: s.quantity ? String(s.quantity) : '1',
    status: mapped,
    raw_status: raw,
    rawStatus: raw,
    requestId: s.request_id ? String(s.request_id) : undefined,
    requestNo: s.request_no,
    sampleName: s.sample_name,
    lotId: s.lot_id,
    materialType: s.material_type,
    hasWip: Boolean(s.current_wip_id),
    receivedAt: formatTimestamp(s.received_at),
    arrivedAt: formatTimestamp(s.received_at),
    created: formatTimestamp(s.created_at),
    expIds: experiments.map((item: SampleExperimentRow) => item.experimentTypeId),
    experiments,
    experimentProgress: normalizeProgress(s.experiment_progress, experiments),
    safeToClose: Boolean(s.safe_to_close),
    latestDispatchId: s.latest_dispatch_id ? String(s.latest_dispatch_id) : null,
    finalReviewDispatchId: s.final_review_dispatch_id ? String(s.final_review_dispatch_id) : null,
  }
}

function normalizeSampleExperiment(e: any): SampleExperimentRow {
  const experiment = e.experiment_type || {}
  const recipe = e.recipe || {}
  return {
    id: String(e.id),
    experimentTypeId: String(e.experiment_type_id ?? experiment.id ?? ''),
    experimentTypeName: e.experiment_type_name ?? experiment.name ?? '',
    recipeId: e.recipe_id ? String(e.recipe_id) : recipe.id ? String(recipe.id) : null,
    recipeName: e.recipe_name ?? recipe.name ?? null,
    status: e.status || 'pending',
    sequence: Number(e.sequence || 0),
    currentWipId: e.current_wip_id ? String(e.current_wip_id) : null,
    startedAt: formatTimestamp(e.started_at),
    completedAt: formatTimestamp(e.completed_at),
  }
}

function normalizeSampleExperimentStatus(status: string): string {
  if (status === 'completed') return 'done'
  if (status === 'in_wip' || status === 'running') return 'running'
  if (status === 'failed') return 'failed'
  return 'pending'
}

function normalizeProgress(progress: any, experiments: SampleExperimentRow[] = []): ProgressSummary {
  if (progress) {
    return {
      total: Number(progress.total || 0),
      completed: Number(progress.completed || 0),
      failed: Number(progress.failed || 0),
      active: Number(progress.active || 0),
      pending: Number(progress.pending || 0),
      percent: Number(progress.percent || 0),
      allDone: Boolean(progress.all_done ?? progress.allDone),
      hasFailed: Boolean(progress.has_failed ?? progress.hasFailed),
    }
  }
  const total = experiments.length
  const completed = experiments.filter((item) => item.status === 'completed').length
  const failed = experiments.filter((item) => item.status === 'failed').length
  const active = experiments.filter((item) => item.status === 'in_wip' || item.status === 'running').length
  return {
    total,
    completed,
    failed,
    active,
    pending: Math.max(total - completed - failed - active, 0),
    percent: total ? Math.round((completed / total) * 100) : 0,
    allDone: total > 0 && completed === total,
    hasFailed: failed > 0,
  }
}

function normalizeWaferProgress(progress: any, samples: SampleRow[] = []): WaferProgressSummary {
  if (progress) {
    return {
      total: Number(progress.total || 0),
      completed: Number(progress.completed || 0),
      pending: Number(progress.pending || 0),
      percent: Number(progress.percent || 0),
    }
  }
  const total = samples.length
  const completed = samples.filter((sample) => sample.safeToClose).length
  return {
    total,
    completed,
    pending: Math.max(total - completed, 0),
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}

function normalizeRequestRow(r: any): RequestRow {
  const raw = r.status || 'draft'
  const displayTitle = String(r.title || '').replace(/\s*[·•]\s*\d+\/\d+\s*$/, '').trim()
  const groupDay = formatTimestamp(r.created_at)?.slice(0, 10) || ''
  const requesterName = r.requester?.username || ''
  const samples = (r.samples || []).map(normalizeSampleRow)
  return {
    id: String(r.id),
    requestNo: r.request_no || r.requestNo || '',
    title: r.title,
    displayTitle,
    groupKey: `${requesterName}|${displayTitle.toLowerCase()}|${groupDay}`,
    status: REQUEST_STATUS_MAP[raw] || raw,
    raw_status: raw,
    rawStatus: raw,
    urgency: urgencyFromPriority(r.priority),
    priority: r.priority || 'normal',
    requester: r.requester,
    note: r.description || r.manager_comment || '',
    created: formatTimestamp(r.created_at),
    submitted: formatTimestamp(r.submitted_at),
    updated: formatTimestamp(r.updated_at),
    sampleCount: r.sample_count ?? (r.samples || []).length,
    expIds: (r.experiment_types?.length ? r.experiment_types : r.experiment_type ? [r.experiment_type] : []).map((e: any) => String(e.id)),
    samples,
    experimentProgress: normalizeProgress(r.experiment_progress, samples.flatMap((sample: SampleRow) => sample.experiments || [])),
    waferProgress: normalizeWaferProgress(r.wafer_progress, samples),
    safeToClose: Boolean(r.safe_to_close),
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
    experiment_types: (r.experiment_types?.length ? r.experiment_types : r.experiment_type ? [r.experiment_type] : []).map((e: any) => ({
      id: String(e.id),
      code: e.code,
      name: e.name,
    })),
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
    experimentProgress: normalizeProgress(w.experiment_progress, samples.flatMap((sample: SampleRow) => sample.experiments || [])),
    safeToClose: Boolean(w.safe_to_close),
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
    metrics: d.metrics || {},
    waferCount: d.wafer_count ?? 0,
    workerNode: d.worker_node || '',
    queueName: d.queue_name || '',
    errorMessage: d.error_message || '',
    dispatchedAt: formatTimestamp(d.queued_at || d.started_at),
    dispatchedAtIso: d.queued_at ?? d.started_at ?? null,
    completedAt: formatTimestamp(d.finished_at),
    completedAtIso: d.finished_at ?? null,
    finalConfirmedAt: formatTimestamp(d.final_confirmed_at),
    finalConfirmationNotes: d.final_confirmation_notes || '',
    created: formatTimestamp(d.created_at),
    result: d.result ? {
      summary: d.result.summary,
      verdict: d.result.verdict,
      data: d.result.data || {},
      source: d.result.data_source,
    } : null,
  }
}

function normalizeNotification(n: any): NotificationRow {
  return {
    id: Number(n.id),
    type: n.notification_type,
    title: n.title,
    body: n.body || '',
    relatedEntityType: n.related_entity_type || '',
    relatedEntityId: n.related_entity_id || '',
    relatedRequestId: n.related_request_id ? String(n.related_request_id) : null,
    relatedRequestNo: n.related_request_no || null,
    relatedSampleId: n.related_sample_id ? String(n.related_sample_id) : null,
    relatedSampleNo: n.related_sample_no || null,
    read: Boolean(n.is_read),
    createdAt: formatTimestamp(n.created_at),
  }
}

function normalizeUserAdmin(u: any): UserAdminRow {
  return {
    id: Number(u.id),
    username: u.username,
    email: u.email || '',
    role: normalizeRole(u.role),
    department: u.department || '',
    isActive: Boolean(u.is_active),
    isStaff: Boolean(u.is_staff),
    dateJoined: u.date_joined || '',
  }
}

function normalizeProposal(p: any): ProposalRow {
  return {
    id: String(p.id),
    proposalNo: p.proposal_no,
    status: p.status,
    source: p.source,
    warnings: p.warnings || [],
    note: p.note || '',
    estimatedTotalRuntimeSec: p.estimated_total_runtime_sec || 0,
    batches: (p.batches || []).map((b: any) => ({
      id: String(b.id),
      experimentTypeId: String(b.experiment_type_id),
      experimentTypeName: b.experiment_type_name,
      recipeId: String(b.recipe_id),
      recipeName: b.recipe_name,
      equipmentTypeId: String(b.equipment_type_id),
      equipmentTypeName: b.equipment_type_name,
      equipmentId: b.equipment_id ? String(b.equipment_id) : null,
      equipmentName: b.equipment_name || null,
      equipmentCapacity: b.equipment_capacity ?? null,
      equipmentStatus: b.equipment_status || null,
      equipmentQueueName: b.equipment_queue_name || null,
      recipeMaxBatchSize: b.recipe_max_batch_size,
      priority: b.priority,
      order: b.order,
      estimatedRuntimeSec: b.estimated_runtime_sec,
      reason: b.reason || '',
      warnings: b.warnings || [],
      items: (b.items || []).map((item: any) => ({
        id: String(item.id),
        sampleId: String(item.sample_id),
        sampleNo: item.sample_no,
        sampleStatus: item.sample_status,
        requestId: String(item.request_id),
        requestNo: item.request_no,
        fabUser: item.fab_user,
        priority: item.priority,
        order: item.order,
        reason: item.reason || '',
      })),
    })),
    created: formatTimestamp(p.created_at),
    updated: formatTimestamp(p.updated_at),
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
    metrics: e.metrics || {},
    waferCount: e.wafer_count ?? 0,
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
    return window.sessionStorage.getItem(k)
  },
  set(k: string, v: string | null) {
    if (typeof window === 'undefined') {
      if (v == null) delete memStore[k]
      else memStore[k] = v
      return
    }
    if (v == null) window.sessionStorage.removeItem(k)
    else window.sessionStorage.setItem(k, v)
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
  hasAuthSession: () => Boolean(store.get('lims.access') || store.get('lims.refresh')),

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
    async bootstrapStatus(): Promise<BootstrapStatus> {
      const out = await call<any>('/auth/bootstrap-status')
      return {
        needsBootstrap: Boolean(out.needs_bootstrap),
        userCount: Number(out.user_count || 0),
      }
    },
    async bootstrapManager(payload: { username: string; password: string; email?: string; department?: string }): Promise<User> {
      const out = await call<any>('/auth/bootstrap-manager', {
        method: 'POST',
        body: JSON.stringify(payload),
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
    async me(): Promise<User> {
      if (!api.hasAuthSession()) {
        throw new Error('No authenticated session')
      }
      const out = await call<any>('/auth/me')
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
    clearLocal() {
      store.clear()
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
    async create(payload: any): Promise<ExperimentType> {
      const out = await call<any>('/experiment-types/', {
        method: 'POST',
        body: JSON.stringify({
          code: payload.code,
          name: payload.name,
          description: payload.description || '',
          lab_category: payload.lab_category || payload.labCategory || 'MA',
        }),
      })
      return {
        id: String(out.id),
        code: out.code,
        name: out.name,
        description: out.description,
        labCategory: out.lab_category,
      }
    },
  },

  equipment: {
    types: {
      async list(): Promise<any[]> {
        return call<any[]>('/equipment/types')
      },
      async create(payload: any): Promise<any> {
        return call<any>('/equipment/types', {
          method: 'POST',
          body: JSON.stringify({
            code: payload.code,
            name: payload.name,
            queue_name: payload.queue_name || payload.queueName || 'queue.probe',
            description: payload.description || '',
          }),
        })
      },
    },
    async list(q: Record<string, string> = {}): Promise<EquipmentRow[]> {
      const out = await call<any[]>(`/equipment/?${new URLSearchParams(q)}`)
      return out.map(normalizeEquipment)
    },
    async create(payload: any): Promise<EquipmentRow> {
      return normalizeEquipment(await call<any>('/equipment/', {
        method: 'POST',
        body: JSON.stringify({
          equipment_code: payload.equipment_code ?? payload.equipmentCode,
          name: payload.name,
          model_name: payload.model_name ?? payload.modelName ?? payload.model,
          equipment_type_id: payload.equipment_type_id ?? payload.equipmentTypeId,
          capacity: payload.capacity,
          location: payload.location || '',
          recipe_ids: payload.recipe_ids ?? payload.recipeIds ?? [],
        }),
      }))
    },
    async update(id: ID, payload: any): Promise<EquipmentRow> {
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.model_name !== undefined || payload.modelName !== undefined || payload.model !== undefined) {
        body.model_name = payload.model_name ?? payload.modelName ?? payload.model
      }
      if (payload.capacity !== undefined) body.capacity = payload.capacity
      if (payload.status !== undefined) body.status = payload.status === 'available' ? 'idle' : payload.status
      if (payload.is_active !== undefined) body.is_active = payload.is_active
      if (payload.location !== undefined) body.location = payload.location
      if (payload.recipe_ids !== undefined || payload.recipeIds !== undefined || payload.capability_recipe_ids !== undefined) {
        body.recipe_ids = payload.recipe_ids ?? payload.recipeIds ?? payload.capability_recipe_ids
      }
      return normalizeEquipment(await call<any>(`/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(body) }))
    },
  },

  recipes: {
    async list(q: Record<string, string> = {}): Promise<RecipeRow[]> {
      const out = await call<any[]>(`/recipes/?${new URLSearchParams(q)}`)
      return out.map(normalizeRecipe)
    },
    async create(payload: any): Promise<RecipeRow> {
      return normalizeRecipe(await call<any>('/recipes/', {
        method: 'POST',
        body: JSON.stringify({
          recipe_code: payload.recipe_code ?? payload.recipeCode,
          name: payload.name,
          description: payload.description || '',
          experiment_type_id: payload.experiment_type_id ?? payload.experimentTypeId,
          equipment_type_id: payload.equipment_type_id ?? payload.equipmentTypeId,
          parameters: payload.parameters ?? payload.params ?? {},
          estimated_runtime_sec: payload.estimated_runtime_sec ?? payload.estimatedRuntimeSec ?? 60,
          max_batch_size: payload.max_batch_size ?? payload.maxBatchSize ?? 10,
          material_constraints: payload.material_constraints ?? payload.materialConstraints ?? {},
          safety_constraints: payload.safety_constraints ?? payload.safetyConstraints ?? {},
          version: payload.version ?? 1,
        }),
      }))
    },
    async update(id: ID, payload: any): Promise<RecipeRow> {
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.description !== undefined) body.description = payload.description
      if (payload.parameters !== undefined || payload.params !== undefined) body.parameters = payload.parameters ?? payload.params
      if (payload.estimated_runtime_sec !== undefined || payload.estimatedRuntimeSec !== undefined) {
        body.estimated_runtime_sec = payload.estimated_runtime_sec ?? payload.estimatedRuntimeSec
      }
      if (payload.max_batch_size !== undefined || payload.maxBatchSize !== undefined) {
        body.max_batch_size = payload.max_batch_size ?? payload.maxBatchSize
      }
      if (payload.material_constraints !== undefined || payload.materialConstraints !== undefined) {
        body.material_constraints = payload.material_constraints ?? payload.materialConstraints
      }
      if (payload.safety_constraints !== undefined || payload.safetyConstraints !== undefined) {
        body.safety_constraints = payload.safety_constraints ?? payload.safetyConstraints
      }
      if (payload.is_active !== undefined) body.is_active = payload.is_active
      return normalizeRecipe(await call<any>(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }))
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
      return normalizeRequestDetail(await call<any>('/requests/drafts', { method: 'POST', body: JSON.stringify(normalizeRequestPayload(payload)) }))
    },
    async createMany(payload: any): Promise<RequestDetail[]> {
      return [await api.requests.createDraft(payload)]
    },
    async createDraft(payload: any): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>('/requests/drafts', { method: 'POST', body: JSON.stringify(normalizeRequestPayload(payload)) }))
    },
    async update(id: ID, payload: any): Promise<RequestDetail> {
      const body = normalizeRequestPayload(payload)
      return normalizeRequestDetail(await call<any>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({
        title: body.title,
        description: body.description,
        department: body.department,
        project_code: body.project_code,
        priority: body.priority,
        preferred_recipe_id: body.preferred_recipe_id,
        required_completion_date: body.required_completion_date,
        target_measurement: body.target_measurement,
        expected_output_format: body.expected_output_format,
        special_instruction: body.special_instruction,
        safety_rules_confirmed: body.safety_rules_confirmed,
      }) }))
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
    async moreInfo(id: ID, comment: string): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/more-info`, { method: 'POST', body: JSON.stringify({ comment }) }))
    },
    async cancel(id: ID, reason = 'Cancelled by user'): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }))
    },
    async close(id: ID, reason = 'Final review complete'): Promise<RequestDetail> {
      return normalizeRequestDetail(await call<any>(`/requests/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) }))
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
    async getExperiments(id: ID): Promise<any[]> {
      const sample = normalizeSampleRow(await call<any>(`/samples/${id}`))
      return (sample.experiments || []).map((experiment) => ({
        ...experiment,
        experimentName: experiment.experimentTypeName,
        status: normalizeSampleExperimentStatus(experiment.status),
        verdict: experiment.status === 'failed' ? 'fail' : experiment.status === 'completed' ? 'pass' : null,
        dispatchId: experiment.currentWipId,
        result: null,
      }))
    },
    async receive(id: ID, payload: any = {}): Promise<SampleRow> {
      return normalizeSampleRow(await call<any>(`/samples/${id}/receive`, { method: 'POST', body: JSON.stringify(payload) }))
    },
    async reject(id: ID, reason: string): Promise<SampleRow> {
      return normalizeSampleRow(await call<any>(`/samples/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment: reason }) }))
    },
    async rejectReceiving(id: ID, reason: string): Promise<SampleRow> {
      return api.samples.reject(id, reason)
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
    async autoPropose(maxBatches?: number): Promise<ProposalRow> {
      const out = await call<any>('/wip/auto-propose', {
        method: 'POST',
        body: JSON.stringify(maxBatches ? { max_batches: maxBatches } : {}),
      })
      return normalizeProposal(out)
    },
    async proposals(): Promise<ProposalRow[]> {
      const out = await call<any[]>('/wip/proposals')
      return out.map(normalizeProposal)
    },
    async getProposal(id: ID): Promise<ProposalRow> {
      return normalizeProposal(await call<any>(`/wip/proposals/${id}`))
    },
    async updateProposalBatch(proposalId: ID, batchId: ID, payload: any): Promise<ProposalRow> {
      return normalizeProposal(await call<any>(`/wip/proposals/${proposalId}/batches/${batchId}`, { method: 'PATCH', body: JSON.stringify(payload) }))
    },
    async removeProposalItem(proposalId: ID, itemId: ID): Promise<ProposalRow> {
      return normalizeProposal(await call<any>(`/wip/proposals/${proposalId}/items/${itemId}`, { method: 'DELETE' }))
    },
    async confirmProposal(id: ID): Promise<WipRow[]> {
      const out = await call<any[]>(`/wip/proposals/${id}/confirm`, { method: 'POST' })
      return out.map(normalizeWip)
    },
    async cancelProposal(id: ID): Promise<ProposalRow> {
      return normalizeProposal(await call<any>(`/wip/proposals/${id}/cancel`, { method: 'POST' }))
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
    async finalConfirm(id: ID, notes = ''): Promise<DispatchRow> {
      return normalizeDispatch(await call<any>(`/dispatches/${id}/final-confirm`, { method: 'POST', body: JSON.stringify({ notes }) }))
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
    async equipmentUtilization(q: Record<string, string> = {}) {
      const out = await call<any>(`/reports/equipment-utilization?${new URLSearchParams(q)}`)
      return {
        ...out,
        data: (out.data || []).map((row: any) => ({
          ...row,
          equipment: {
            id: row.equipment_id,
            name: row.equipment_name,
          },
          wip_count: row.dispatch_count ?? 0,
          sample_count: row.completed_count ?? 0,
        })),
      }
    },
    async requestStatistics(q: Record<string, string> = {}) {
      const out = await call<any>(`/reports/request-statistics?${new URLSearchParams(q)}`)
      return {
        ...out,
        total_requests: out.total_requests ?? out.total ?? 0,
        status_distribution: out.status_distribution ?? out.distribution ?? {},
      }
    },
    async throughput() {
      return call<any>('/reports/throughput')
    },
    csvUrl() {
      const token = store.get('lims.access')
      return `${DEFAULT_BASE}/reports/results.csv?token=${encodeURIComponent(token || '')}`
    },
    async downloadCsv(): Promise<Blob> {
      const res = await rawFetch('/reports/results.csv')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.blob()
    },
    async pdfCapability() {
      return call<any>('/reports/results.pdf')
    },
  },

  notifications: {
    async list(unread?: boolean): Promise<NotificationRow[]> {
      const q = unread == null ? '' : `?${new URLSearchParams({ unread: String(unread) })}`
      const out = await call<any[]>(`/notifications/${q}`)
      return out.map(normalizeNotification)
    },
    async unreadCount(): Promise<number> {
      const out = await call<any>('/notifications/unread-count')
      return Number(out.count || 0)
    },
    async markRead(id: number): Promise<NotificationRow> {
      return normalizeNotification(await call<any>(`/notifications/${id}/read`, { method: 'POST' }))
    },
    async markAllRead(): Promise<{ updated: number }> {
      return call<any>('/notifications/mark-all-read', { method: 'POST' })
    },
  },

  users: {
    async list(q: Record<string, string> = {}): Promise<UserAdminRow[]> {
      const out = await call<any[]>(`/users/?${new URLSearchParams(q)}`)
      return out.map(normalizeUserAdmin)
    },
    async create(payload: any): Promise<UserAdminRow> {
      return normalizeUserAdmin(await call<any>('/users/', { method: 'POST', body: JSON.stringify(payload) }))
    },
    async update(id: number, payload: any): Promise<UserAdminRow> {
      return normalizeUserAdmin(await call<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }))
    },
    async resetPassword(id: number): Promise<{ detail: string }> {
      return call<any>(`/users/${id}/reset-password`, { method: 'POST' })
    },
  },

  realtime: {
    equipmentEventsUrl() {
      const token = store.get('lims.access')
      return `${DEFAULT_REALTIME}/equipment/events?token=${encodeURIComponent(token || '')}`
    },
  },
}

export const authApi = api.auth
export const requestApi = api.requests
export const sampleApi = api.samples
export const wipApi = api.wips
export const dispatchApi = api.dispatches
export const equipmentApi = api.equipment
export const recipeApi = api.recipes
export const reportApi = api.reports
export const notificationApi = api.notifications
export const userApi = api.users

export default api
