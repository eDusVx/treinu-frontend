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

type ToastTipo = 'sucesso' | 'erro' | 'info'

interface Toast {
  id: number
  tipo: ToastTipo
  mensagem: string
}

interface ToastContextValue {
  /** Atalho recomendado: passa o erro do axios direto. */
  showError: (mensagem: string) => void
  showSuccess: (mensagem: string) => void
  showInfo: (mensagem: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICON: Record<ToastTipo, typeof CheckCircle2> = {
  sucesso: CheckCircle2,
  erro: XCircle,
  info: Info,
}

const CORES: Record<ToastTipo, string> = {
  sucesso: 'bg-[#94e400]/15 text-[#94e400] border-[#94e400]/30',
  erro: 'bg-red-500/15 text-red-300 border-red-500/30',
  info: 'bg-white/10 text-white border-white/20',
}

const DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tipo: ToastTipo, mensagem: string) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, tipo, mensagem }])
      setTimeout(() => remove(id), DURATION_MS)
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (m) => push('sucesso', m),
      showError: (m) => push('erro', m),
      showInfo: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-6 right-6 z-[100] flex flex-col gap-2 max-w-md"
      >
        {toasts.map((t) => {
          const Icon = ICON[t.tipo]
          return (
            <div
              key={t.id}
              role={t.tipo === 'erro' ? 'alert' : 'status'}
              className={`flex items-start gap-3 border rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm ${CORES[t.tipo]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <span className="flex-1 text-sm leading-snug">{t.mensagem}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-white/40 hover:text-white cursor-pointer shrink-0"
                aria-label="Fechar notificação"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}

/** Hook utilitário para reduzir auto-dismiss em chamadas síncronas dentro de useEffect. */
export function useAutoToast(mensagem: string | null | undefined, tipo: ToastTipo = 'info') {
  const { showError, showSuccess, showInfo } = useToast()
  useEffect(() => {
    if (!mensagem) return
    if (tipo === 'erro') showError(mensagem)
    else if (tipo === 'sucesso') showSuccess(mensagem)
    else showInfo(mensagem)
  }, [mensagem, tipo, showError, showSuccess, showInfo])
}
