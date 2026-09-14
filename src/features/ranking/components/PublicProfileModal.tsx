import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Loader2, Swords, UserPlus, X } from 'lucide-react'
import { useAuth } from '../../../features/auth/AuthContext'
import { useModalBackHandler } from '../../../hooks/useNativeBackButton'
import { UserAvatar } from '../../../components/UserAvatar'
import { computeCombatTotals, formatStudyDuration } from '../../../utils/equippedStats'
import type { ForgeRarity } from '../../../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../../../features/forge/lib/forgeRules'
import { ArenaHistorySection } from '../../../features/pvp/components/ArenaHistorySection'
import { DuelModal } from '../../../features/pvp/components/DuelModal'
import { getDuelTitle } from '../../../features/pvp/lib/duelStats'
import {
  fetchPublicProfile,
  type PublicProfile,
  type PublicProfileRelation,
} from '../services/rankingService'

interface PublicProfileModalProps {
  userId: string
  onClose: () => void
  onSendRequest: (userId: string) => Promise<boolean>
}

export function PublicProfileModal({ userId, onClose, onSendRequest }: PublicProfileModalProps) {
  useModalBackHandler(onClose)

  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [relation, setRelation] = useState<PublicProfileRelation>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [duelOpen, setDuelOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchPublicProfile(userId)
      .then((data) => {
        if (!active) return
        setProfile(data)
        setRelation(data.relation)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const totals = useMemo(() => {
    if (!profile) return { attack: 0, defense: 0, hp: 0 }
    return computeCombatTotals(
      profile.equipped.map((item) => ({
        category: item.item_category as EquipmentSlot,
        level: item.item_level,
        rarity: (item.rarity as ForgeRarity | undefined) ?? undefined,
        enhancementLevel: item.enhancement_level,
      })),
    )
  }, [profile])

  const isSelf = profile?.relation === 'self' || userId === user?.id
  const isFriend = relation === 'accepted'
  const duelTitle = getDuelTitle(profile?.duels_won ?? 0)

  async function handleAddFriend() {
    if (!profile || sending) return
    setSending(true)
    const ok = await onSendRequest(userId)
    setSending(false)
    if (ok) setRelation('pending_out')
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-profile-title"
        onClick={onClose}
      >
        <div
          className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-hidden="true" />
            </div>
          ) : error ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-6 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              <header className="relative flex flex-col items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="absolute right-0 top-0 grid h-11 w-11 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>

                <UserAvatar
                  avatarId={profile?.avatar_id}
                  name={profile?.display_name ?? profile?.player_tag ?? undefined}
                  className="h-20 w-20 rounded-xl border border-slate-700 shadow-lg ring-4 ring-indigo-500/30"
                />

                <h2 id="public-profile-title" className="mt-1 text-xl font-bold">
                  {profile?.display_name ?? profile?.player_tag ?? 'Jogador'}
                </h2>
                <p
                  data-testid="public-profile-duel-title"
                  className={`text-xs font-semibold uppercase tracking-wider ${duelTitle.className}`}
                >
                  {duelTitle.label}
                </p>
                {profile?.player_tag && (
                  <p className="text-sm text-slate-400">{profile.player_tag}</p>
                )}
                <span
                  data-testid="public-profile-level"
                  className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300"
                >
                  Nível {profile?.level ?? 1}
                </span>
              </header>

              <section className="mt-5 w-full">
                <div className="flex justify-center">
                  {profile?.study_goal ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                      <span aria-hidden="true">🎯</span>
                      Foco: {profile.study_goal}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Objetivo de estudo não definido</span>
                  )}
                </div>
                <p className="mt-2 px-4 text-center text-sm italic text-gray-300">
                  {profile?.bio || 'Sem bio por enquanto.'}
                </p>
              </section>

              <section className="my-3 w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="grid grid-cols-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg" aria-hidden="true">⚔️</span>
                    <span className="text-xs text-slate-400">Ataque</span>
                    <span className="text-sm font-bold text-green-400">{totals.attack}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 border-x border-slate-800">
                    <span className="text-lg" aria-hidden="true">🛡️</span>
                    <span className="text-xs text-slate-400">Defesa</span>
                    <span className="text-sm font-bold text-green-400">{totals.defense}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg" aria-hidden="true">❤️</span>
                    <span className="text-xs text-slate-400">HP</span>
                    <span className="text-sm font-bold text-green-400">{totals.hp}</span>
                  </div>
                </div>
              </section>

              <section className="mt-4 w-full">
                <h3 className="mb-2 text-sm font-semibold text-slate-300">Estatísticas de Foco</h3>
                <div className="my-2 grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-xl" aria-hidden="true">⏱️</div>
                    <p className="mt-1 text-xs text-slate-400">Tempo Total</p>
                    <p className="mt-0.5 text-base font-bold text-white">
                      {formatStudyDuration(profile?.total_minutes ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-xl" aria-hidden="true">📚</div>
                    <p className="mt-1 text-xs text-slate-400">Sessões</p>
                    <p className="mt-0.5 text-base font-bold text-white">
                      {profile?.session_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="text-xl" aria-hidden="true">🔥</div>
                    <p className="mt-1 text-xs text-slate-400">Streak</p>
                    <p className="mt-0.5 text-base font-bold text-white">
                      {profile?.current_streak ?? 0} dias
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-4 w-full">
                <h3 className="mb-2 text-sm font-semibold text-slate-300">Histórico de Arena</h3>
                <ArenaHistorySection
                  honorPoints={profile?.honor_points ?? 0}
                  duelsWon={profile?.duels_won ?? 0}
                  duelsLost={profile?.duels_lost ?? 0}
                />
              </section>

              {!isSelf && (
                <footer className="mt-5 space-y-3">
                  {isFriend && (
                    <button
                      type="button"
                      onClick={() => setDuelOpen(true)}
                      className="flex min-h-[52px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl bg-rose-600 text-base font-bold text-white transition hover:bg-rose-500 active:scale-95"
                    >
                      <Swords className="h-5 w-5" aria-hidden="true" />
                      Desafiar para Duelo
                    </button>
                  )}
                  {relation === 'none' ? (
                    <button
                      type="button"
                      onClick={handleAddFriend}
                      disabled={sending}
                      className="flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                      )}
                      {sending ? 'Enviando...' : '+ Adicionar Amigo'}
                    </button>
                  ) : relation === 'accepted' ? (
                    <button
                      type="button"
                      disabled
                      className="flex min-h-[48px] w-full cursor-default select-none items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-300"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Amigos
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex min-h-[48px] w-full cursor-default select-none items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 text-sm font-semibold text-slate-400"
                    >
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {relation === 'pending_in' ? 'Convite Recebido' : 'Solicitação Enviada'}
                    </button>
                  )}
                </footer>
              )}
            </>
          )}
        </div>
      </div>

      {duelOpen && profile && (
        <DuelModal
          defenderId={userId}
          defenderName={profile.display_name ?? profile.player_tag ?? 'Jogador'}
          defenderAvatarId={profile.avatar_id}
          onClose={() => setDuelOpen(false)}
        />
      )}
    </>
  )
}
