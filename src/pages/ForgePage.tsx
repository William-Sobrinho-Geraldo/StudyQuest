import { Hammer } from 'lucide-react'
import { AppShell } from '../components/AppShell'

export function ForgePage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Forge</h1>
      <p className="mt-1 text-sm text-slate-400">Forje seu conhecimento, uma quest por vez.</p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 p-16 text-center">
        <Hammer className="h-10 w-10 text-indigo-400" aria-hidden="true" />
        <p className="mt-4 font-medium">Em breve: criação de quests.</p>
      </div>
    </AppShell>
  )
}