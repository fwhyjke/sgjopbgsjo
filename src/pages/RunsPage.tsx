import { useCallback, type ReactNode } from 'react'
import { useJobs, useRuns } from '../api/hooks'
import { RUN_STATUSES, type Run, type RunStatus } from '../api/types'
import { useNow } from '../lib/live'
import { navigate, type Params } from '../lib/router'
import { formatDuration, formatFull, formatTime } from '../lib/time'
import { RunDrawer } from '../components/RunDrawer'
import { IconChevronLeft, IconChevronRight, IconX } from '../components/icons'
import { Button, CancelRunButton, cx, ErrorBanner, Skeleton, STATUS_META, StatusPill } from '../components/ui'

const PAGE = 50
// на узких экранах колонку ошибки прячем — она есть в панели деталей
const COLS =
  'grid-cols-[60px_minmax(0,1fr)_118px_88px_72px_128px] lg:grid-cols-[64px_minmax(0,1fr)_120px_96px_80px_minmax(0,1.2fr)_128px]'

export function RunsPage({ params }: { params: Params }) {
  const job = params.job || undefined
  const status = (RUN_STATUSES as string[]).includes(params.status) ? (params.status as RunStatus) : undefined
  const page = Math.max(0, Number(params.page) || 0)
  const openId = params.run ? Number(params.run) : null

  const set = useCallback(
    (patch: Params, opts?: { replace?: boolean }) => {
      const next = { ...params, ...patch }
      // смена фильтров сбрасывает страницу
      if (('job' in patch || 'status' in patch) && !('page' in patch)) delete next.page
      navigate('/runs', next, opts)
    },
    [params],
  )

  const jobs = useJobs()
  const runs = useRuns({ job_name: job, status, limit: PAGE, offset: page * PAGE }, openId ? 1500 : 2500)
  const hasNext = (runs.data?.length ?? 0) === PAGE
  const openRun = runs.data?.find((r) => r.id === openId)

  return (
    <div className="fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Запуски</h1>
          <p className="mt-1 text-[13px] text-muted">Новые сверху · обновляется автоматически</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={job ?? ''}
              onChange={(e) => set({ job: e.target.value })}
              aria-label="Фильтр по джобе"
              className={cx(
                'h-8 max-w-[220px] cursor-pointer appearance-none rounded-md border bg-surface pl-3 pr-8 text-[13px] outline-none transition-colors focus:border-[#4a4a4a]',
                job ? 'border-[#4a4a4a] text-fg' : 'border-line-strong text-muted',
              )}
            >
              <option value="">Все джобы</option>
              {jobs.data?.map((j) => (
                <option key={j.ID} value={j.name}>
                  {j.name}
                </option>
              ))}
              {job && !jobs.data?.some((j) => j.name === job) && <option value={job}>{job}</option>}
            </select>
            <IconChevronRight
              width={13}
              height={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-faint"
            />
          </div>
          {(job || status) && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/runs', params.run ? { run: params.run } : {})}>
              <IconX width={12} height={12} />
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {/* статусы */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <StatusChip active={!status} onClick={() => set({ status: '' })}>
          Все
        </StatusChip>
        {RUN_STATUSES.map((s) => (
          <StatusChip key={s} active={status === s} onClick={() => set({ status: status === s ? '' : s })}>
            <span className={cx('size-1.5 rounded-full', STATUS_META[s].dot)} />
            {STATUS_META[s].label}
          </StatusChip>
        ))}
      </div>

      {runs.isError && !runs.data && <ErrorBanner error={runs.error} onRetry={() => runs.refetch()} />}

      {(runs.data || runs.isPending) && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface/80">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className={cx(
                  'grid items-center gap-4 border-b border-line px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-faint',
                  COLS,
                )}
              >
                <span>ID</span>
                <span>Джоба</span>
                <span>Статус</span>
                <span>Начало</span>
                <span className="text-right">Длит.</span>
                <span className="hidden lg:block">Ошибка</span>
                <span />
              </div>

              {runs.isPending &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-6 border-b border-line px-5 py-3.5 last:border-0">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}

              <div className={cx('transition-opacity', runs.isPlaceholderData && 'opacity-50')}>
                {runs.data?.map((r) => (
                  <RunRow key={r.id} run={r} active={r.id === openId} onOpen={() => set({ run: String(r.id) })} />
                ))}
              </div>

              {runs.data?.length === 0 && (
                <div className="px-5 py-14 text-center text-[13px] text-muted">
                  {page > 0 ? 'На этой странице пусто' : 'Запусков не найдено'}
                </div>
              )}
            </div>
          </div>

          {(page > 0 || hasNext) && (
            <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
              <span className="text-[12px] text-muted tabular">
                {runs.data?.length ? `${page * PAGE + 1}–${page * PAGE + runs.data.length}` : '—'}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" disabled={page === 0} onClick={() => set({ page: page > 1 ? String(page - 1) : '' })}>
                  <IconChevronLeft width={13} height={13} />
                  Назад
                </Button>
                <Button size="sm" disabled={!hasNext} onClick={() => set({ page: String(page + 1) })}>
                  Вперёд
                  <IconChevronRight width={13} height={13} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {openId !== null && Number.isFinite(openId) && (
        <RunDrawer id={openId} initial={openRun} onClose={() => set({ run: '' }, { replace: true })} />
      )}
    </div>
  )
}

function RunRow({ run, active, onOpen }: { run: Run; active: boolean; onOpen: () => void }) {
  const live = !run.finished_at
  const now = useNow(live ? 200 : 60_000)
  const dur = (run.finished_at ? new Date(run.finished_at).getTime() : now) - new Date(run.started_at).getTime()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className={cx(
        'grid cursor-pointer items-center gap-4 border-b border-line px-5 py-2.5 text-[13px] outline-none transition-colors last:border-0 hover:bg-white/[0.025] focus-visible:bg-white/[0.04]',
        COLS,
        active && 'bg-white/[0.04]',
        run.status === 'Running' && 'row-running',
      )}
    >
      <span className="font-mono text-[12px] text-faint tabular">#{run.id}</span>
      <span className="truncate font-medium text-fg">{run.job_name}</span>
      <span>
        <StatusPill status={run.status} />
      </span>
      <span className="truncate text-[12.5px] text-muted tabular" title={formatFull(run.started_at)}>
        {formatTime(run.started_at)}
      </span>
      <span className={cx('text-right font-mono text-[12px] tabular', live ? 'text-fg' : 'text-muted')}>
        {formatDuration(dur)}
      </span>
      <span className="hidden truncate font-mono text-[11.5px] text-err/85 lg:block" title={run.error || undefined}>
        {run.error}
      </span>
      <span className="flex justify-end">
        <CancelRunButton run={run} />
      </span>
    </div>
  )
}

function StatusChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors',
        active ? 'border-fg bg-fg text-black' : 'border-line-strong text-muted hover:border-[#3a3a3a] hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
