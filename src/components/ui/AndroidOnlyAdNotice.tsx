import { Smartphone } from 'lucide-react'

const DEFAULT_MESSAGE =
  'O recurso de anúncios para acelerar o tempo está disponível apenas no aplicativo Android (iOS em breve).'

interface AndroidOnlyAdNoticeProps {
  message?: string
}

export function AndroidOnlyAdNotice({ message = DEFAULT_MESSAGE }: AndroidOnlyAdNoticeProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800/50 p-4">
      <Smartphone className="h-5 w-5 shrink-0 text-indigo-400" aria-hidden="true" />
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  )
}