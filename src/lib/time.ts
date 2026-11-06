// Все времена показываем в таймзоне сервера — в ней же интерпретируются cron-спеки.

export const ZERO_TIME = '0001-01-01T00:00:00Z'

export const isZeroTime = (ts?: string) => !ts || ts.startsWith('0001-01-01')

/** Смещение таймзоны из RFC3339-строки, в минутах. */
export function offsetFromTimestamp(ts: string): number | null {
  if (isZeroTime(ts)) return null
  if (/Z$/i.test(ts)) return 0
  const m = ts.match(/([+-])(\d{2}):(\d{2})$/)
  if (!m) return null
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

/** IANA-зона для фиксированного смещения (только целые часы); иначе undefined → локальная. */
export function tzFromOffset(min: number | null): string | undefined {
  if (min === null || min % 60 !== 0) return undefined
  if (min === 0) return 'UTC'
  const h = min / 60
  return `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}` // знак в Etc/GMT инвертирован
}

export function offsetLabel(min: number | null): string {
  if (min === null) return 'локальное время'
  if (min === 0) return 'UTC'
  const sign = min > 0 ? '+' : '−'
  const a = Math.abs(min)
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`
}

// ---- состояние таймзоны сервера (определяется по первым пришедшим таймстемпам) ----

let serverOffset: number | null = null
let serverTz: string | undefined
const listeners = new Set<() => void>()

export function learnServerOffset(ts: string | undefined) {
  if (serverOffset !== null || !ts) return
  const off = offsetFromTimestamp(ts)
  if (off === null) return
  serverOffset = off
  serverTz = tzFromOffset(off)
  listeners.forEach((l) => l())
}

export const getServerOffset = () => serverOffset
export const getServerTz = () => serverTz
export const subscribeServerTz = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// ---- форматирование ----

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts) + (serverTz ?? '')
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('ru-RU', { ...opts, timeZone: serverTz, hourCycle: 'h23' })
    fmtCache.set(key, f)
  }
  return f
}

const dayKey = (d: Date) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/** «14:02:05» сегодня, иначе «5 нояб., 14:02:05». */
export function formatTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const time = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d)
  if (dayKey(d) === dayKey(new Date())) return time
  return `${fmt({ day: 'numeric', month: 'short' }).format(d)}, ${time}`
}

export function formatFull(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const s = fmt({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(d)
  return s
}

/** Длительность: «340 мс», «4.2 с», «3 м 05 с», «2 ч 14 м». */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  if (ms < 1000) return `${Math.round(ms)} мс`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} с`
  const s = Math.floor(ms / 1000)
  if (s < 3600) return `${Math.floor(s / 60)} м ${String(s % 60).padStart(2, '0')} с`
  return `${Math.floor(s / 3600)} ч ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} м`
}

/** «5 с назад», «3 мин назад», «2 ч назад». */
export function formatAgo(ts: string, now: number): string {
  const diff = Math.max(0, now - new Date(ts).getTime())
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'только что'
  if (s < 60) return `${s} с назад`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

/** «через 4 с», «через 12 мин», «через 3 ч». */
export function formatIn(target: Date, now: number): string {
  const s = Math.max(0, Math.ceil((target.getTime() - now) / 1000))
  if (s < 60) return `через ${s} с`
  const m = Math.floor(s / 60)
  if (m < 60) return `через ${m} мин${s % 60 && m < 10 ? ` ${s % 60} с` : ''}`
  const h = Math.floor(m / 60)
  if (h < 48) return `через ${h} ч${m % 60 ? ` ${m % 60} мин` : ''}`
  return `через ${Math.floor(h / 24)} дн`
}
