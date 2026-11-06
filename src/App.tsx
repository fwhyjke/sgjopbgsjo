import { useEffect } from 'react'
import { Header } from './components/Header'
import { JobsPage } from './pages/JobsPage'
import { RunsPage } from './pages/RunsPage'
import { navigate, useRoute } from './lib/router'
import { Toaster } from './lib/toast'

export function App() {
  const { path, params } = useRoute()

  useEffect(() => {
    if (path !== '/' && path !== '/runs') navigate('/', {}, { replace: true })
  }, [path])

  return (
    <div className="flex min-h-dvh flex-col">
      <Header path={path} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-8 sm:px-6">
        {path === '/runs' ? <RunsPage params={params} /> : <JobsPage />}
      </main>
      <Toaster />
    </div>
  )
}
