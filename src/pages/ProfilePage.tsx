import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Crown, Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { UserAvatar } from '../components/UserAvatar'
import { useAuth } from '../features/auth/AuthContext'
import { AvatarPicker } from '../features/profile/components/AvatarPicker'
import { supabase } from '../lib/supabase'
import { AVATARS, DEFAULT_UNLOCKED_AVATARS } from '../utils/avatars'
import { getLevelProgress } from '../utils/leveling'
import {
  computeCombatTotals,
  formatStudyDuration,
  type EquippedItemStatInput,
} from '../utils/equippedStats'
import type { ForgeRarity } from '../features/forge/lib/forgeItems'
import type { EquipmentSlot } from '../features/forge/lib/forgeRules'

const NAME_MIN = 3
const NAME_MAX = 15
const GOAL_MAX = 50
const BIO_MAX = 120

interface EquippedRow {
  item_category: string
  item_level: number
  enhancement_level: number
  rarity: string | null
}

interface EditHeroModalProps {
  currentName: string
  currentAvatar: string | null
  currentGoal: string | null
  currentBio: string | null
  unlockedAvatars: readonly string[]
  onClose: () => void
  onSaved: () => void
}

function EditHeroModal({
  currentName,
  currentAvatar,
  currentGoal,
  currentBio,
  unlockedAvatars,
  onClose,
  onSaved,
}: EditHeroModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(currentName)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar)
  const [goal, setGoal] = useState(currentGoal ?? '')
  const [bio, setBio] = useState(currentBio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const heroName = name.trim()
    if (heroName.length < NAME_MIN || heroName.length > NAME_MAX) {
      setError(`O nome do herói deve ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`)
      return
    }
    if (!selectedAvatar) {
      setError('Escolha um avatar.')
      return
    }
    if (goal.trim().length > GOAL_MAX) {
      setError(`O objetivo de estudo deve ter no máximo ${GOAL_MAX} caracteres.`)
      return
    }
    if (bio.trim().length > BIO_MAX) {
      setError(`A bio deve ter no máximo ${BIO_MAX} caracteres.`)
      return
    }
    if (!user) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: heroName,
          avatar_id: selectedAvatar,
          study_goal: goal.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      onSaved()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-hero-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <Pencil className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h2 id="edit-hero-title" className="text-xl font-bold">
              Editar Herói
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-11 w-11 touch-manipulation select-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="edit-hero-name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Nome do Herói
            </label>
            <input
              id="edit-hero-name"
              name="displayName"
              type="text"
              value={name}
              onChange={(event) => { setName(event.target.value); if (error) setError(null) }}
              maxLength={NAME_MAX}
              autoComplete="off"
              enterKeyHint="next"
              className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {name.trim().length}/{NAME_MAX} caracteres
            </p>
          </div>

          <div>
            <label htmlFor="edit-hero-goal" className="mb-1.5 block text-sm font-medium text-slate-300">
              Objetivo de Estudo
            </label>
            <input
              id="edit-hero-goal"
              name="studyGoal"
              type="text"
              value={goal}
              onChange={(event) => { setGoal(event.target.value); if (error) setError(null) }}
              maxLength={GOAL_MAX}
              placeholder="Concurso / OAB / Dev Pleno"
              autoComplete="off"
              enterKeyHint="done"
              className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {goal.trim().length}/{GOAL_MAX} caracteres
            </p>
          </div>

          <div>
            <label htmlFor="edit-hero-bio" className="mb-1.5 block text-sm font-medium text-slate-300">
              Bio
            </label>
            <textarea
              id="edit-hero-bio"
              name="bio"
              value={bio}
              onChange={(event) => { setBio(event.target.value); if (error) setError(null) }}
              maxLength={BIO_MAX}
              rows={3}
              placeholder="Uma frase de efeito que te apresente."
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {bio.trim().length}/{BIO_MAX} caracteres
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-300">
              Avatar
            </legend>
            <AvatarPicker
              avatars={AVATARS}
              selectedId={selectedAvatar}
              unlockedIds={unlockedAvatars}
              onSelect={(id) => {
                setSelectedAvatar(id)
                if (error) setError(null)
              }}
            />
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex min-h-[44px] w-full touch-manipulation select-none items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 active:scale-95 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FocusMetricCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: string
  label: string
  value: string
  testId: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-xl" aria-hidden="true">
        {icon}
      </div>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
      <p data-testid={testId} className="mt-0.5 text-base font-bold text-white">
        {value}
      </p>
    </div>
  )
}

export function ProfilePage() {
  const { profile, profileLoading, refreshProfile, user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)

  const [equippedItems, setEquippedItems] = useState<EquippedItemStatInput[]>([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [questsCompleted, setQuestsCompleted] = useState(0)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let active = true

    async function load() {
      const [inventoryResult, sessionsResult, questsResult] = await Promise.all([
        supabase
          .from('inventory')
          .select('item_category, item_level, enhancement_level, rarity')
          .eq('user_id', userId)
          .eq('equipped', true),
        supabase.from('study_sessions').select('duration_minutes').eq('user_id', userId),
        supabase.from('quest_claims').select('quest_id').eq('user_id', userId),
      ])

      if (!active) return

      const rows = (inventoryResult.data ?? []) as EquippedRow[]
      const equipped = rows
        .filter((row) => row.item_category !== 'supply_chest')
        .map((row) => ({
          category: row.item_category as EquipmentSlot,
          level: row.item_level,
          rarity: (row.rarity as ForgeRarity | undefined) ?? undefined,
          enhancementLevel: row.enhancement_level,
        }))

      const sessions = (sessionsResult.data ?? []) as { duration_minutes: number }[]
      const total = sessions.reduce((acc, session) => acc + (session.duration_minutes ?? 0), 0)
      const quests = (questsResult.data ?? []) as { quest_id: string }[]

      setEquippedItems(equipped)
      setTotalMinutes(total)
      setSessionCount(sessions.length)
      setQuestsCompleted(quests.length)
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  const totals = useMemo(() => computeCombatTotals(equippedItems), [equippedItems])

  const { level, xpIntoLevel, xpForNextLevel, progress } = getLevelProgress(
    profile?.current_xp ?? 0,
  )

  async function handleEquipTitle(title: string) {
    if (!user || title === profile?.equipped_title) return
    await supabase
      .from('profiles')
      .update({ equipped_title: title })
      .eq('id', user.id)
    await refreshProfile()
  }

  if (profileLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-hidden="true" />
        </div>
      </AppShell>
    )
  }

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Aventureiro'

  return (
    <AppShell>
      <div className="flex flex-col">
        <section className="flex flex-col items-center gap-3 pt-4">
          <UserAvatar
            avatarId={profile?.avatar_id}
            name={displayName}
            className="h-24 w-24 rounded-full shadow-lg ring-4 ring-indigo-500/30"
          />

          <h1 className="text-2xl font-bold">{displayName}</h1>

          {profile?.equipped_title && (
            <span
              data-testid="equipped-title-badge"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              {profile.equipped_title}
            </span>
          )}

          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mt-1 flex min-h-[44px] touch-manipulation select-none items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white active:scale-95"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar Herói
          </button>

          <div className="mt-3 w-full max-w-xs">
            <div
              role="progressbar"
              aria-label="Progresso para o próximo nível"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-3 w-full overflow-hidden rounded-full bg-slate-800"
            >
              <div
                data-testid="profile-progress-fill"
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span data-testid="profile-level">Nv. {level}</span>
              <span data-testid="profile-xp">
                {xpIntoLevel} / {xpForNextLevel} XP
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 w-full">
          <div className="flex justify-center">
            {profile?.study_goal ? (
              <span
                data-testid="study-goal-badge"
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300"
              >
                <span aria-hidden="true">🎯</span>
                Foco: {profile.study_goal}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Definir objetivo de estudo</span>
            )}
          </div>
          <p className="mt-2 px-4 text-center text-sm italic text-gray-300">
            {profile?.bio || 'Sem apresentação. Toque em Editar Herói para adicionar uma bio.'}
          </p>
        </section>

        <section className="my-3 w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="grid grid-cols-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg" aria-hidden="true">⚔️</span>
              <span className="text-xs text-slate-400">Ataque</span>
              <span data-testid="combat-attack" className="text-sm font-bold text-green-400">
                {totals.attack}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-slate-800">
              <span className="text-lg" aria-hidden="true">🛡️</span>
              <span className="text-xs text-slate-400">Defesa</span>
              <span data-testid="combat-defense" className="text-sm font-bold text-green-400">
                {totals.defense}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg" aria-hidden="true">❤️</span>
              <span className="text-xs text-slate-400">HP</span>
              <span data-testid="combat-hp" className="text-sm font-bold text-green-400">
                {totals.hp}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 w-full">
          <h2 className="mb-2 text-lg font-bold">Estatísticas de Foco</h2>
          <div className="my-2 grid grid-cols-2 gap-2.5">
            <FocusMetricCard
              icon="⏱️"
              label="Tempo Total"
              value={formatStudyDuration(totalMinutes)}
              testId="focus-total-time"
            />
            <FocusMetricCard icon="📚" label="Sessões" value={String(sessionCount)} testId="focus-sessions" />
            <FocusMetricCard
              icon="🔥"
              label="Sequência"
              value={`${profile?.current_streak ?? 0} dias`}
              testId="focus-streak"
            />
            <FocusMetricCard
              icon="🎯"
              label="Quests Concluídas"
              value={String(questsCompleted)}
              testId="focus-quests"
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Títulos</h2>
          {(!profile?.unlocked_titles || profile.unlocked_titles.length === 0) ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
              Nenhum título desbloqueado ainda. Vença Sprints para ganhar honrarias.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {profile.unlocked_titles.map((title) => {
                const isEquipped = title === profile.equipped_title
                return (
                  <button
                    key={title}
                    type="button"
                    aria-pressed={isEquipped}
                    onClick={() => handleEquipTitle(title)}
                    className={`relative flex min-h-[64px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition active:scale-95 ${
                      isEquipped
                        ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Crown
                      className={`h-5 w-5 ${isEquipped ? 'text-amber-400' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    <span>{title}</span>
                    {isEquipped && (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-indigo-500">
                        <Check className="h-3 w-3 text-white" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {editOpen && (
        <EditHeroModal
          currentName={profile?.display_name ?? ''}
          currentAvatar={profile?.avatar_id ?? null}
          currentGoal={profile?.study_goal ?? null}
          currentBio={profile?.bio ?? null}
          unlockedAvatars={profile?.unlocked_avatars ?? DEFAULT_UNLOCKED_AVATARS}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            await refreshProfile()
            setEditOpen(false)
          }}
        />
      )}
    </AppShell>
  )
}
