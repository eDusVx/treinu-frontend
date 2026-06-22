import api from './api'
import type {
  RegisterTreinadorPayload,
  ContatoPayload,
  EspecializacaoPayload,
  ConvitePayload,
  TreinadorDtoCompleto,
} from '../types'

export const treinadorService = {
  register: (payload: RegisterTreinadorPayload) =>
    api.post('/api/treinador', payload).then((r) => r.data),

  adicionarContato: (id: string, payload: ContatoPayload) =>
    api.post<TreinadorDtoCompleto>(`/api/treinador/${id}/contatos`, payload).then((r) => r.data),

  removerContato: (id: string, contatoId: string) =>
    api.delete(`/api/treinador/${id}/contatos/${contatoId}`).then((r) => r.data),

  adicionarEspecializacao: (id: string, payload: EspecializacaoPayload) =>
    api.post<TreinadorDtoCompleto>(`/api/treinador/${id}/especializacoes`, payload).then((r) => r.data),

  // DELETE com body — alguns proxies descartam body sem Content-Type explícito.
  removerEspecializacao: (id: string, payload: EspecializacaoPayload) =>
    api
      .delete(`/api/treinador/${id}/especializacoes`, {
        data: payload,
        headers: { 'Content-Type': 'application/json' },
      })
      .then((r) => r.data),

  convidarAluno: (payload: ConvitePayload) =>
    api.post('/api/convites/aluno', payload).then((r) => r.data),
}
