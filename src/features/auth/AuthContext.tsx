import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type Profile = Database['public']['Tables']['profiles']['Row']

export interface SignInResult {
  error?: string
  needsEmailConfirmation?: boolean
}

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  profile: Profile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  setProcessPendingInvite: (fn: () => void) => void
  processPendingInvite: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const pendingInviteHandlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const activeSession = data.session ?? null
      setUser(activeSession?.user ?? null)
      setStatus(activeSession ? 'authenticated' : 'unauthenticated')
    }

    void restoreSession()

    const { data: listenerData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    const subscription = listenerData?.subscription

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfileLoading(false)
    if (!error) {
      setProfile(data ?? null)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      if (status !== 'loading') {
        setProfileLoading(false)
      }
      return
    }
    void loadProfile(user.id)
  }, [user, status, loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message }
    }
    if (data.session) {
      setUser(data.session.user)
      setStatus('authenticated')
    }
    return {}
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return { error: error.message }
    }
    if (data.session) {
      setUser(data.session.user)
      setStatus('authenticated')
      return {}
    }
    return { needsEmailConfirmation: true }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const setProcessPendingInvite = useCallback((fn: () => void) => {
    pendingInviteHandlerRef.current = fn
  }, [])

  const processPendingInvite = useCallback(() => {
    pendingInviteHandlerRef.current?.()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      profile,
      profileLoading,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      setProcessPendingInvite,
      processPendingInvite,
    }),
    [
      user,
      status,
      profile,
      profileLoading,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      setProcessPendingInvite,
      processPendingInvite,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}