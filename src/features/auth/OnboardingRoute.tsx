import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { useAuth } from './AuthContext'

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { status, profile, profileLoading } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (profileLoading) {
    return <AuthLoadingScreen label="Carregando perfil" />
  }

  if (profile?.display_name) {
    return <Navigate to="/" replace />
  }

  return children
}