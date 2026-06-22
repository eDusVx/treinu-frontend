import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Largura do conteúdo. Default: max-w-lg. */
  width?: 'sm' | 'md' | 'lg' | 'xl'
  /** Texto do botão de fechar (lido por screen readers). Default: "Fechar". */
  closeLabel?: string
}

const WIDTH_CLASS: Record<NonNullable<Props['width']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const FOCUSABLE_SEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal acessível: role=dialog, aria-modal, foco aprisionado dentro do conteúdo
 * (Tab/Shift+Tab circulam), fecha com Esc, restaura foco ao elemento anterior
 * ao fechar.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'md',
  closeLabel = 'Fechar',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Salva o foco anterior e move pra dentro do modal ao abrir.
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null
    const container = containerRef.current
    if (!container) return
    const first = container.querySelector<HTMLElement>(FOCUSABLE_SEL)
    first?.focus()
    return () => {
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  // ESC e focus trap.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SEL),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [open, onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  // Trava o scroll do body enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#1c1f1d] border border-white/10 rounded-3xl p-6 w-full ${WIDTH_CLASS[width]} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">{title}</h2>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            className="w-9 h-9 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
