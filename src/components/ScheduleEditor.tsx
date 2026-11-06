import { useEffect, useMemo, useRef, useState } from 'react'
import type { Job } from '../api/types'
import { useSetSchedule } from '../api/hooks'
import { describe, nextRuns, parseSpec, PRESETS } from '../lib/cron'
import { formatFull, formatIn, getServerOffset } from '../lib/time'
import { useNow } from '../lib/live'
import { Button, cx, Kbd } from './ui'

export function ScheduleEditor({ job, onClose }: { job: Job; onClose: () => void }) {
  const [value, setValue] = useState(job.schedule)
  const inputRef = useRef<HTMLInputElement>(null)
  const save = useSetSchedule()
  const now = useNow(1000)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const parsed = useMemo(() => parseSpec(value), [value])
  const human = parsed.ok ? describe(value) : null
  const upcoming = useMemo(() => (parsed.ok ? nextRuns(value, 3, getServerOffset(), now) : null), [parsed.ok, value, now])
  const unchanged = value.trim() === job.schedule
  const serverError = save.error instanceof Error ? save.error.message : null

  const submit = () => {
    if (!parsed.ok || unchanged || save.isPending) return
    save.mutate({ job, schedule: value.trim() }, { onSuccess: onClose })
  }

  return (
    <div
      className="expand border-t border-line bg-surface-2/60 px-4 py-4 sm:px-5"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-faint" htmlFor={`sched-${job.ID}`}>
            Cron-спека
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="flex gap-2"
          >
            <input
              id={`sched-${job.ID}`}
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (save.isError) save.reset()
              }}
              spellCheck={false}
              autoComplete="off"
              className={cx(
                'h-9 min-w-0 flex-1 rounded-md border bg-black px-3 font-mono text-[13.5px] text-fg outline-none transition-colors placeholder:text-faint',
                parsed.ok && !serverError ? 'border-line-strong focus:border-[#4a4a4a]' : 'border-err/50 focus:border-err/70',
              )}
              placeholder="*/5 * * * * *"
            />
            <Button type="submit" variant="primary" className="h-9" disabled={!parsed.ok || unchanged || save.isPending}>
              {save.isPending ? 'Сохраняю…' : 'Сохранить'}
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={onClose}>
              Отмена
            </Button>
          </form>

          <div className="mt-2 min-h-[20px] text-[12.5px]">
            {serverError ? (
              <span className="text-err">{serverError}</span>
            ) : !parsed.ok ? (
              <span className="text-err">{parsed.error}</span>
            ) : (
              <span className="text-muted">{human}</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.spec}
                type="button"
                onClick={() => {
                  setValue(p.spec)
                  save.reset()
                  inputRef.current?.focus()
                }}
                className={cx(
                  'h-6 rounded-full border px-2.5 text-[11.5px] transition-colors',
                  value.trim() === p.spec
                    ? 'border-fg bg-fg text-black'
                    : 'border-line-strong text-muted hover:border-[#3a3a3a] hover:text-fg',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="mt-3 font-mono text-[11px] text-faint">
            сек мин час день месяц день_недели · или @every 1h30m, @daily, @hourly
          </p>
        </div>

        <div className="min-w-0 border-line md:border-l md:pl-5">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Ближайшие запуски</div>
          {upcoming ? (
            <ul className="space-y-1">
              {upcoming.map((d) => (
                <li key={d.getTime()} className="flex items-baseline justify-between gap-3 font-mono text-[12px] tabular">
                  <span className="text-fg">{formatFull(d).replace(/,\d{3}$/, '')}</span>
                  <span className="text-faint">{formatIn(d, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-faint">
              {parsed.ok ? 'Интервальное расписание — отсчёт идёт от последнего тика на сервере' : '—'}
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-faint">
            <Kbd>Enter</Kbd> сохранить <Kbd>Esc</Kbd> закрыть
          </div>
        </div>
      </div>
    </div>
  )
}
