import { Coins, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useStudyTimerContext } from '../../study/context/StudyTimerContext'
import { getLevelProgress } from '../../../utils/leveling'
import { useAuth } from '../../auth/AuthContext'
import { REWARD_COLORS } from '../../../lib/rewardColors'

interface ProfileStats {
  level: number
  current_xp: number
  gold: number
}

export function HeroProfile() {
  const { user } = useAuth()
  const timer = useStudyTimerContext()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [granting, setGranting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('level,current_xp,gold')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    setStats(data ?? null)
  }, [user])

  useEffect(() => {
    setLoading(true)
    setError(null)
    void refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  const hasActiveSession = timer.status === 'running' || timer.status === 'paused'

  const handleDevGrant = async () => {
    if (granting) return
    setGranting(true)
    setError(null)
    try {
      if (!hasActiveSession) {
        setError('Inicie uma sessão de estudo antes de concluí-la.')
        return
      }
      const reward = await timer.finish()
      if (!reward) return
      const { error } = await supabase.rpc('add_xp', {
        p_xp: reward.xp,
        p_gold: reward.gold,
      })
      if (error) {
        setError(error.message)
      } else {
        await refreshProfile()
      }
    } finally {
      setGranting(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5" aria-busy="true">
        <p role="status" className="text-sm text-slate-400">
          Carregando perfil...
        </p>
      </section>
    )
  }

  const xp = stats?.current_xp ?? 0
  const gold = stats?.gold ?? 0
  const { level, xpIntoLevel, xpForNextLevel: nextLevelXp, progress } = getLevelProgress(xp)
  const percent = Math.round(progress * 100)
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${user?.email ?? 'aventureiro'}`}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div
            data-testid="hero-avatar-fallback"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white"
          >
            {initial}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">{user?.email ?? 'Aventureiro'}</p>
          <p data-testid="hero-level" className="text-sm font-medium text-indigo-400">
            Nível {level}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div
          role="progressbar"
          aria-label="Progresso para o próximo nível"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 w-full overflow-hidden rounded-full bg-slate-800"
        >
          <div
            data-testid="progress-fill"
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
            style={{ width: `${(progress * 100).toFixed(2)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span data-testid="hero-xp" className={`flex items-center gap-1.5 ${REWARD_COLORS.xp}`}>
            <Sparkles className={`h-3.5 w-3.5 ${REWARD_COLORS.xpIcon}`} aria-hidden="true" />
            {xpIntoLevel}/{nextLevelXp} XP
          </span>
          <span data-testid="hero-gold" className={`flex items-center gap-1.5 ${REWARD_COLORS.gold}`}>
            <Coins className={`h-3.5 w-3.5 ${REWARD_COLORS.goldIcon}`} aria-hidden="true" />
            {gold} Gold
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleDevGrant()}
          disabled={granting || !hasActiveSession}
          title={
            hasActiveSession
              ? 'Encerra a sessão em andamento e soma XP/Gold ao perfil'
              : 'Inicie o timer de estudo antes de concluir a sessão'
          }
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {granting ? 'Salvando...' : 'Concluir Sessão (Teste Dev)'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}