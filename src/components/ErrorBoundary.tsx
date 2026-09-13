import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro fatal:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-red-500/15 text-3xl" aria-hidden="true">
              ⚔️
            </div>
            <h1 className="mt-5 text-2xl font-bold">Ops, algo deu errado</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sua jornada foi interrompida por um erro inesperado. Recarregue o aplicativo para
              continuar de onde parou.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-base font-semibold text-white transition hover:bg-indigo-500"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
