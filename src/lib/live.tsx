import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const KEY = 'sched:paused'

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const LiveCtx = createContext<{ paused: boolean; setPaused: (v: boolean) => void }>({
  paused: false,
  setPaused: () => {},
})

export function LiveProvider({ children }: { children: ReactNode }) {
  const [paused, setPausedState] = useState(read)
  const setPaused = (v: boolean) => {
    setPausedState(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }
  return <LiveCtx.Provider value={{ paused, setPaused }}>{children}</LiveCtx.Provider>
}

export const useLive = () => useContext(LiveCtx)

/** Интервал опроса или false, если автообновление на паузе. */
export function usePoll(ms: number): number | false {
  return useLive().paused ? false : ms
}

/** Текущее время, тикает раз в `ms`. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
