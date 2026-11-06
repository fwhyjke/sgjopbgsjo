import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelRun, getJobs, getRun, getRuns, setJobEnabled, setSchedule, ApiError } from './client'
import { isTerminal, type Job, type Run, type RunsQuery } from './types'
import { usePoll } from '../lib/live'
import { learnServerOffset } from '../lib/time'
import { toast } from '../lib/toast'

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const keys = {
  jobs: ['jobs'] as const,
  runs: (q: RunsQuery) => ['runs', q] as const,
  run: (id: number) => ['run', id] as const,
}

export function useJobs() {
  const poll = usePoll(3000)
  return useQuery({
    queryKey: keys.jobs,
    queryFn: async () => {
      const jobs = await getJobs()
      for (const j of jobs) learnServerOffset(j.finished_at)
      // порядок с сервера не гарантирован
      return jobs.sort((a, b) => a.name.localeCompare(b.name))
    },
    refetchInterval: poll,
  })
}

export function useRuns(q: RunsQuery, interval = 2500) {
  const poll = usePoll(interval)
  return useQuery({
    queryKey: keys.runs(q),
    queryFn: async () => {
      const runs = await getRuns(q)
      if (runs[0]) learnServerOffset(runs[0].started_at)
      return runs
    },
    refetchInterval: poll,
    placeholderData: keepPreviousData,
  })
}

export function useRun(id: number | null) {
  const poll = usePoll(1000)
  return useQuery({
    queryKey: keys.run(id ?? -1),
    queryFn: () => getRun(id!),
    enabled: id !== null,
    // часто опрашиваем только пока ран не в терминальном статусе
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : poll),
    retry: (n, e) => !(e instanceof ApiError && (e.status === 404 || e.status === 400)) && n < 2,
  })
}

export function useToggleJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ job, enabled }: { job: Job; enabled: boolean }) => setJobEnabled(job.ID, enabled),
    onMutate: async ({ job, enabled }) => {
      await qc.cancelQueries({ queryKey: keys.jobs })
      const prev = qc.getQueryData<Job[]>(keys.jobs)
      qc.setQueryData<Job[]>(keys.jobs, (old) =>
        old?.map((j) => (j.ID === job.ID ? { ...j, status: enabled ? 1 : 0 } : j)),
      )
      return { prev }
    },
    onError: (e, { job }, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.jobs, ctx.prev)
      toast(`${job.name}: ${errText(e)}`, 'error')
    },
    onSuccess: (_, { job, enabled }) => toast(`${job.name} ${enabled ? 'включена' : 'выключена'}`),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  })
}

export function useSetSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ job, schedule }: { job: Job; schedule: string }) => setSchedule(job.ID, schedule),
    onSuccess: (res, { job }) => {
      qc.setQueryData<Job[]>(keys.jobs, (old) =>
        old?.map((j) => (j.ID === job.ID ? { ...j, schedule: res.schedule } : j)),
      )
      toast(`${job.name}: расписание обновлено`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  })
}

export function useCancelRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (run: Run) => cancelRun(run.id),
    onSuccess: (_, run) => {
      qc.setQueryData<Run>(keys.run(run.id), (old) => (old ? { ...old, status: 'Canceling' } : old))
      qc.setQueriesData<Run[]>({ queryKey: ['runs'] }, (old) =>
        old?.map((r) => (r.id === run.id && r.status === 'Running' ? { ...r, status: 'Canceling' } : r)),
      )
      toast(`Ран #${run.id}: отмена запрошена`)
    },
    onError: (e, run) => {
      const msg = e instanceof ApiError && e.status === 409 ? 'уже завершён' : errText(e)
      toast(`Ран #${run.id}: ${msg}`, 'error')
    },
    onSettled: (_, __, run) => {
      qc.invalidateQueries({ queryKey: ['runs'] })
      qc.invalidateQueries({ queryKey: keys.run(run.id) })
    },
  })
}
