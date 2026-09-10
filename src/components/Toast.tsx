import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

export type ToastTone = 'success' | 'info' | 'error'

interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const TOAST_DURATION_MS = 4_000

const TONE_STYLES: Record<ToastTone, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  },
  error: {
    container: 'border-red-500/30 bg-red-500/10 text-red-300',
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
  },
  info: {
    container: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      for (const timeoutId of timeouts) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, message, tone }])
      const timeoutId = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS)
      timeoutsRef.current.push(timeoutId)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto flex w-full max-w-md flex-col gap-2 px-4"
      >
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone]
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm font-medium shadow-lg ${tone.container}`}
            >
              <span className="mt-0.5 shrink-0">{tone.icon}</span>
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                aria-label="Fechar notificação"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-current/70 transition hover:text-current"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider')
  }
  return context
}