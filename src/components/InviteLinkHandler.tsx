import { useEffect } from 'react'
import { useAuth } from '../features/auth/AuthContext'
import { useInviteLink } from '../features/social/hooks/useInviteLink'
import { InviteAcceptModal } from '../features/social/components/InviteAcceptModal'

export function InviteLinkHandler() {
  const { setProcessPendingInvite } = useAuth()
  const { pendingInvite, dismissInvite, processPendingInvite } = useInviteLink()

  useEffect(() => {
    setProcessPendingInvite(processPendingInvite)
    return () => setProcessPendingInvite(() => {})
  }, [setProcessPendingInvite, processPendingInvite])

  if (!pendingInvite) return null

  return <InviteAcceptModal playerTag={pendingInvite.tag} onClose={dismissInvite} />
}
