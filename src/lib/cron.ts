// Разбор cron-спек в семантике robfig/cron (которую использует бэкенд):
// 5–6 полей (секунды опциональны), имена месяцев/дней, шаги, диапазоны, дескрипторы, @every.
import cronstrue from 'cronstrue'
import 'cronstrue/locales/ru.js'

const DESCRIPTORS: Record<string, { spec: string; ru: string }> = {
  '@yearly': { spec: '0 0 0 1 1 *', ru: 'Раз в год, 1 января в 00:00' },
  '@annually': { spec: '0 0 0 1 1 *', ru: 'Раз в год, 1 января в 00:00' },
  '@monthly': { spec: '0 0 0 1 * *', ru: 'Раз в месяц, 1 числа в 00:00' },
  '@weekly': { spec: '0 0 0 * * 0', ru: 'Раз в неделю, в воскресенье в 00:00' },
  '@daily': { spec: '0 0 0 * * *', ru: 'Ежедневно в 00:00' },
  '@midnight': { spec: '0 0 0 * * *', ru: 'Ежедневно в 00:00' },
  '@hourly': { spec: '0 0 * * * *', ru: 'Каждый час' },
}

type FieldDef = { name: string; min: number; max: number; names?: string[]; base?: number }

const FIELDS: FieldDef[] = [
  { name: 'секунды', min: 0, max: 59 },
  { name: 'минуты', min: 0, max: 59 },
  { name: 'часы', min: 0, max: 23 },
  { name: 'день месяца', min: 1, max: 31 },
  { name: 'месяц', min: 1, max: 12, base: 1, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] },
  { name: 'день недели', min: 0, max: 6, base: 0, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
]

type Field = { set: boolean[]; star: boolean }
type Compiled = { sec: Field; min: Field; hour: Field; dom: Field; mon: Field; dow: Field }

function parseField(expr: string, f: FieldDef): Field {
  const set: boolean[] = []
  for (const part of expr.split(',')) {
    const [range, stepStr, extra] = part.split('/')
    if (extra !== undefined) throw new Error(`${f.name}: лишний «/» в «${part}»`)
    const step = stepStr === undefined ? 1 : Number(stepStr)
    if (!Number.isInteger(step) || step <= 0) throw new Error(`${f.name}: неверный шаг «${part}»`)

    const num = (v: string) => {
      const idx = f.names?.indexOf(v.toLowerCase()) ?? -1
      const n = idx >= 0 ? idx + f.base! : /^\d+$/.test(v) ? Number(v) : NaN
      if (Number.isNaN(n)) throw new Error(`${f.name}: недопустимое значение «${v}»`)
      if (n < f.min || n > f.max) throw new Error(`${f.name}: ${n} вне диапазона ${f.min}–${f.max}`)
      return n
    }

    let lo: number, hi: number
    if (range === '*' || range === '?') {
      lo = f.min
      hi = f.max
    } else {
      const [a, b, more] = range.split('-')
      if (more !== undefined) throw new Error(`${f.name}: неверный диапазон «${range}»`)
      lo = num(a)
      hi = b === undefined ? (stepStr === undefined ? lo : f.max) : num(b)
      if (hi < lo) throw new Error(`${f.name}: диапазон «${range}» задом наперёд`)
    }
    for (let i = lo; i <= hi; i += step) set[i] = true
  }
  return { set, star: expr.startsWith('*') || expr.startsWith('?') }
}

const DUR_RE = /(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g
const DUR_MULT: Record<string, number> = { ns: 1e-6, us: 1e-3, µs: 1e-3, ms: 1, s: 1e3, m: 6e4, h: 36e5 }

/** Go-style duration ("1h30m", "45s") → мс. null, если не парсится. */
export function parseGoDuration(s: string): number | null {
  let total = 0
  let consumed = 0
  for (const m of s.matchAll(DUR_RE)) {
    total += parseFloat(m[1]) * DUR_MULT[m[2]]
    consumed += m[0].length
  }
  return s && consumed === s.length && total > 0 ? total : null
}

type Parsed = { kind: 'every'; ms: number } | { kind: 'cron'; spec: string; compiled: Compiled; descriptor?: string }

export function parseSpec(raw: string): { ok: true; value: Parsed } | { ok: false; error: string } {
  const s = raw.trim()
  if (!s) return { ok: false, error: 'Расписание не может быть пустым' }
  if (s.startsWith('@every')) {
    const ms = parseGoDuration(s.slice(6).trim())
    return ms ? { ok: true, value: { kind: 'every', ms } } : { ok: false, error: 'Неверная длительность, пример: @every 1h30m' }
  }
  let descriptor: string | undefined
  let spec = s
  if (s.startsWith('@')) {
    const d = DESCRIPTORS[s]
    if (!d) return { ok: false, error: `Неизвестный дескриптор ${s}` }
    descriptor = s
    spec = d.spec
  }
  const parts = spec.split(/\s+/)
  if (parts.length < 5 || parts.length > 6) return { ok: false, error: `Нужно 5 или 6 полей, сейчас ${parts.length}` }
  if (parts.length === 5) parts.unshift('0')
  try {
    const [sec, min, hour, dom, mon, dow] = parts.map((p, i) => parseField(p, FIELDS[i]))
    return { ok: true, value: { kind: 'cron', spec: parts.join(' '), compiled: { sec, min, hour, dom, mon, dow }, descriptor } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function describe(raw: string): string | null {
  const p = parseSpec(raw)
  if (!p.ok) return null
  const v = p.value
  if (v.kind === 'every') return humanEvery(v.ms)
  if (v.descriptor) return DESCRIPTORS[v.descriptor].ru
  try {
    return cronstrue.toString(v.spec, { locale: 'ru', use24HourTimeFormat: true, verbose: false })
  } catch {
    return null
  }
}

function humanEvery(ms: number): string {
  let s = Math.max(1, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  const parts = [h && `${h} ч`, m && `${m} мин`, s && `${s} с`].filter(Boolean)
  return `Каждые ${parts.join(' ')}`
}

// ---------- ближайшие запуски ----------

const domDowMatch = (c: Compiled, d: Date) => {
  const domOk = !!c.dom.set[d.getUTCDate()]
  const dowOk = !!c.dow.set[d.getUTCDay()]
  return c.dom.star || c.dow.star ? domOk && dowOk : domOk || dowOk
}

/**
 * Следующее срабатывание после `from`. Время сервера моделируем сдвигом на его UTC-смещение
 * и работаем UTC-геттерами — так не зависим от таймзоны браузера.
 */
function nextAfter(c: Compiled, from: number, offsetMin: number): number | null {
  const shift = offsetMin * 60_000
  const t = new Date(Math.floor((from + shift) / 1000) * 1000 + 1000)
  const limit = t.getTime() + 5 * 366 * 86_400_000

  while (t.getTime() < limit) {
    if (!c.mon.set[t.getUTCMonth() + 1]) {
      t.setUTCMonth(t.getUTCMonth() + 1, 1)
      t.setUTCHours(0, 0, 0, 0)
      continue
    }
    if (!domDowMatch(c, t)) {
      t.setUTCDate(t.getUTCDate() + 1)
      t.setUTCHours(0, 0, 0, 0)
      continue
    }
    if (!c.hour.set[t.getUTCHours()]) {
      t.setUTCHours(t.getUTCHours() + 1, 0, 0, 0)
      continue
    }
    if (!c.min.set[t.getUTCMinutes()]) {
      t.setUTCMinutes(t.getUTCMinutes() + 1, 0, 0)
      continue
    }
    if (!c.sec.set[t.getUTCSeconds()]) {
      t.setUTCSeconds(t.getUTCSeconds() + 1, 0)
      continue
    }
    return t.getTime() - shift
  }
  return null
}

/** Ближайшие n запусков. Для @every — null: точку отсчёта знает только сервер. */
export function nextRuns(raw: string, n: number, offsetMin: number | null, from = Date.now()): Date[] | null {
  const p = parseSpec(raw)
  if (!p.ok || p.value.kind === 'every') return null
  const off = offsetMin ?? -new Date(from).getTimezoneOffset()
  const out: Date[] = []
  let cur = from
  for (let i = 0; i < n; i++) {
    const nx = nextAfter(p.value.compiled, cur, off)
    if (nx === null) break
    out.push(new Date(nx))
    cur = nx
  }
  return out
}

export const PRESETS: { label: string; spec: string }[] = [
  { label: '5 сек', spec: '*/5 * * * * *' },
  { label: '30 сек', spec: '*/30 * * * * *' },
  { label: '1 мин', spec: '0 * * * * *' },
  { label: '5 мин', spec: '0 */5 * * * *' },
  { label: '1 час', spec: '0 0 * * * *' },
  { label: 'Ежедневно 03:00', spec: '0 0 3 * * *' },
  { label: 'Будни 09:00', spec: '0 0 9 * * 1-5' },
]
