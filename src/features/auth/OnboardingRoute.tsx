import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { useAuth } from './AuthContext'

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { status, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading) {
    return <AuthLoadingScreen label="Carregando perfil" />
  }

  if (profile?.display_name) {
    return <Navigate to="/" replace />
  }

  return children
}