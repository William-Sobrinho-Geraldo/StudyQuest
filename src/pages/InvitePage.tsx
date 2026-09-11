// Rota de destino dos links de convite (/invite?ref=<tag>).
// O processamento e feito globalmente pelo InviteLinkHandler, que captura o
// ref, limpa a URL e redireciona (register para deslogados, dashboard + modal
// para logados). Esta tela evita que o roteador caia no catch-all que removeria
// o query string antes da captura.
export function InvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      <p className="text-sm">
        Processando convite...
      </p>
    </div>
  )
}