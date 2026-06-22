import { useCallback, useEffect, useRef, useState } from 'react'
import {
  chatRealtimeService,
  type ChatConnectionStatus,
} from '../services/chat-realtime.service'
import { chatService } from '../services/chat.service'
import type { MensagemChatDto, SalaChatDto } from '../types'

/**
 * Encapsula toda a lógica de tempo real do chat — listeners, estado de
 * digitando, contadores não lidos, debounce do "digitando…", entrada/saída
 * automática nas salas e cleanup.
 *
 * Uso na página de Mensagens: substitui ~150 linhas de useEffect espalhados
 * pela página por um hook coeso e testável.
 */
export interface UseChatRealtimeArgs {
  /** ID do usuário logado — usado para deduplicar a própria mensagem e ignorar próprio "digitando". */
  usuarioId: string | undefined
  /** ID da sala atualmente aberta (a que recebe broadcasts NovaMensagem). */
  salaAtivaId: string | null
  /** Setter para mensagens — o hook faz append/dedup. */
  setMensagens: (updater: (prev: MensagemChatDto[]) => MensagemChatDto[]) => void
  /** Setter para salas — o hook atualiza contadores `naoLidas`. */
  setSalas: (updater: (prev: SalaChatDto[]) => SalaChatDto[]) => void
  /** Refetch da lista de salas (chamado quando uma sala desconhecida envia notificação). */
  carregarSalas: () => Promise<void>
}

export interface UseChatRealtimeReturn {
  /** Status atual da conexão SignalR (Connected/Reconnecting/...). */
  connectionStatus: ChatConnectionStatus
  /** Mapa salaId → array de { usuarioId, nome } digitando agora (excluindo o próprio). */
  digitandoPorSala: Record<string, { usuarioId: string; nome?: string }[]>
  /** Chamar a cada keystroke do input — gerencia debounce de "digitando". */
  notificarDigitando: () => void
  /** Para imediatamente o "digitando" (ao enviar mensagem ou perder foco). */
  pararDeDigitar: () => void
}

const DIGITANDO_DEBOUNCE_MS = 3000
const DIGITANDO_FAILSAFE_MS = 5000

export function useChatRealtime({
  usuarioId,
  salaAtivaId,
  setMensagens,
  setSalas,
  carregarSalas,
}: UseChatRealtimeArgs): UseChatRealtimeReturn {
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>(
    () => chatRealtimeService.getStatus(),
  )
  const [digitandoPorSala, setDigitandoPorSala] = useState<
    Record<string, { usuarioId: string; nome?: string }[]>
  >({})

  const salaAtivaIdRef = useRef<string | null>(salaAtivaId)
  salaAtivaIdRef.current = salaAtivaId

  const usuarioIdRef = useRef<string | undefined>(usuarioId)
  usuarioIdRef.current = usuarioId

  // Refs para gerenciar o "digitando" do próprio usuário (debounce de 3s).
  const digitandoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const digitandoAtivoRef = useRef(false)
  // Failsafe: se o "PararDigitando" do remoto não chegar (queda), removemos
  // o indicador após 5s sem evento novo.
  const timeoutsRemotoRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const pararDeDigitar = useCallback(() => {
    if (digitandoTimerRef.current) {
      clearTimeout(digitandoTimerRef.current)
      digitandoTimerRef.current = null
    }
    if (digitandoAtivoRef.current && salaAtivaIdRef.current) {
      digitandoAtivoRef.current = false
      chatRealtimeService.pararDigitando(salaAtivaIdRef.current).catch(() => {
        /* ignore */
      })
    }
  }, [])

  const notificarDigitando = useCallback(() => {
    const salaId = salaAtivaIdRef.current
    if (!salaId) return
    if (!digitandoAtivoRef.current) {
      digitandoAtivoRef.current = true
      chatRealtimeService.notificarDigitando(salaId).catch(() => {
        /* ignore */
      })
    }
    if (digitandoTimerRef.current) clearTimeout(digitandoTimerRef.current)
    digitandoTimerRef.current = setTimeout(pararDeDigitar, DIGITANDO_DEBOUNCE_MS)
  }, [pararDeDigitar])

  // ─── Conexão e listeners do SignalR ────────────────────────────────────
  useEffect(() => {
    if (!usuarioId) return

    chatRealtimeService.connect().catch(() => {
      /* sem realtime — UI continua usável via REST */
    })

    const unsubStatus = chatRealtimeService.onStatusChange(setConnectionStatus)

    const unsubMensagem = chatRealtimeService.onNovaMensagem((m) => {
      setMensagens((prev) => {
        const ativa = salaAtivaIdRef.current
        if (!ativa || m.salaId !== ativa) return prev
        if (prev.some((x) => x.id === m.id)) return prev
        return [...prev, m].sort(
          (a, b) => new Date(a.dataEnvio).getTime() - new Date(b.dataEnvio).getTime(),
        )
      })
      // Auto-marca como lida se for de outro usuário e a sala está aberta.
      const meuId = usuarioIdRef.current
      if (m.salaId === salaAtivaIdRef.current && m.remetenteId !== meuId) {
        chatService.marcarComoLida(m.salaId).catch(() => {
          /* ignore */
        })
      }
    })

    const unsubNotificacao = chatRealtimeService.onNovaNotificacaoChat((n) => {
      setSalas((prev) => {
        const existe = prev.some((s) => s.id === n.salaId)
        if (!existe) {
          // Sala nova/desconhecida — refetch para puxar dados completos.
          carregarSalas()
          return prev
        }
        return prev.map((s) =>
          s.id === n.salaId ? { ...s, naoLidas: n.mensagensNaoLidas } : s,
        )
      })
    })

    const unsubDigitando = chatRealtimeService.onUsuarioDigitando((d) => {
      if (d.usuarioId === usuarioIdRef.current) return
      setDigitandoPorSala((prev) => {
        const existentes = prev[d.salaId] ?? []
        if (existentes.some((x) => x.usuarioId === d.usuarioId)) return prev
        return {
          ...prev,
          [d.salaId]: [...existentes, { usuarioId: d.usuarioId, nome: d.nome }],
        }
      })
      const key = `${d.salaId}:${d.usuarioId}`
      const map = timeoutsRemotoRef.current
      const anterior = map.get(key)
      if (anterior) clearTimeout(anterior)
      const t = setTimeout(() => {
        setDigitandoPorSala((prev) => ({
          ...prev,
          [d.salaId]: (prev[d.salaId] ?? []).filter((x) => x.usuarioId !== d.usuarioId),
        }))
        map.delete(key)
      }, DIGITANDO_FAILSAFE_MS)
      map.set(key, t)
    })

    const unsubParou = chatRealtimeService.onUsuarioParouDigitando((d) => {
      const key = `${d.salaId}:${d.usuarioId}`
      const t = timeoutsRemotoRef.current.get(key)
      if (t) {
        clearTimeout(t)
        timeoutsRemotoRef.current.delete(key)
      }
      setDigitandoPorSala((prev) => ({
        ...prev,
        [d.salaId]: (prev[d.salaId] ?? []).filter((x) => x.usuarioId !== d.usuarioId),
      }))
    })

    return () => {
      unsubStatus()
      unsubMensagem()
      unsubNotificacao()
      unsubDigitando()
      unsubParou()
    }
  }, [usuarioId, setMensagens, setSalas, carregarSalas])

  // ─── EntrarNaSala / SairDaSala quando a sala ativa muda ────────────────
  useEffect(() => {
    if (!salaAtivaId) return
    chatRealtimeService.entrarNaSala(salaAtivaId).catch(() => {
      /* ignore */
    })
    const salaId = salaAtivaId
    return () => {
      pararDeDigitar()
      chatRealtimeService.sairDaSala(salaId).catch(() => {
        /* ignore */
      })
    }
  }, [salaAtivaId, pararDeDigitar])

  // ─── Cleanup global ────────────────────────────────────────────────────
  useEffect(() => {
    const timeoutsMap = timeoutsRemotoRef.current
    return () => {
      if (digitandoTimerRef.current) clearTimeout(digitandoTimerRef.current)
      timeoutsMap.forEach((t) => clearTimeout(t))
      timeoutsMap.clear()
    }
  }, [])

  return {
    connectionStatus,
    digitandoPorSala,
    notificarDigitando,
    pararDeDigitar,
  }
}
