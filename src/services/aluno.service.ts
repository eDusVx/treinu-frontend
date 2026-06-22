import api from './api'
import type {
  RegisterAlunoPayload,
  ContatoPayload,
  AvaliacaoPayload,
  DashboardEvolucaoResponse,
  AlunoDtoCompleto,
  MetaDto,
  CadastrarMetaPayload,
  EvolucaoFisicaResponse,
  ComparativoAlunoItem,
} from '../types'

export const alunoService = {
  register: (payload: RegisterAlunoPayload) =>
    api.post('/api/aluno/register', payload).then((r) => r.data),

  adicionarContato: (id: string, payload: ContatoPayload) =>
    api.post<AlunoDtoCompleto>(`/api/aluno/${id}/contatos`, payload).then((r) => r.data),

  removerContato: (id: string, contatoId: string) =>
    api.delete(`/api/aluno/${id}/contatos/${contatoId}`).then((r) => r.data),

  adicionarAvaliacao: (id: string, payload: AvaliacaoPayload) =>
    api.post<AlunoDtoCompleto>(`/api/aluno/${id}/avaliacoes`, payload).then((r) => r.data),

  removerAvaliacao: (id: string, avaliacaoId: string) =>
    api.delete(`/api/aluno/${id}/avaliacoes/${avaliacaoId}`).then((r) => r.data),

  // Endpoints "self" (aluno logado)
  adicionarMinhaAvaliacao: (payload: AvaliacaoPayload) =>
    api.post<AlunoDtoCompleto>('/api/aluno/me/avaliacoes', payload).then((r) => r.data),

  meuDashboard: () =>
    api.get<DashboardEvolucaoResponse>('/api/aluno/me/dashboard').then((r) => r.data),

  dashboardDoAluno: (id: string) =>
    api.get<DashboardEvolucaoResponse>(`/api/aluno/${id}/dashboard`).then((r) => r.data),

  // ─── Metas ────────────────────────────────────────────────────────────────
  // Backend exige dataLimite > hoje (UTC) e valorAlvo > 0. Cadastrar uma meta
  // do mesmo tipo desativa a anterior automaticamente.
  listarMetas: (alunoId: string) =>
    api.get<MetaDto[]>(`/api/aluno/${alunoId}/metas`).then((r) => r.data),

  cadastrarMeta: (alunoId: string, payload: CadastrarMetaPayload) =>
    api.post<MetaDto>(`/api/aluno/${alunoId}/metas`, payload).then((r) => r.data),

  // ─── Evolução física consolidada ──────────────────────────────────────────
  // Backend cruza avaliacoes + metas ativas e devolve histórico, delta, tendência
  // e progresso por métrica (peso, gordura, medidas).
  minhaEvolucaoFisica: (params?: { dataInicio?: string; dataFim?: string }) =>
    api
      .get<EvolucaoFisicaResponse>('/api/aluno/me/evolucao-fisica', { params })
      .then((r) => r.data),

  evolucaoFisicaDeAluno: (
    id: string,
    params?: { dataInicio?: string; dataFim?: string },
  ) =>
    api
      .get<EvolucaoFisicaResponse>(`/api/aluno/${id}/evolucao-fisica`, { params })
      .then((r) => r.data),

  // ─── Comparativo de performance dos alunos (treinador/admin) ──────────────
  // Treinador: backend filtra pelos alunos do próprio treinador via claim.
  // Admin: traz todos os alunos da plataforma.
  comparativoPerformance: (params?: {
    dataInicio?: string
    dataFim?: string
    agrupamento?: 'semana' | 'mes'
  }) =>
    api
      .get<ComparativoAlunoItem[]>('/api/aluno/comparativo-performance', { params })
      .then((r) => r.data),
}
