import { api } from "@/lib/lims/api"

type AnyRecord = Record<string, any>

async function safeGet<T>(fallback: T, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch {
    return fallback
  }
}

const slug = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32)

async function getOrCreateDefaultEquipmentType(experimentName = "General") {
  const types = await safeGet<any[]>([], () => api.equipment.types.list())
  const code = `${slug(experimentName) || "GENERAL"}_TOOL`
  const existing = types.find((item) => item.code === code) || types[0]
  if (existing) return existing
  return api.equipment.types.create({
    code,
    name: `${experimentName} Tool`,
    queue_name: "queue.probe",
    description: `User-created equipment type for ${experimentName}`,
  })
}

async function recipeIdsForExperimentIds(experimentIds: string[]) {
  if (!experimentIds.length) return []
  const recipes = await safeGet<any[]>([], () => api.recipes.list())
  return recipes
    .filter((recipe) => recipe.experimentId && experimentIds.includes(recipe.experimentId))
    .map((recipe) => recipe.id)
}

export function createReferenceApi() {
  return {
    ...api,
    auth: {
      ...api.auth,
      async login(username: string, password: string) {
        return api.auth.login(username, password)
      },
    },
    requests: {
      ...api.requests,
      async close(id: string) {
        return api.requests.close(id)
      },
      async returnRequest(id: string, reason = "More information requested") {
        return api.requests.moreInfo(id, reason)
      },
      async ship(id: string) {
        return api.requests.get(id)
      },
    },
    samples: {
      ...api.samples,
      async rejectReceiving(id: string, reason = "") {
        return api.samples.reject(id, reason || "Rejected during receiving")
      },
      async getExperiments(id: string) {
        const sample = await safeGet(null, () => api.samples.get(id))
        if (!sample) return []
        return (sample.experiments || []).map((experiment: AnyRecord) => ({
          experimentTypeId: experiment.experimentTypeId,
          experimentName: experiment.experimentTypeName,
          status: experiment.status === "completed" ? "done" : experiment.status === "in_wip" || experiment.status === "running" ? "running" : experiment.status || "pending",
          verdict: null,
          dispatchId: experiment.currentWipId || null,
          result: null,
        }))
      },
    },
    wips: {
      ...api.wips,
      async abort(id: string) {
        return api.wips.cancel(id)
      },
    },
    dispatches: {
      ...api.dispatches,
      async abort(id: string) {
        return api.dispatches.cancel(id)
      },
      async start(id: string) {
        return api.dispatches.get(id)
      },
      async reportException(id: string) {
        return api.dispatches.cancel(id)
      },
      async unload(id: string) {
        return api.dispatches.get(id)
      },
      async recordResult(id: string, payload: AnyRecord = {}) {
        return api.dispatches.finalConfirm(id, payload.comment || payload.notes || "Result recorded")
      },
    },
    equipment: {
      ...api.equipment,
      async create(payload: AnyRecord) {
        if (payload.experimentTypeIds && !payload.equipmentTypeId && !payload.equipment_type_id) {
          const recipeIds = await recipeIdsForExperimentIds(payload.experimentTypeIds)
          const recipes = await safeGet<any[]>([], () => api.recipes.list())
          const firstRecipe = recipes.find((recipe) => recipeIds.includes(recipe.id))
          const equipmentTypeId = firstRecipe?.equipmentTypeId || (await getOrCreateDefaultEquipmentType(payload.name)).id
          return api.equipment.create({
            name: payload.name,
            modelName: payload.modelName,
            capacity: payload.capacity,
            equipmentTypeId,
            recipeIds,
          })
        }
        return api.equipment.create(payload)
      },
      async setCapabilities(id: string, capabilityIds: string[]) {
        const recipeIds = await recipeIdsForExperimentIds(capabilityIds)
        return safeGet(null, () => api.equipment.update(id, { recipeIds }))
      },
    },
    recipes: {
      ...api.recipes,
      async create(payload: AnyRecord) {
        let equipmentTypeId = payload.equipmentTypeId || payload.equipment_type_id
        if (!equipmentTypeId) {
          const experiment = payload.experimentTypeId
            ? await safeGet<any>(null, () => api.experimentTypes.list().then((items) => items.find((item) => item.id === payload.experimentTypeId) || null))
            : null
          equipmentTypeId = (await getOrCreateDefaultEquipmentType(experiment?.name || payload.name || "General")).id
        }
        return api.recipes.create({ ...payload, equipmentTypeId })
      },
    },
    reports: {
      ...api.reports,
      async trends({ metric = "requests_per_day", days = 30 }: AnyRecord = {}) {
        const requests = await safeGet([], () => api.requests.list())
        const points = new Map<string, number>()
        const now = new Date()
        for (let i = days - 1; i >= 0; i -= 1) {
          const d = new Date(now)
          d.setDate(now.getDate() - i)
          points.set(d.toISOString().slice(0, 10), 0)
        }
        requests.forEach((request: AnyRecord) => {
          const rawDate = request.submitted || request.created
          const key = rawDate ? String(rawDate).slice(0, 10) : ""
          if (points.has(key)) points.set(key, (points.get(key) || 0) + 1)
        })
        return {
          metric,
          days,
          points: Array.from(points, ([date, count]) => ({ date, count })),
        }
      },
    },
  }
}
