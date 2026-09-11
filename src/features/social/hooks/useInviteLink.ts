import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  clearPendingInvite,
  loadPendingInvite,
  savePendingInvite,
} from '../lib/inviteStorage'
import type { PendingInvite } from '../lib/inviteStorage'

const INVITE_PARAM = 'ref'

// Captura global de convites por link (?ref=<player_tag>) em qualquer rota.
// Sempre grava no localStorage antes de limpar a URL, para que o fluxo
// sobreviva a navegações/refreshes:
//  - deslogado  -> salva e redireciona para /register (com opção de /login)
//  - logado     -> salva e abre o InviteAcceptModal para confirmação manual
export function useInviteLink() {
  const { status, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    const refParam = searchParams.get(INVITE_PARAM)
    if (!refParam) return

    savePendingInvite(refParam)

    const next = new URLSearchParams(searchParams)
    next.delete(INVITE_PARAM)
    setSearchParams(next, { replace: true })

    if (isAuthenticated) {
      setPendingInvite({ tag: refParam, timestamp: Date.now() })
      navigate('/', { replace: true })
    } else {
      navigate('/register', { replace: true })
    }
  }, [status, isAuthenticated, searchParams, setSearchParams, navigate])

  // Chamado apos um login: reabre o modal a partir do convite salvo.
  // O localStorage so e removido apos o aceite (ou ao dispensar o modal).
  const processPendingInvite = useCallback(() => {
    const stored = loadPendingInvite()
    if (stored) {
      setPendingInvite(stored)
    }
  }, [])

  const dismissInvite = useCallback(() => {
    clearPendingInvite()
    setPendingInvite(null)
  }, [])

  return { pendingInvite, dismissInvite, processPendingInvite }
}