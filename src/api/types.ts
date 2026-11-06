export type JobStatus = 0 | 1 // 0 = disabled, 1 = enabled

export interface Job {
  ID: string // ⚠️ с большой буквы
  name: string
  schedule: string
  status: JobStatus // ⚠️ число
  last_error: string
  /** zero-time "0001-01-01T00:00:00Z", если запусков ещё не было */
  finished_at: string
}

export type RunStatus = 'Running' | 'Succeeded' | 'Failed' | 'Canceled' | 'Aborted' | 'Canceling'

export const RUN_STATUSES: RunStatus[] = ['Running', 'Canceling', 'Succeeded', 'Failed', 'Canceled', 'Aborted']

export const TERMINAL_RUN_STATUSES: ReadonlySet<RunStatus> = new Set(['Succeeded', 'Failed', 'Canceled', 'Aborted'])

export const isTerminal = (s: RunStatus) => TERMINAL_RUN_STATUSES.has(s)

export interface Run {
  id: number
  job_name: string
  status: RunStatus // ⚠️ строка
  error: string
  started_at: string
  /** отсутствует, пока ран не завершён */
  finished_at?: string
}

export interface ChangeStatusResponse {
  job: string
  status: 'enable' | 'disable'
}

export interface ChangeScheduleResponse {
  job: string
  schedule: string
}

export interface CancelRunResponse {
  id: number
  status: 'canceling'
}

export interface RunsQuery {
  job_name?: string
  status?: RunStatus
  limit?: number
  offset?: number
}
