import api from './api'
import type { NotificacaoDto } from '../types'

export const notificacoesService = {
  listar: () =>
    api.get<NotificacaoDto[]>('/api/notificacoes').then((r) => r.data),

  marcarComoLida: (id: string) =>
    api.patch<NotificacaoDto>(`/api/notificacoes/${id}/lida`).then((r) => r.data),
}
