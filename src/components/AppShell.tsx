import { useCallback, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Backpack, Home, LogOut, Sparkles, Swords, Trophy, Users } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { useSocialBadge } from '../features/social/context/SocialContext'
import { ForcedAvatarModal } from '../features/profile/components/ForcedAvatarModal'

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/forge', label: 'Equips', icon: Backpack, end: false },
  { to: '/quests', label: 'Quests', icon: Swords, end: false },
  { to: '/ranking', label: 'Ranking', icon: Trophy, end: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const { pendingInviteCount } = useSocialBadge()
  const navigate = useNavigate()

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login', { replace: true })
  }, [navigate, signOut])

  const handleOpenSocial = useCallback(() => {
    navigate('/social')
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-slate-900 shadow-xl">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold">StudyQuest</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleOpenSocial}
              aria-label="Amigos"
              title="Amigos"
              className="relative p-2 rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              {pendingInviteCount > 0 && (
                <span
                  aria-label={`${pendingInviteCount} convites pendentes`}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-slate-900 bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                >
                  {pendingInviteCount > 9 ? '9+' : pendingInviteCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              title="Sair"
              className="shrink-0 p-2 rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="px-4 pb-32 pt-4">
          <div>{children}</div>
          <div aria-hidden="true" className="h-6" />
        </main>

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
        >
          <div className="mx-auto flex max-w-md items-stretch">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    isActive
                      ? 'text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <ForcedAvatarModal />
      </div>
    </div>
  )
}