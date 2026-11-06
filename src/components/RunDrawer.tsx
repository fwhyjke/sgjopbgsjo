import { useEffect } from 'react'
import { ApiError } from '../api/client'
import { useRun } from '../api/hooks'
import { isTerminal, type Run } from '../api/types'
import { useNow } from '../lib/live'
import { buildHash } from '../lib/router'
import { formatDuration, formatFull } from '../lib/time'
import { IconX } from './icons'
import { CancelRunButton, CopyButton, Skeleton, StatusPill } from './ui'

export function RunDrawer({ id, initial, onClose }: { id: number; initial?: Run; onClose: () => void }) {
  const q = useRun(id)
  const run = q.data ?? initial
  const now = useNow(250)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const notFound = q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 400)

  const dur = run
    ? (run.finished_at ? new Date(run.finished_at).getTime() : now) - new Date(run.started_at).getTime()
    : 0

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Запуск #${id}`}>
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line-strong bg-surface shadow-2xl shadow-black">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Запуск</span>
            <span className="font-mono text-[14px] text-fg">#{id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-fg"
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {notFound ? (
            <p className="text-[13px] text-muted">Запуск не найден.</p>
          ) : !run ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <StatusPill status={run.status} />
                <CancelRunButton run={run} size="md" />
              </div>

              <dl className="mt-6 grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-3 text-[13px]">
                <dt className="text-faint">Джоба</dt>
                <dd className="min-w-0">
                  <a
                    href={buildHash('/runs', { job: run.job_name })}
                    className="truncate text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
                  >
                    {run.job_name}
                  </a>
                </dd>

                <dt className="text-faint">Начало</dt>
                <dd className="font-mono text-[12.5px] tabular text-fg">{formatFull(run.started_at)}</dd>

                <dt className="text-faint">Завершение</dt>
                <dd className="font-mono text-[12.5px] tabular text-fg">
                  {run.finished_at ? formatFull(run.finished_at) : <span className="text-faint">ещё идёт</span>}
                </dd>

                <dt className="text-faint">Длительность</dt>
                <dd className="font-mono text-[12.5px] tabular text-fg">
                  {formatDuration(dur)}
                  {!isTerminal(run.status) && <span className="blink ml-1 text-faint">…</span>}
                </dd>
              </dl>

              {run.error && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Ошибка</span>
                    <CopyButton text={run.error} label="Скопировать ошибку" />
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-lg border border-err/25 bg-err/[0.05] p-3.5 font-mono text-[12px] leading-relaxed text-err">
                    {run.error}
                  </pre>
                </div>
              )}

              {run.status === 'Canceling' && (
                <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
                  Отмена кооперативная: воркер получит отмену контекста и завершится, после чего статус станет «Отменён».
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
