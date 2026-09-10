import { useCallback, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { RewardChestCard } from '../features/chest/components/RewardChestCard'
import { StudyHistory } from '../features/metrics/components/StudyHistory'
import { DailyGoalCard } from '../features/profile/components/DailyGoalCard'
import { HeroProfile } from '../features/profile/components/HeroProfile'
import { StreakCard } from '../features/profile/components/StreakCard'
import { StudyTimerProvider } from '../features/study/context/StudyTimerContext'
import { StudyTimer } from '../features/study/components/StudyTimer'

export function DashboardPage() {
  const { user } = useAuth()
  const [profileEpoch, setProfileEpoch] = useState(0)

  const handleChestClaimed = useCallback(() => {
    setProfileEpoch((epoch) => epoch + 1)
  }, [])

  return (
    <AppShell>
      <StudyTimerProvider>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bem-vindo(a), {user?.email ?? 'explorador(a)'}.
        </p>

        <div className="mt-8">
          <HeroProfile key={profileEpoch} />
        </div>

        <div className="mt-6 grid gap-4">
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

        <StudyHistory />
      </StudyTimerProvider>
    </AppShell>
  )
}