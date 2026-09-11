const PENDING_INVITE_KEY = 'studyquest_pending_invite' as const

export interface PendingInvite {
  tag: string
  timestamp: number
}

export function savePendingInvite(tag: string): void {
  const payload: PendingInvite = { tag, timestamp: Date.now() }
  localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(payload))
}

export function loadPendingInvite(): PendingInvite | null {
  const raw = localStorage.getItem(PENDING_INVITE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingInvite
    if (typeof parsed.tag === 'string' && parsed.tag.length > 0) return parsed
    return null
  } catch {
    return null
  }
}

export function clearPendingInvite(): void {
  localStorage.removeItem(PENDING_INVITE_KEY)
}
