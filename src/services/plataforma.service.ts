import api from './api'
import type {
  AvaliacaoPlataformaPayload,
  RankingAlunoItem,
  SugestaoPayload,
} from '../types'

const BASE = '/api/v1/plataforma'

export const plataformaService = {
  enviarSugestao: (payload: SugestaoPayload) =>
    api.post<{ mensagem: string }>(`${BASE}/sugestoes`, payload).then((r) => r.data),

  registrarAvaliacao: (payload: AvaliacaoPlataformaPayload) =>
    api.post<{ mensagem: string }>(`${BASE}/avaliacoes`, payload).then((r) => r.data),

  obterRanking: (treinadorId?: string) =>
    api
      .get<RankingAlunoItem[]>(`${BASE}/ranking`, {
        params: treinadorId ? { treinadorId } : undefined,
      })
      .then((r) => r.data),
}
