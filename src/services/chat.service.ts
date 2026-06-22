import api from './api'
import type {
  SalaChatDto,
  MensagemChatDto,
  CriarSalaPayload,
} from '../types'

export const chatService = {
  criarSala: (payload: CriarSalaPayload) =>
    api.post<SalaChatDto>('/api/chat/salas', payload).then((r) => r.data),

  listarSalas: () =>
    api.get<SalaChatDto[]>('/api/chat/salas').then((r) => r.data),

  listarMensagens: (salaId: string, page = 1, limit = 50) =>
    api
      .get<MensagemChatDto[]>(`/api/chat/salas/${salaId}/mensagens`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  enviarMensagem: (salaId: string, conteudo: string) =>
    api
      .post<{ mensagemId: string }>(`/api/chat/salas/${salaId}/mensagens`, {
        conteudo,
      })
      .then((r) => r.data),

  marcarComoLida: (salaId: string) =>
    api.post<void>(`/api/chat/salas/${salaId}/lidas`).then((r) => r.data),

  // Backend assina `[FromBody] Guid novoMembroId` — espera o GUID como JSON string
  // entre aspas (ex: `"abc-123"`). Axios não serializa strings automaticamente,
  // então fazemos JSON.stringify manual para garantir o formato correto.
  adicionarMembro: (salaId: string, novoMembroId: string) =>
    api
      .post<void>(
        `/api/chat/salas/${salaId}/membros`,
        JSON.stringify(novoMembroId),
        { headers: { 'Content-Type': 'application/json' } },
      )
      .then((r) => r.data),

  removerMembro: (salaId: string, membroId: string) =>
    api
      .delete<void>(`/api/chat/salas/${salaId}/membros/${membroId}`)
      .then((r) => r.data),

  totalNaoLidas: () =>
    api
      .get<{ total: number }>('/api/chat/notificacoes/nao-lidas')
      .then((r) => r.data.total),

  obterOuCriarSalaDireta: (outroUsuarioId: string) =>
    api
      .get<SalaChatDto>(`/api/chat/usuarios/${outroUsuarioId}/sala`)
      .then((r) => r.data),
}
