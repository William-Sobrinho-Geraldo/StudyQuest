import { Target } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { MetricsCharts } from '../features/metrics/components/MetricsCharts'
import { HeroProfile } from '../features/profile/components/HeroProfile'
import { StreakCard } from '../features/profile/components/StreakCard'
import { StudyTimerProvider } from '../features/study/context/StudyTimerContext'
import { StudyTimer } from '../features/study/components/StudyTimer'

const STATS = [{ label: 'Meta diária', value: '3/4', icon: Target }]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <AppShell>
      <StudyTimerProvider>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bem-vindo(a), {user?.email ?? 'explorador(a)'}.
        </p>

        <div className="mt-8">
          <HeroProfile />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StreakCard />
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <Icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              <p className="mt-3 text-3xl font-bold">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-slate-400">
          Estude pelo menos 20 minutos por dia para manter sua sequência.
        </p>

        <div className="mt-8">
          <StudyTimer />
        </div>

        <MetricsCharts />
      </StudyTimerProvider>
    </AppShell>
  )
}