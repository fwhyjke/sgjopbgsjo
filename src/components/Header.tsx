import { useSyncExternalStore } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { useJobs } from '../api/hooks'
import { useLive, useNow } from '../lib/live'
import { getServerOffset, offsetLabel, subscribeServerTz } from '../lib/time'
import { IconClock, IconPause, IconPlay } from './icons'
import { cx } from './ui'

const TABS = [
  { path: '/', label: 'Джобы' },
  { path: '/runs', label: 'Запуски' },
]

export function Header({ path }: { path: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-black/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <a href="#/" className="flex items-center gap-2.5 text-fg">
          <span className="flex size-7 items-center justify-center rounded-md border border-line-strong bg-gradient-to-b from-surface-3 to-black shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <IconClock width={15} height={15} />
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Scheduler</span>
        </a>

        <nav className="flex h-full items-stretch gap-1">
          {TABS.map((t) => {
            const active = path === t.path
            return (
              <a
                key={t.path}
                href={`#${t.path}`}
                className={cx(
                  'relative flex items-center px-2.5 text-[13px] font-medium transition-colors',
                  active ? 'text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {t.label}
                {active && <span className="absolute inset-x-2.5 -bottom-px h-px bg-fg" />}
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ServerTz />
          <LiveIndicator />
        </div>
      </div>
    </header>
  )
}

function ServerTz() {
  const off = useSyncExternalStore(subscribeServerTz, getServerOffset)
  return (
    <span
      className="hidden font-mono text-[11px] text-faint sm:inline"
      title="Время отображается в таймзоне сервера — в ней же работают cron-расписания"
    >
      {offsetLabel(off)}
    </span>
  )
}

function LiveIndicator() {
  const { paused, setPaused } = useLive()
  const jobs = useJobs()
  const fetching = useIsFetching() > 0
  const now = useNow(1000)

  const offline = jobs.isError
  const ago = jobs.dataUpdatedAt ? Math.max(0, Math.round((now - jobs.dataUpdatedAt) / 1000)) : null

  const state = offline ? 'offline' : paused ? 'paused' : 'live'
  const label =
    state === 'offline' ? 'Нет связи' : state === 'paused' ? 'Пауза' : ago === null ? 'Подключение…' : ago < 6 ? 'Live' : `${ago} с назад`

  return (
    <div className="flex items-center rounded-md border border-line bg-surface/80">
      <span
        className="flex h-7 items-center gap-2 pl-2.5 pr-2 text-[12px] tabular"
        title={jobs.dataUpdatedAt ? `Обновлено ${new Date(jobs.dataUpdatedAt).toLocaleTimeString('ru-RU')}` : undefined}
      >
        <span
          className={cx(
            'size-1.5 rounded-full',
            state === 'live' && 'bg-ok text-ok',
            state === 'live' && fetching && 'dot-pulse',
            state === 'paused' && 'bg-faint',
            state === 'offline' && 'blink bg-err',
          )}
        />
        <span className={cx('min-w-[4.5rem]', state === 'offline' ? 'text-err' : 'text-muted')}>{label}</span>
      </span>
      <button
        type="button"
        onClick={() => setPaused(!paused)}
        title={paused ? 'Возобновить автообновление' : 'Приостановить автообновление'}
        aria-label={paused ? 'Возобновить автообновление' : 'Приостановить автообновление'}
        className="flex h-7 w-7 items-center justify-center border-l border-line text-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        {paused ? <IconPlay width={12} height={12} /> : <IconPause width={12} height={12} />}
      </button>
    </div>
  )
}
