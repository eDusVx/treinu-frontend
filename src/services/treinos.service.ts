import api from './api'
import type {
  AdicionarItemTreinoPayload,
  CriarTreinoPayload,
  EditarTreinoPayload,
  ListarTreinosFiltro,
  TreinoDto,
} from '../types'

export const treinosService = {
  criar: (payload: CriarTreinoPayload) =>
    api.post<TreinoDto>('/api/treinos', payload).then((r) => r.data),

  listar: (filtro: ListarTreinosFiltro = {}) =>
    api
      .get<TreinoDto[]>('/api/treinos', { params: filtro })
      .then((r) => r.data),

  editar: (id: string, payload: EditarTreinoPayload) =>
    api.put<TreinoDto>(`/api/treinos/${id}`, payload).then((r) => r.data),

  excluir: (id: string) =>
    api.delete<void>(`/api/treinos/${id}`).then((r) => r.data),

  adicionarItem: (treinoId: string, payload: AdicionarItemTreinoPayload) =>
    api
      .post<TreinoDto>(`/api/treinos/${treinoId}/itens`, payload)
      .then((r) => r.data),

  removerItem: (treinoId: string, itemId: string) =>
    api
      .delete<void>(`/api/treinos/${treinoId}/itens/${itemId}`)
      .then((r) => r.data),
}
