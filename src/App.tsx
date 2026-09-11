import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { InviteLinkHandler } from './components/InviteLinkHandler'
import { SocialProvider } from './features/social/context/SocialContext'
import { DashboardPage } from './pages/DashboardPage'
import { ForgePage } from './pages/ForgePage'
import { InvitePage } from './pages/InvitePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LoginPage } from './pages/LoginPage'
import { QuestsPage } from './pages/QuestsPage'
import { ShopPage } from './pages/ShopPage'
import { SocialPage } from './pages/SocialPage'

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocialProvider>
          <InviteLinkHandler />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite" element={<InvitePage />} />
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
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocialProvider>
      </AuthProvider>
    </ToastProvider>
  )
}