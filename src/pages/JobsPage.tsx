import { useMemo, useState } from 'react'
import type { Job } from '../api/types'
import { useJobs, useRuns, useToggleJob } from '../api/hooks'
import { describe, nextRuns } from '../lib/cron'
import { formatAgo, formatIn, formatFull, getServerOffset, isZeroTime } from '../lib/time'
import { useNow } from '../lib/live'
import { buildHash } from '../lib/router'
import { ScheduleEditor } from '../components/ScheduleEditor'
import { IconAlert, IconArrowRight, IconPencil, IconSearch } from '../components/icons'
import { CopyButton, cx, ErrorBanner, Skeleton, Switch } from '../components/ui'

type Filter = 'all' | 'on' | 'off'

const COLS = 'grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_36px]'
const COLS_MD = 'md:grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_36px]'

export function JobsPage() {
  const jobs = useJobs()
  const running = useRuns({ status: 'Running', limit: 500 }, 2000)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<string | null>(null)

  const runningSet = useMemo(() => new Set(running.data?.map((r) => r.job_name)), [running.data])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (jobs.data ?? []).filter(
      (j) =>
        (filter === 'all' || (filter === 'on') === (j.status === 1)) &&
        (!s || j.name.toLowerCase().includes(s) || j.schedule.includes(s) || j.ID.startsWith(s)),
    )
  }, [jobs.data, q, filter])

  const total = jobs.data?.length ?? 0
  const enabled = jobs.data?.filter((j) => j.status === 1).length ?? 0

  return (
    <div className="fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Джобы</h1>
          <p className="mt-1 text-[13px] text-muted tabular">
            {jobs.data ? (
              <>
                {total} всего · {enabled} включено
                {runningSet.size > 0 && (
                  <>
                    {' · '}
                    <span className="text-fg">{runningSet.size} выполняется</span>
                  </>
                )}
              </>
            ) : (
              ' '
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'on', label: 'Вкл' },
              { value: 'off', label: 'Выкл' },
            ]}
          />
          <label className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" width={14} height={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск"
              className="h-8 w-44 rounded-md border border-line-strong bg-surface pl-8 pr-3 text-[13px] outline-none transition-colors placeholder:text-faint focus:border-[#4a4a4a] sm:w-56"
            />
          </label>
        </div>
      </div>

      {jobs.isError && !jobs.data && <ErrorBanner error={jobs.error} onRetry={() => jobs.refetch()} />}

      {(jobs.data || jobs.isPending) && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface/80 shadow-[0_0_0_1px_rgb(0_0_0),0_20px_40px_-20px_rgb(0_0_0)]">
          <div
            className={cx(
              'hidden items-center gap-4 border-b border-line px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-faint md:grid',
              COLS,
            )}
          >
            <span />
            <span>Имя</span>
            <span>Расписание</span>
            <span>Следующий</span>
            <span>Последний</span>
            <span />
          </div>

          {jobs.isPending &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}

          {list.map((job) => (
            <JobRow
              key={job.ID}
              job={job}
              running={runningSet.has(job.name)}
              editing={editing === job.ID}
              onEdit={() => setEditing(editing === job.ID ? null : job.ID)}
              onCloseEdit={() => setEditing(null)}
            />
          ))}

          {jobs.data && list.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px] text-muted">
              {total === 0 ? 'Джоб пока нет' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function JobRow({
  job,
  running,
  editing,
  onEdit,
  onCloseEdit,
}: {
  job: Job
  running: boolean
  editing: boolean
  onEdit: () => void
  onCloseEdit: () => void
}) {
  const toggle = useToggleJob()
  const now = useNow(1000)
  const on = job.status === 1
  const human = useMemo(() => describe(job.schedule), [job.schedule])
  const next = on ? nextRuns(job.schedule, 1, getServerOffset(), now)?.[0] : undefined
  const neverFinished = isZeroTime(job.finished_at)

  return (
    <div className={cx('group border-b border-line last:border-0', editing && 'bg-surface-2/40')}>
      <div
        className={cx(
          'grid grid-cols-[44px_minmax(0,1fr)_36px] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-white/[0.015] md:gap-y-0',
          COLS_MD,
        )}
      >
        {/* toggle */}
        <div className="row-span-3 self-start pt-0.5 md:row-span-1 md:self-center md:pt-0">
          <Switch
            checked={on}
            label={on ? `Выключить ${job.name}` : `Включить ${job.name}`}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ job, enabled: v })}
          />
        </div>

        {/* name */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cx('truncate text-[13.5px] font-medium', on ? 'text-fg' : 'text-muted')}>{job.name}</span>
            {running && (
              <span
                title="Сейчас выполняется"
                aria-label="Сейчас выполняется"
                className="dot-pulse size-1.5 shrink-0 rounded-full bg-run text-run"
              />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-faint">
            <span className="truncate" title={job.ID}>
              {job.ID.slice(0, 12)}
            </span>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <CopyButton text={job.ID} label="Скопировать ID" />
            </span>
          </div>
        </div>

        {/* actions (на мобиле — справа от имени) */}
        <a
          href={buildHash('/runs', { job: job.name })}
          title="Запуски этой джобы"
          aria-label={`Запуски ${job.name}`}
          className="col-start-3 row-start-1 flex size-8 items-center justify-center justify-self-end rounded-md text-faint transition-colors hover:bg-surface-3 hover:text-fg md:col-start-6"
        >
          <IconArrowRight width={15} height={15} />
        </a>

        {/* schedule */}
        <button
          type="button"
          onClick={onEdit}
          className={cx(
            'col-span-2 -mx-2 min-w-0 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-3 md:col-span-1 md:col-start-3 md:row-start-1',
            editing && 'bg-surface-3',
          )}
          title="Изменить расписание"
        >
          <div className="flex items-center gap-2">
            <code className={cx('truncate font-mono text-[12.5px]', on ? 'text-fg' : 'text-muted')}>{job.schedule}</code>
            <IconPencil width={12} height={12} className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="truncate text-[12px] text-muted">{human ?? '—'}</div>
        </button>

        {/* next */}
        <div className="col-start-2 text-[12.5px] tabular md:col-start-4 md:row-start-1">
          <span className="mr-1.5 text-faint md:hidden">Следующий:</span>
          {!on ? (
            <span className="text-faint">выключена</span>
          ) : next ? (
            <span className="text-fg" title={formatFull(next)}>
              {formatIn(next, now)}
            </span>
          ) : (
            <span className="text-faint" title="Интервальное расписание — точку отсчёта знает только сервер">
              по интервалу
            </span>
          )}
        </div>

        {/* last */}
        <div className="col-start-2 min-w-0 text-[12.5px] tabular md:col-start-5 md:row-start-1">
          <span className="mr-1.5 text-faint md:hidden">Последний:</span>
          {neverFinished ? (
            <span className="text-faint">—</span>
          ) : (
            <span className="text-muted" title={formatFull(job.finished_at)}>
              {formatAgo(job.finished_at, now)}
            </span>
          )}
          {job.last_error && (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-err/90" title={job.last_error}>
              <IconAlert width={12} height={12} className="shrink-0" />
              <span className="truncate">{job.last_error}</span>
            </div>
          )}
        </div>
      </div>

      {editing && <ScheduleEditor job={job} onClose={onCloseEdit} />}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex h-8 items-center rounded-md border border-line-strong bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'h-full rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
            value === o.value ? 'bg-surface-3 text-fg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
