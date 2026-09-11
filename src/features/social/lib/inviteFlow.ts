import { acceptLinkInvite } from '../services/socialService'
import { emitFriendsChanged } from './socialEvents'
import { clearPendingInvite, loadPendingInvite } from './inviteStorage'

export interface SignupInviteOutcome {
  hadInvite: boolean
  accepted: boolean
  playerTag: string | null
}

// Executado apos a criacao da conta: vincula automaticamente o amigo do
// convite por link (se houver um pendente) e limpa o localStorage.
export async function completeSignupWithInvite(): Promise<SignupInviteOutcome> {
  const stored = loadPendingInvite()
  if (!stored) {
    return { hadInvite: false, accepted: false, playerTag: null }
  }

  clearPendingInvite()
  try {
    const result = await acceptLinkInvite(stored.tag)
    if (result.success) {
      emitFriendsChanged()
    }
    return { hadInvite: true, accepted: result.success, playerTag: stored.tag }
  } catch {
    return { hadInvite: true, accepted: false, playerTag: stored.tag }
  }
}