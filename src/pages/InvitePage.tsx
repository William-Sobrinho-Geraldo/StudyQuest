import { useInviteLink } from '../features/social/hooks/useInviteLink'
import { InviteAcceptModal } from '../features/social/components/InviteAcceptModal'

export function InvitePage() {
  const { pendingInvite, dismissInvite } = useInviteLink()

  if (!pendingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Processando convite...
      </div>
    )
  }

  return <InviteAcceptModal playerTag={pendingInvite.tag} onClose={dismissInvite} />
}
