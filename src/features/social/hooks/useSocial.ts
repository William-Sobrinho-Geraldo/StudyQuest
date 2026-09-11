import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../../lib/supabase'
import type { Friend, PendingInvite } from '../services/socialService'
import {
  fetchFriends,
  fetchMyPlayerTag,
  fetchPendingInvites,
} from '../services/socialService'
import { useSocialBadge } from '../context/SocialContext'

export interface SocialState {
  playerTag: string | null
  friends: Friend[]
  pendingInvites: PendingInvite[]
  loading: boolean
  error: string | null
  dismissPending: (friendshipId: string) => void
  removeFriend: (friendshipId: string) => void
  reload: () => Promise<void>
}

interface FriendshipRecord {
  id?: string
  user_id?: string
  friend_id?: string
  status?: string
}

function isInvolved(record: FriendshipRecord | null | undefined, selfId: string): boolean {
  if (!record) return false
  return record.user_id === selfId || record.friend_id === selfId
}

export function useSocial(): SocialState {
  const { user, isAuthenticated } = useAuth()
  const { refetchPendingInvites } = useSocialBadge()

  const [playerTag, setPlayerTag] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (refreshBadge = false): Promise<void> => {
    setError(null)
    try {
      const [tag, friendsList, invites] = await Promise.all([
        fetchMyPlayerTag(),
        fetchFriends(),
        fetchPendingInvites(),
      ])
      setPlayerTag(tag)
      setFriends(friendsList)
      setPendingInvites(invites)
      if (refreshBadge) await refetchPendingInvites()
    } catch (err) {
      setError('Não foi possível carregar sua lista social. Tente novamente.')
      console.error('useSocial: falha ao carregar dados sociais', err)
    } finally {
      setLoading(false)
    }
  }, [refetchPendingInvites])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime: sem necessidade de recarregar a pagina para ver a amizade aceita.
  // A RLS (SELECT) de friendships ja filtra os eventos para as relacoes que
  // envolvem o usuario logado; o guard abaixo e uma camada extra de seguranca.
  const selfIdRef = useRef<string | null>(null)
  const loadRef = useRef(load)
  loadRef.current = load
  selfIdRef.current = user?.id ?? null

  useEffect(() => {
    if (!isAuthenticated) return

    const channel = supabase
      .channel('social-friendships')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        (payload) => {
          const selfId = selfIdRef.current
          if (!selfId) return
          const oldRecord = (payload.old as FriendshipRecord | undefined) ?? null
          const newRecord = (payload.new as FriendshipRecord | undefined) ?? null
          if (!isInvolved(oldRecord, selfId) && !isInvolved(newRecord, selfId)) return

          const statusChangedToAccepted =
            newRecord?.status === 'accepted' &&
            (payload.eventType === 'INSERT' || oldRecord?.status !== 'accepted')

          if (statusChangedToAccepted && oldRecord?.status === 'pending') {
            // Sincronia imediata: tira do "pendentes" sem refetch e recarrega
            // a lista principal em background (o payload nao traz tag/nivel).
            setPendingInvites((current) =>
              current.filter((invite) => invite.friendship_id !== newRecord.id),
            )
          }
          void loadRef.current(true)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  const dismissPending = useCallback(
    (friendshipId: string) => {
      setPendingInvites((current) => current.filter((invite) => invite.friendship_id !== friendshipId))
      void refetchPendingInvites()
    },
    [refetchPendingInvites],
  )

  const removeFriend = useCallback((friendId: string) => {
    setFriends((current) => current.filter((friend) => friend.peer_id !== friendId))
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    await load(true)
  }, [load])

  return {
    playerTag,
    friends,
    pendingInvites,
    loading,
    error,
    dismissPending,
    removeFriend,
    reload,
  }
}