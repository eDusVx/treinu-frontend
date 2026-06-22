import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmação modal estilizada (substitui window.confirm).
 * Acessibilidade herdada do Modal (role=dialog, ESC, focus trap).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 text-white hover:bg-red-600'
      : 'bg-[#94e400] text-black hover:bg-[#a4f400]'

  return (
    <Modal open={open} onClose={loading ? () => {} : onCancel} title={title} width="sm">
      <div className="flex items-start gap-3 mb-5">
        {variant === 'danger' && (
          <span className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </span>
        )}
        <p className="text-white/80 text-sm leading-relaxed flex-1">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="text-white/70 hover:text-white font-medium px-5 py-2.5 disabled:opacity-50 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`font-extrabold rounded-full px-7 py-2.5 disabled:opacity-60 cursor-pointer ${confirmClass}`}
        >
          {loading ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
