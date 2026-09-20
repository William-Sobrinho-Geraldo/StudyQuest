import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { ConnectivityListener } from './components/ConnectivityListener'
import { useNativeBackButton } from './hooks/useNativeBackButton'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { InviteLinkHandler } from './components/InviteLinkHandler'
import { SocialProvider } from './features/social/context/SocialContext'
import { FocusOverlay } from './features/study/components/FocusOverlay'
import { VictoryModal } from './features/study/components/VictoryModal'
import { DistractionGuard } from './features/study/components/DistractionGuard'
import { StudyTimerProvider } from './features/study/context/StudyTimerContext'

// Lazy loading por rota: cada página é um chunk separado, carregado apenas
// quando o usuário navega até ela. Isso reduz o bundle e a memória no
// primeiro carregamento (dispositivos móveis).
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ForgePage = lazy(() => import('./pages/ForgePage').then((m) => ({ default: m.ForgePage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const InvitePage = lazy(() => import('./pages/InvitePage').then((m) => ({ default: m.InvitePage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const QuestsPage = lazy(() => import('./pages/QuestsPage').then((m) => ({ default: m.QuestsPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })))
const SocialPage = lazy(() => import('./pages/SocialPage').then((m) => ({ default: m.SocialPage })))
const SprintCreatePage = lazy(() => import('./pages/SprintCreatePage').then((m) => ({ default: m.SprintCreatePage })))
const SprintInvitePage = lazy(() => import('./pages/SprintInvitePage').then((m) => ({ default: m.SprintInvitePage })))
const SprintPage = lazy(() => import('./pages/SprintPage').then((m) => ({ default: m.SprintPage })))

function PageFallback() {
  return (
    <div
      role="status"
      aria-label="Carregando página"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  )
}

export function App() {
  useNativeBackButton()

  return (
    <ToastProvider>
      <ConnectivityListener />
      <AuthProvider>
        <SocialProvider>
          <StudyTimerProvider>
            <InviteLinkHandler />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forge"
                  element={
                    <ProtectedRoute>
                      <ForgePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ranking"
                  element={
                    <ProtectedRoute>
                      <LeaderboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/leaderboard" element={<Navigate to="/ranking" replace />} />
                <Route
                  path="/quests"
                  element={
                    <ProtectedRoute>
                      <QuestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/shop"
                  element={
                    <ProtectedRoute>
                      <ShopPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/social"
                  element={
                    <ProtectedRoute>
                      <SocialPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sprints/create"
                  element={
                    <ProtectedRoute>
                      <SprintCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sprints/invite"
                  element={
                    <ProtectedRoute>
                      <SprintInvitePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sprints/:id"
                  element={
                    <ProtectedRoute>
                      <SprintPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <FocusOverlay />
            <VictoryModal />
            <DistractionGuard />
          </StudyTimerProvider>
        </SocialProvider>
      </AuthProvider>
    </ToastProvider>
  )
}