import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { supabase } from '../lib/supabase'
import { AVATAR_PRESETS } from '../lib/avatarPresets'

const NAME_MIN = 3
const NAME_MAX = 15

export function SetupHeroPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (error) setError(null)
  }

  function handleAvatarSelect(id: string) {
    setSelectedAvatar(id)
    if (error) setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const heroName = name.trim()
    if (heroName.length < NAME_MIN || heroName.length > NAME_MAX) {
      setError(`O nome do herói deve ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`)
      return
    }
    if (!selectedAvatar) {
      setError('Escolha um avatar para começar.')
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

      await refreshProfile()
      navigate('/', { replace: true })
    } catch {
      setError('Não foi possível salvar seu herói. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold">Crie seu Herói</h1>
          <p className="mt-1 text-sm text-slate-400">
            Defina seu nome e avatar para iniciar a jornada
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label htmlFor="hero-name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Nome do Herói
            </label>
            <input
              id="hero-name"
              name="displayName"
              type="text"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              maxLength={NAME_MAX}
              placeholder="Ex: Arthur, Valkiria, Magnus"
              autoComplete="off"
              className="h-12 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">
              {name.trim().length}/{NAME_MAX} caracteres
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-300">
              Escolha seu Avatar
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
                    onClick={() => handleAvatarSelect(id)}
                    aria-label={`Avatar ${label}`}
                    className={`relative flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
                        : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}
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
            {saving ? 'Criando herói...' : 'Começar Jornada'}
          </button>
        </form>
      </div>
    </div>
  )
}