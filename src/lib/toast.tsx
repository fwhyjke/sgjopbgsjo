import { useSyncExternalStore } from 'react'

type Toast = { id: number; kind: 'ok' | 'error'; text: string }

let toasts: Toast[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())

export function toast(text: string, kind: Toast['kind'] = 'ok') {
  const id = ++seq
  toasts = [...toasts, { id, kind, text }].slice(-4)
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, kind === 'error' ? 6000 : 3000)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => toasts,
  )
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-line-strong bg-surface-2/95 px-4 py-3 text-[13px] shadow-2xl shadow-black backdrop-blur"
        >
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${t.kind === 'ok' ? 'bg-ok' : 'bg-err'}`} />
          <span className="break-words text-fg">{t.text}</span>
        </div>
      ))}
    </div>
  )
}
