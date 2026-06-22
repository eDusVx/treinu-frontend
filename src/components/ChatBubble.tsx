import type { MensagemChatDto } from '../types'
import { formatHora } from '../utils'

interface Props {
  mensagem: MensagemChatDto
  /** True quando o remetente é o próprio usuário logado. */
  propria: boolean
}

/**
 * Bolha de mensagem do chat. Própria à direita (verde com contorno);
 * recebida à esquerda (verde sólido). Ambas mostram o horário de envio.
 */
export default function ChatBubble({ mensagem, propria }: Props) {
  return (
    <div className={`flex ${propria ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          propria ? 'border-2 border-[#94e400] text-white' : 'bg-[#94e400] text-black'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
            propria ? 'text-white/60' : 'text-black/60'
          }`}
        >
          <span>{formatHora(mensagem.dataEnvio)}</span>
        </div>
      </div>
    </div>
  )
}
