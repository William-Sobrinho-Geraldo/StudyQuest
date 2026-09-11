import { Coins, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { onStudySessionSaved } from '../../study/lib/studyEvents'
import { getLevelProgress } from '../../../utils/leveling'
import { useAuth } from '../../auth/AuthContext'
import { REWARD_COLORS } from '../../../lib/rewardColors'
import { getAvatarPreset } from '../../../lib/avatarPresets'

interface ProfileStats {
  level: number
  current_xp: number
  gold: number
}

export function HeroProfile() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    return onStudySessionSaved(() => {
      void refreshProfile()
    })
  }, [refreshProfile])

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
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Aventureiro'
  const preset = getAvatarPreset(profile?.avatar_id)
  const AvatarIcon = preset?.icon
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <Link
      to="/profile"
      className="block rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-800/80 active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {AvatarIcon ? (
          <div
            data-testid="hero-avatar-preset"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600"
          >
            <AvatarIcon className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
        ) : (
          <div
            data-testid="hero-avatar-fallback"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white"
          >
            {initial}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">{displayName}</p>
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

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </Link>
  )
}