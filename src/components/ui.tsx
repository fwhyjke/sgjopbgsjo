import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Run, RunStatus } from '../api/types'
import { IconCopy, IconStop } from './icons'
import { useCancelRun } from '../api/hooks'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------- Button ----------

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'outline', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        variant === 'primary' && 'bg-fg text-black hover:bg-white',
        variant === 'outline' && 'border border-line-strong bg-surface text-fg hover:border-[#3a3a3a] hover:bg-surface-2',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-fg',
        variant === 'danger' && 'border border-err/40 bg-err/10 text-err hover:bg-err/20',
        className,
      )}
    />
  )
}

// ---------- Switch ----------

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50',
        checked ? 'border-white bg-white' : 'border-line-strong bg-surface-3 hover:border-[#3a3a3a]',
      )}
    >
      <span
        className={cx(
          'inline-block size-3 rounded-full transition-all duration-200',
          checked ? 'translate-x-[15px] bg-black' : 'translate-x-[2px] bg-faint',
        )}
      />
    </button>
  )
}

// ---------- Run status ----------

export const STATUS_META: Record<RunStatus, { label: string; dot: string; text: string; anim?: string }> = {
  Running: { label: 'Выполняется', dot: 'bg-run text-run', text: 'text-fg', anim: 'dot-pulse' },
  Canceling: { label: 'Отменяется', dot: 'bg-warn text-warn', text: 'text-warn', anim: 'blink' },
  Succeeded: { label: 'Успешно', dot: 'bg-ok', text: 'text-ok' },
  Failed: { label: 'Ошибка', dot: 'bg-err', text: 'text-err' },
  Canceled: { label: 'Отменён', dot: 'bg-muted', text: 'text-muted' },
  Aborted: { label: 'Прерван', dot: 'bg-warn/70', text: 'text-warn/80' },
}

export function StatusPill({ status }: { status: RunStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex items-center gap-2 text-[12.5px] font-medium', m.text)}>
      <span className={cx('size-1.5 shrink-0 rounded-full', m.dot, m.anim)} />
      {m.label}
    </span>
  )
}

// ---------- Cancel run ----------

export function CancelRunButton({ run, size = 'sm' }: { run: Run; size?: 'sm' | 'md' }) {
  const cancel = useCancelRun()

  if (run.status === 'Canceling') {
    return (
      <Button size={size} variant="ghost" disabled>
        Отменяется…
      </Button>
    )
  }
  if (run.status !== 'Running') return null
  return (
    <Button
      size={size}
      variant="outline"
      disabled={cancel.isPending}
      onClick={(e) => {
        e.stopPropagation()
        cancel.mutate(run)
      }}
    >
      <IconStop width={12} height={12} />
      Отменить
    </Button>
  )
}

// ---------- Copy ----------

export function CopyButton({ text, label = 'Скопировать' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        })
      }}
      className="inline-flex size-6 items-center justify-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-fg"
    >
      {done ? <span className="text-[11px] text-ok">✓</span> : <IconCopy width={13} height={13} />}
    </button>
  )
}

// ---------- Misc ----------

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted">
      {children}
    </kbd>
  )
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-err/30 bg-err/[0.06] px-4 py-3 text-[13px]">
      <span className="text-err">{error instanceof Error ? error.message : 'Ошибка загрузки'}</span>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-surface-3', className)} />
}
