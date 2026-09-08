import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Hammer, LayoutDashboard, LogOut, Sparkles, Trophy } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/forge', label: 'Forge', icon: Hammer, end: false },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-800 bg-slate-900 px-4 py-6">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold">StudyQuest</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 pt-4">
          <p className="px-2 text-xs text-slate-400">{user?.email ?? 'Usuário'}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <main className="pl-64">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </main>
    </div>
  )
}