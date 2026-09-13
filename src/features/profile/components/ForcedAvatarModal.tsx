import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../../lib/supabase'
import { AVATARS } from '../../../utils/avatars'
import { AvatarPicker } from './AvatarPicker'

const COMMON_AVATARS = AVATARS.filter((avatar) => avatar.rarity === 'comum')
const COMMON_IDS = COMMON_AVATARS.map((avatar) => avatar.id)

export function ForcedAvatarModal() {
  const { user, profile, profileLoading, refreshProfile } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profileLoading || !profile) return null
  if (profile.avatar_id !== null) return null

  async function handleConfirm() {
    if (!user || !selectedId) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_id: selectedId })
      .eq('id', user.id)

    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }

    await refreshProfile()
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forced-avatar-title"
    >
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h2 id="forced-avatar-title" className="text-xl font-bold">
            Escolha seu Avatar
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Selecione um avatar para começar sua jornada.
          </p>
        </div>

        <AvatarPicker
          avatars={COMMON_AVATARS}
          selectedId={selectedId}
          unlockedIds={COMMON_IDS}
          onSelect={setSelectedId}
        />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !selectedId}
          className="mt-6 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {saving ? 'Salvando...' : 'Confirmar Avatar'}
        </button>
      </div>
    </div>
  )
}
