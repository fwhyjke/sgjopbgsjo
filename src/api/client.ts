import type {
  CancelRunResponse,
  ChangeScheduleResponse,
  ChangeStatusResponse,
  Job,
  Run,
  RunsQuery,
} from './types'

// Фронт вшит в тот же mux, что и API → same-origin. Если API смонтирован под префиксом —
// задайте VITE_API_BASE при сборке (например, "/scheduler").
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, init)
  } catch {
    throw new ApiError(0, 'Нет связи с сервером')
  }
  const text = await res.text()
  let body: any = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text.trim() }
    }
  }
  if (!res.ok) {
    // GET /jobs/{id} с неизвестным id отдаёт 400 и тело {} — поле error может отсутствовать
    throw new ApiError(res.status, body?.error || `HTTP ${res.status}`)
  }
  return body as T
}

const post = <T>(path: string, json?: unknown) =>
  api<T>(path, {
    method: 'POST',
    ...(json !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    }),
  })

export const getJobs = () => api<Job[]>('/jobs')

export const setJobEnabled = (id: string, enabled: boolean) =>
  post<ChangeStatusResponse>(`/jobs/${id}/${enabled ? 'enable' : 'disable'}`)

export const setSchedule = (id: string, schedule: string) =>
  post<ChangeScheduleResponse>(`/jobs/${id}/schedule`, { schedule })

export const getRuns = (q: RunsQuery = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v))
  const qs = p.toString()
  return api<Run[]>(`/runs${qs ? `?${qs}` : ''}`)
}

export const getRun = (id: number) => api<Run>(`/runs/${id}`)

export const cancelRun = (id: number) => post<CancelRunResponse>(`/runs/${id}/cancel`)
