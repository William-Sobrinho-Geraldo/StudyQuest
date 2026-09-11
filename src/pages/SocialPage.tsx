import { useCallback, useState } from 'react'
import { Check, Copy, Loader2, Share2, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useToast } from '../components/Toast'
import { useSocial } from '../features/social/hooks/useSocial'
import {
  acceptInvite as acceptInviteRpc,
  rejectInvite as rejectInviteRpc,
  removeFriend as removeFriendRpc,
  type Friend,
} from '../features/social/services/socialService'
import { RemoveFriendModal } from '../features/social/components/RemoveFriendModal'
import {
  copyInviteLink,
  ShareAbortedError,
  shareViaWhatsApp,
} from '../features/social/lib/shareInviteLink'

export type SocialTab = 'friends' | 'pending'

const TAB_ITEMS: { id: SocialTab; label: string; icon: typeof Users }[] = [
  { id: 'friends', label: 'Meus Amigos', icon: Users },
  { id: 'pending', label: 'Convites Pendentes', icon: UserPlus },
]

function TagDisplay({ playerTag }: { playerTag: string | null }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const copyTag = useCallback(async () => {
    if (!playerTag) return
    try {
      await navigator.clipboard.writeText(playerTag)
      setCopied(true)
      showToast('Tag copiada!', 'success')
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      showToast('Não foi possível copiar a tag.', 'error')
    }
  }, [playerTag, showToast])

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sua Tag</p>
        <p className="truncate font-mono text-lg font-bold text-indigo-400">
          {playerTag ?? 'Carregando...'}
        </p>
        {!playerTag && (
          <p className="mt-1 text-xs text-slate-500">
            A tag é gerada automaticamente ao criar a conta.
          </p>
        )}
      </div>
      {playerTag && (
        <button
          type="button"
          onClick={copyTag}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copiada!' : 'Copiar Tag'}
        </button>
      )}
    </div>
  )
}

interface FriendRowProps {
  friend: { peer_id: string; peer_tag: string | null; peer_level: number }
  onRemove: () => void
}

function FriendRow({ friend, onRemove }: FriendRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
          <UserCheck className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-white">
            {friend.peer_tag ?? 'Tag indisponível'}
          </p>
          <p className="text-xs text-slate-400">Nível {friend.peer_level}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${friend.peer_tag ?? 'amigo'} da lista de amigos`}
        className="grid min-h-[44px] w-11 shrink-0 place-items-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 transition hover:bg-red-500/25"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  )
}

interface PendingInviteRowProps {
  invite: { friendship_id: string; sender_tag: string | null; sender_level: number }
  busy: boolean
  onAccept: (friendshipId: string) => Promise<void>
  onReject: (friendshipId: string) => Promise<void>
}

function PendingInviteRow({ invite, busy, onAccept, onReject }: PendingInviteRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
          <UserPlus className="h-5 w-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-white">
            {invite.sender_tag ?? 'Tag indisponível'}
          </p>
          <p className="text-xs text-slate-400">Nível {invite.sender_level}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void onAccept(invite.friendship_id)}
          disabled={busy}
          aria-label={`Aceitar convite de ${invite.sender_tag ?? 'amigo'}`}
          className="grid min-h-[44px] w-11 place-items-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserCheck className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void onReject(invite.friendship_id)}
          disabled={busy}
          aria-label={`Recusar convite de ${invite.sender_tag ?? 'amigo'}`}
          className="grid min-h-[44px] w-11 place-items-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserX className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </li>
  )
}

export function SocialPage() {
  const { showToast } = useToast()
  const { playerTag, friends, pendingInvites, loading, error, dismissPending, removeFriend, reload } = useSocial()
  const [tab, setTab] = useState<SocialTab>('friends')
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [friendPendingRemoval, setFriendPendingRemoval] = useState<Friend | null>(null)
  const [removingFriend, setRemovingFriend] = useState(false)

  const handleAccept = useCallback(
    async (friendshipId: string): Promise<void> => {
      setBusyInviteId(friendshipId)
      try {
        const result = await acceptInviteRpc(friendshipId)
        if (!result.success) {
          showToast(result.error ?? 'Erro ao aceitar convite.', 'error')
          return
        }
        dismissPending(friendshipId)
        showToast('Convite aceito! Agora vocês são amigos.', 'success')
      } catch {
        showToast('Erro inesperado ao aceitar convite.', 'error')
      } finally {
        setBusyInviteId(null)
      }
    },
    [dismissPending, showToast],
  )

  const handleReject = useCallback(
    async (friendshipId: string): Promise<void> => {
      setBusyInviteId(friendshipId)
      try {
        const result = await rejectInviteRpc(friendshipId)
        if (!result.success) {
          showToast(result.error ?? 'Erro ao recusar convite.', 'error')
          return
        }
        dismissPending(friendshipId)
        showToast('Convite recusado.', 'info')
      } catch {
        showToast('Erro inesperado ao recusar convite.', 'error')
      } finally {
        setBusyInviteId(null)
      }
    },
    [dismissPending, showToast],
  )

  const handleWhatsApp = useCallback(async () => {
    if (!playerTag) {
      showToast('Carregue a tag antes de convidar.', 'info')
      return
    }
    setSharing(true)
    try {
      const result = await shareViaWhatsApp(playerTag)
      if (result.outcome === 'whatsapp') {
        showToast('Link copiado! Abrindo WhatsApp...', 'success')
      } else {
        showToast('Compartilhamento aberto.', 'info')
      }
    } catch (err) {
      if (err instanceof ShareAbortedError) {
        return
      }
      showToast('Não foi possível compartilhar. Tente novamente.', 'error')
    } finally {
      setSharing(false)
    }
  }, [playerTag, showToast])

  const handleCopyLink = useCallback(async () => {
    if (!playerTag) {
      showToast('Carregue a tag antes de convidar.', 'info')
      return
    }
    try {
      await copyInviteLink(playerTag)
      showToast('Link de convite copiado!', 'success')
    } catch {
      showToast('Não foi possível copiar o link.', 'error')
    }
  }, [playerTag, showToast])

  const handleConfirmRemove = useCallback(async () => {
    if (!friendPendingRemoval) return
    setRemovingFriend(true)
    try {
      const result = await removeFriendRpc(friendPendingRemoval.friendship_id)
      if (!result.success) {
        showToast(result.error ?? 'Erro ao remover amigo.', 'error')
        return
      }
      removeFriend(friendPendingRemoval.peer_id)
      setFriendPendingRemoval(null)
      showToast(`${friendPendingRemoval.peer_tag ?? 'Amigo'} removido da sua lista.`, 'success')
    } catch {
      showToast('Erro inesperado ao remover amigo.', 'error')
    } finally {
      setRemovingFriend(false)
    }
  }, [friendPendingRemoval, removeFriend, showToast])

  const activeTabLabel = TAB_ITEMS.find((item) => item.id === tab)?.label ?? ''

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Social</h1>
      <p className="mt-1 text-sm text-slate-400">
        Conecte-se com amigos e monte sua party para farmar XP.
      </p>

      <div className="mt-6 space-y-4">
        <TagDisplay playerTag={playerTag} />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleWhatsApp()}
            disabled={sharing || !playerTag}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Share2 className="h-5 w-5" aria-hidden="true" />
            )}
            {sharing ? 'Abrindo WhatsApp...' : 'Convidar via WhatsApp'}
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            disabled={!playerTag}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar Link
          </button>
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Seções sociais">
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
            const count = id === 'pending' ? pendingInvites.length : friends.length
            const isActive = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(id)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                {count > 0 && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                      id === 'pending'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                    aria-label={`${count} ${id === 'pending' ? 'convites' : 'amigos'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <section aria-label={activeTabLabel} className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-sm">Carregando sua lista social...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-3 min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : tab === 'friends' ? (
            friends.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
                Nenhum amigo ainda. Compartilhe sua tag para começar!
              </p>
            ) : (
              <ul className="space-y-2">
                {friends.map((friend) => (
                  <FriendRow
                    key={friend.friendship_id}
                    friend={friend}
                    onRemove={() => setFriendPendingRemoval(friend)}
                  />
                ))}
              </ul>
            )
          ) : pendingInvites.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
              Nenhum convite pendente no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <PendingInviteRow
                  key={invite.friendship_id}
                  invite={invite}
                  busy={busyInviteId === invite.friendship_id}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {friendPendingRemoval && (
        <RemoveFriendModal
          playerTag={friendPendingRemoval.peer_tag ?? 'amigo'}
          busy={removingFriend}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            if (!removingFriend) setFriendPendingRemoval(null)
          }}
        />
      )}
    </AppShell>
  )
}