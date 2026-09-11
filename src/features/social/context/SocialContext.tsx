import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { fetchPendingInviteCount } from '../services/socialService'

interface SocialContextValue {
  pendingInviteCount: number
  refetchPendingInvites: () => Promise<void>
}

const SocialContext = createContext<SocialContextValue | undefined>(undefined)

const FALLBACK_VALUE: SocialContextValue = {
  pendingInviteCount: 0,
  refetchPendingInvites: async () => {},
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [pendingInviteCount, setPendingInviteCount] = useState(0)

  const refetchPendingInvites = useCallback(async (): Promise<void> => {
    const count = isAuthenticated ? await fetchPendingInviteCount() : 0
    setPendingInviteCount(count)
  }, [isAuthenticated])

  useEffect(() => {
    void refetchPendingInvites()

    const handleFocus = () => {
      void refetchPendingInvites()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchPendingInvites])

  useEffect(() => {
    if (!isAuthenticated) setPendingInviteCount(0)
  }, [isAuthenticated])

  const value = useMemo<SocialContextValue>(
    () => ({ pendingInviteCount, refetchPendingInvites }),
    [pendingInviteCount, refetchPendingInvites],
  )

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocialBadge(): SocialContextValue {
  const context = useContext(SocialContext)
  // Fallback silencioso: sem provider (ex: renderização direta em testes),
  // o badge simplesmente não aparece.
  return context ?? FALLBACK_VALUE
}