import { supabase } from '../../../lib/supabase'

export interface InviteResult {
  success: boolean
  error?: string
  friendship_id?: string
}

export interface Friend {
  friendship_id: string
  peer_id: string
  peer_tag: string | null
  peer_level: number
  peer_xp: number
  created_at: string
}

export interface PendingInvite {
  friendship_id: string
  sender_id: string
  sender_tag: string | null
  sender_level: number
  sender_xp: number
  created_at: string
}

function parseRpcResult(data: unknown): InviteResult {
  const result = data as Record<string, unknown> | null
  if (!result) {
    return { success: true }
  }
  if (result.error) {
    return { success: false, error: result.error as string }
  }
  return {
    success: true,
    friendship_id: result.friendship_id as string | undefined,
  }
}

export async function sendInviteByTag(targetTag: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('send_invite_by_tag', {
    p_target_tag: targetTag,
  })
  if (error) return { success: false, error: error.message }
  return parseRpcResult(data)
}

export async function acceptInvite(friendshipId: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('accept_invite', {
    p_friendship_id: friendshipId,
  })
  if (error) return { success: false, error: error.message }
  return parseRpcResult(data)
}

export async function acceptLinkInvite(senderTag: string): Promise<InviteResult> {
  const { data: userData } = await supabase.auth.getUser()
  const receiverId = userData.user?.id
  if (!receiverId) return { success: false, error: 'not_authenticated' }

  const { data, error } = await supabase.rpc('accept_link_invite', {
    p_sender_tag: senderTag,
    p_receiver_id: receiverId,
  })
  if (error) return { success: false, error: error.message }
  return parseRpcResult(data)
}

export async function rejectInvite(friendshipId: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('reject_invite', {
    p_friendship_id: friendshipId,
  })
  if (error) return { success: false, error: error.message }
  return parseRpcResult(data)
}

export async function removeFriend(friendshipId: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('remove_friend', {
    p_friendship_id: friendshipId,
  })
  if (error) return { success: false, error: error.message }
  return parseRpcResult(data)
}

export async function fetchFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('get_friends')
  if (error) throw error
  return (data ?? []) as Friend[]
}

export async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase.rpc('get_pending_invites')
  if (error) throw error
  return (data ?? []) as PendingInvite[]
}

export async function fetchPendingInviteCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_invites')
  if (error) return 0
  return (data as number | null) ?? 0
}

export async function fetchMyPlayerTag(): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('player_tag')
    .maybeSingle()
  if (error) return null
  return data?.player_tag ?? null
}