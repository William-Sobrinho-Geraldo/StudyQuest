import { useState, type FormEvent } from 'react'
import { Check, Crown, Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../features/auth/AuthContext'
import { supabase } from '../lib/supabase'
import { AVATAR_PRESETS, getAvatarPreset } from '../lib/avatarPresets'

const NAME_MIN = 3
const NAME_MAX = 15

interface EditHeroModalProps {
  currentName: string
  currentAvatar: string | null
  onClose: () => void
  onSaved: () => void
}

function EditHeroModal({ currentName, currentAvatar, onClose, onSaved }: EditHeroModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(currentName)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar)
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
    if (!user) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: heroName, avatar_id: selectedAvatar })
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
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
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
              className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {name.trim().length}/{NAME_MAX} caracteres
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-300">
              Avatar
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {AVATAR_PRESETS.map(({ id, label, icon: Icon }) => {
                const isSelected = selectedAvatar === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => { setSelectedAvatar(id); if (error) setError(null) }}
                    aria-label={`Avatar ${label}`}
                    className={`relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
                        : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    {label}
                    {isSelected && (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-indigo-500">
                        <Check className="h-3 w-3 text-white" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
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
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { profile, profileLoading, refreshProfile, user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)

  const preset = getAvatarPreset(profile?.avatar_id)
  const IconComponent = preset?.icon
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

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

  return (
    <AppShell>
      <div className="flex flex-col items-center gap-4 pt-4">
        {IconComponent ? (
          <div
            data-testid="hero-avatar-preset"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg ring-4 ring-indigo-500/30"
          >
            <IconComponent className="h-12 w-12 text-white" aria-hidden="true" />
          </div>
        ) : (
          <div
            data-testid="hero-avatar-fallback"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white shadow-lg ring-4 ring-indigo-500/30"
          >
            {initial}
          </div>
        )}

        <h1 className="text-2xl font-bold">{profile?.display_name ?? user?.email?.split('@')[0] ?? 'Aventureiro'}</h1>

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
          className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar Herói
        </button>
      </div>

      <section className="mt-8">
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
                  className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition ${
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

      {editOpen && (
        <EditHeroModal
          currentName={profile?.display_name ?? ''}
          currentAvatar={profile?.avatar_id ?? null}
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
