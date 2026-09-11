import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  clearPendingInvite,
  loadPendingInvite,
  savePendingInvite,
} from '../lib/inviteStorage'
import type { PendingInvite } from '../lib/inviteStorage'

const INVITE_PARAM = 'ref'

export function useInviteLink() {
  const { status, isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null)

  useEffect(() => {
    // Aguarda o AuthContext resolver a sessão antes de decidir o fluxo.
    if (status === 'loading') return

    const refParam = searchParams.get(INVITE_PARAM)
    if (!refParam) return

    if (isAuthenticated) {
      setPendingInvite({ tag: refParam, timestamp: Date.now() })
    } else {
      savePendingInvite(refParam)
      window.location.replace('/login')
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete(INVITE_PARAM)
    setSearchParams(next, { replace: true })
  }, [status, isAuthenticated, searchParams, setSearchParams])

  const processPendingInvite = useCallback(() => {
    const stored = loadPendingInvite()
    if (stored) {
      clearPendingInvite()
      setPendingInvite(stored)
    }
  }, [])

  const dismissInvite = useCallback(() => {
    setPendingInvite(null)
  }, [])

  return { pendingInvite, dismissInvite, processPendingInvite }
}
