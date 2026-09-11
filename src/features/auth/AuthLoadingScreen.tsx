export function AuthLoadingScreen({ label = 'Carregando sessão' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300"
    >
      <p>{label}...</p>
    </div>
  )
}