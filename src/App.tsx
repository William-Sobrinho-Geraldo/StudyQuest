import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { InviteLinkHandler } from './components/InviteLinkHandler'
import { SocialProvider } from './features/social/context/SocialContext'
import { DashboardPage } from './pages/DashboardPage'
import { ForgePage } from './pages/ForgePage'
import { HistoryPage } from './pages/HistoryPage'
import { InvitePage } from './pages/InvitePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LoginPage } from './pages/LoginPage'
import { QuestsPage } from './pages/QuestsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ShopPage } from './pages/ShopPage'
import { SocialPage } from './pages/SocialPage'
import { SprintCreatePage } from './pages/SprintCreatePage'
import { SprintInvitePage } from './pages/SprintInvitePage'
import { SprintPage } from './pages/SprintPage'

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocialProvider>
          <InviteLinkHandler />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/register" element={<RegisterPage />} />
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
        </SocialProvider>
      </AuthProvider>
    </ToastProvider>
  )
}