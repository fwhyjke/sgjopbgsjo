// Мини-роутер на hash: фронт вшит в тот же mux, что и API, поэтому пути вида /jobs
// заняты бэкендом — роуты живут после "#".
import { useSyncExternalStore } from 'react'

export type Params = Record<string, string>

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const snapshot = () => window.location.hash

export function parseHash(hash: string): { path: string; params: Params } {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path || '/', params: Object.fromEntries(new URLSearchParams(qs)) }
}

export function buildHash(path: string, params: Params = {}): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, v)
  const qs = p.toString()
  return `#${path}${qs ? `?${qs}` : ''}`
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, snapshot)
  return parseHash(hash)
}

export function navigate(path: string, params: Params = {}, opts: { replace?: boolean } = {}) {
  const h = buildHash(path, params)
  if (opts.replace) {
    history.replaceState(null, '', h)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = h
  }
}
