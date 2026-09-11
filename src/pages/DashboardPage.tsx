import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ChevronRight, Store } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { RewardChestCard } from '../features/chest/components/RewardChestCard'
import { DailyGoalCard } from '../features/profile/components/DailyGoalCard'
import { HeroProfile } from '../features/profile/components/HeroProfile'
import { StreakCard } from '../features/profile/components/StreakCard'
import { StudyTimer } from '../features/study/components/StudyTimer'

export function DashboardPage() {
  const { user } = useAuth()
  const [profileEpoch, setProfileEpoch] = useState(0)

  const handleChestClaimed = useCallback(() => {
    setProfileEpoch((epoch) => epoch + 1)
  }, [])

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Bem-vindo(a), {user?.email ?? 'explorador(a)'}.
      </p>

      <div className="mt-8">
        <HeroProfile key={profileEpoch} />
      </div>

      <div className="mt-6 grid gap-4">
        <Link
          to="/shop"
          className="flex min-h-16 items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-purple-600/15 px-5 transition hover:border-amber-400/50 hover:from-amber-500/20"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <Store className="h-5 w-5 text-amber-400" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">Mercado Rotativo</span>
              <span className="block text-xs text-slate-400">
                Ofertas diárias de equipamentos para seu personagem.
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-amber-400/70" aria-hidden="true" />
        </Link>

        <Link
          to="/history"
          className="flex min-h-16 items-center justify-between rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 to-violet-600/15 px-5 transition hover:border-indigo-400/50 hover:from-indigo-500/20"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <BarChart2 className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">Histórico de Estudo</span>
              <span className="block text-xs text-slate-400">
                Analise seu progresso e sessões anteriores.
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-indigo-400/70" aria-hidden="true" />
        </Link>

        <RewardChestCard onClaimed={handleChestClaimed} />
        <div className="grid grid-cols-2 gap-4">
          <StreakCard />
          <DailyGoalCard />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Estude pelo menos 20 minutos por dia para manter sua sequência.
      </p>

      <div className="mt-8">
        <StudyTimer />
      </div>
    </AppShell>
  )
}