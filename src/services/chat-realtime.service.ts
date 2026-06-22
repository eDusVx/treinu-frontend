import * as signalR from '@microsoft/signalr'
import type { MensagemChatDto } from '../types'

// Backend envia esse payload no evento "NovaNotificacaoChat" (User_{userId} group).
export interface NotificacaoChatPayload {
  salaId: string
  mensagensNaoLidas: number
}

export interface UsuarioDigitandoPayload {
  salaId: string
  usuarioId: string
  nome?: string
}

type Handler<T> = (payload: T) => void

export type ChatConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

const HUB_PATH = '/chathub'

class ChatRealtimeService {
  private connection: signalR.HubConnection | null = null
  private connecting: Promise<void> | null = null
  private salasEntradas = new Set<string>()
  private mensagemHandlers = new Set<Handler<MensagemChatDto>>()
  private notificacaoHandlers = new Set<Handler<NotificacaoChatPayload>>()
  private digitandoHandlers = new Set<Handler<UsuarioDigitandoPayload>>()
  private parouDigitandoHandlers = new Set<Handler<UsuarioDigitandoPayload>>()
  private statusHandlers = new Set<Handler<ChatConnectionStatus>>()
  private status: ChatConnectionStatus = 'disconnected'

  private setStatus(s: ChatConnectionStatus) {
    if (this.status === s) return
    this.status = s
    this.statusHandlers.forEach((h) => h(s))
  }

  /** Status atual sincronamente (sem assinar). */
  getStatus(): ChatConnectionStatus {
    return this.status
  }

  /**
   * Garante uma conexão ativa. Idempotente — múltiplas chamadas concorrentes
   * compartilham a mesma promessa de conexão.
   */
  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return
    if (this.connecting) return this.connecting

    this.connecting = this.startConnection().finally(() => {
      this.connecting = null
    })
    return this.connecting
  }

  private async startConnection(): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_URL as string
    if (!baseUrl) {
      throw new Error('VITE_API_URL não configurada — não é possível conectar ao chat realtime.')
    }
    this.setStatus('connecting')

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}${HUB_PATH}`, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
      })
      .withAutomaticReconnect({
        // Tenta reconectar com backoff progressivo: 0s, 2s, 5s, 10s, 30s, depois desiste.
        nextRetryDelayInMilliseconds: (ctx) => {
          if (ctx.previousRetryCount === 0) return 0
          if (ctx.previousRetryCount === 1) return 2000
          if (ctx.previousRetryCount === 2) return 5000
          if (ctx.previousRetryCount === 3) return 10000
          if (ctx.previousRetryCount < 6) return 30000
          return null
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Eventos do servidor (nomes exatos definidos em RealTimeChatService.cs).
    conn.on('NovaMensagem', (raw: unknown) => {
      const m = this.normalizeMensagem(raw)
      if (m) this.mensagemHandlers.forEach((h) => h(m))
    })

    conn.on('NovaNotificacaoChat', (raw: unknown) => {
      const n = this.normalizeNotificacao(raw)
      if (n) this.notificacaoHandlers.forEach((h) => h(n))
    })

    conn.on('UsuarioDigitando', (raw: unknown) => {
      const d = this.normalizeDigitando(raw)
      if (d) this.digitandoHandlers.forEach((h) => h(d))
    })

    conn.on('UsuarioParouDigitando', (raw: unknown) => {
      const d = this.normalizeDigitando(raw)
      if (d) this.parouDigitandoHandlers.forEach((h) => h(d))
    })

    conn.onreconnecting(() => this.setStatus('reconnecting'))

    // Re-entra automaticamente nas salas que estavam ativas após reconexão.
    conn.onreconnected(async () => {
      this.setStatus('connected')
      for (const salaId of this.salasEntradas) {
        try {
          await conn.invoke('EntrarNaSala', salaId)
        } catch {
          /* ignore */
        }
      }
    })

    conn.onclose(() => this.setStatus('disconnected'))

    try {
      await conn.start()
      this.connection = conn
      this.setStatus('connected')
    } catch (err) {
      this.setStatus('disconnected')
      throw err
    }
  }

  /** Entra no grupo de uma sala — recebe broadcasts dela. */
  async entrarNaSala(salaId: string): Promise<void> {
    await this.connect()
    if (!this.connection) return
    if (this.salasEntradas.has(salaId)) return
    try {
      await this.connection.invoke('EntrarNaSala', salaId)
      this.salasEntradas.add(salaId)
    } catch {
      /* conexão pode ter caído; reconnect handler refará o invoke */
    }
  }

  async sairDaSala(salaId: string): Promise<void> {
    if (!this.connection) return
    if (!this.salasEntradas.has(salaId)) return
    try {
      await this.connection.invoke('SairDaSala', salaId)
    } catch {
      /* ignore */
    } finally {
      this.salasEntradas.delete(salaId)
    }
  }

  onNovaMensagem(handler: Handler<MensagemChatDto>): () => void {
    this.mensagemHandlers.add(handler)
    return () => this.mensagemHandlers.delete(handler)
  }

  onNovaNotificacaoChat(handler: Handler<NotificacaoChatPayload>): () => void {
    this.notificacaoHandlers.add(handler)
    return () => this.notificacaoHandlers.delete(handler)
  }

  onUsuarioDigitando(handler: Handler<UsuarioDigitandoPayload>): () => void {
    this.digitandoHandlers.add(handler)
    return () => this.digitandoHandlers.delete(handler)
  }

  onUsuarioParouDigitando(handler: Handler<UsuarioDigitandoPayload>): () => void {
    this.parouDigitandoHandlers.add(handler)
    return () => this.parouDigitandoHandlers.delete(handler)
  }

  /** Recebe o status atual ao registrar e cada mudança subsequente. */
  onStatusChange(handler: Handler<ChatConnectionStatus>): () => void {
    this.statusHandlers.add(handler)
    handler(this.status)
    return () => this.statusHandlers.delete(handler)
  }

  /** Avisa o servidor que o usuário começou a digitar nesta sala. */
  async notificarDigitando(salaId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return
    try {
      await this.connection.invoke('NotificarDigitando', salaId)
    } catch {
      /* ignore — não vamos travar UI por isso */
    }
  }

  async pararDigitando(salaId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return
    try {
      await this.connection.invoke('PararDigitando', salaId)
    } catch {
      /* ignore */
    }
  }

  /** Encerra a conexão (chamar no logout). */
  async disconnect(): Promise<void> {
    this.salasEntradas.clear()
    this.mensagemHandlers.clear()
    this.notificacaoHandlers.clear()
    this.digitandoHandlers.clear()
    this.parouDigitandoHandlers.clear()
    this.statusHandlers.clear()
    if (this.connection) {
      try {
        await this.connection.stop()
      } catch {
        /* ignore */
      }
      this.connection = null
    }
    this.setStatus('disconnected')
  }

  // O backend serializa em PascalCase os campos do anônimo do Hub. Como a
  // configuração padrão do Newtonsoft no Hub não aplica camelCase, normalizamos
  // ambos os formatos por segurança.
  private normalizeMensagem(raw: unknown): MensagemChatDto | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const get = (a: string, b: string) => (r[a] !== undefined ? r[a] : r[b])
    return {
      id: String(get('id', 'Id') ?? ''),
      salaId: String(get('salaId', 'SalaId') ?? ''),
      remetenteId: String(get('remetenteId', 'RemetenteId') ?? ''),
      nomeRemetente: String(get('nomeRemetente', 'NomeRemetente') ?? ''),
      conteudo: String(get('conteudo', 'Conteudo') ?? ''),
      dataEnvio: String(get('dataEnvio', 'DataEnvio') ?? ''),
      tipo: String(get('tipo', 'Tipo') ?? 'Texto'),
    }
  }

  private normalizeNotificacao(raw: unknown): NotificacaoChatPayload | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const get = (a: string, b: string) => (r[a] !== undefined ? r[a] : r[b])
    return {
      salaId: String(get('salaId', 'SalaId') ?? ''),
      mensagensNaoLidas: Number(get('mensagensNaoLidas', 'MensagensNaoLidas') ?? 0),
    }
  }

  private normalizeDigitando(raw: unknown): UsuarioDigitandoPayload | null {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    const get = (a: string, b: string) => (r[a] !== undefined ? r[a] : r[b])
    const salaId = String(get('salaId', 'SalaId') ?? '')
    const usuarioId = String(get('usuarioId', 'UsuarioId') ?? '')
    if (!salaId || !usuarioId) return null
    const nome = get('nome', 'Nome')
    return { salaId, usuarioId, nome: nome ? String(nome) : undefined }
  }
}

export const chatRealtimeService = new ChatRealtimeService()
