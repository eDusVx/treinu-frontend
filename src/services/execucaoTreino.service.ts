import api from './api'
import type {
  ConcluirExecucaoPayload,
  ExecucaoTreinoDto,
  FeedbackTreinoDto,
  IniciarExecucaoPayload,
  IniciarExecucaoResponse,
  RegistrarExercicioExecutadoPayload,
} from '../types'

const BASE = '/api/v1/execucoes-treino'

export const execucaoTreinoService = {
  iniciar: (payload: IniciarExecucaoPayload) =>
    api.post<IniciarExecucaoResponse>(`${BASE}/iniciar`, payload).then((r) => r.data),

  registrarExercicio: (
    execucaoTreinoId: string,
    payload: RegistrarExercicioExecutadoPayload,
  ) =>
    api
      .post<void>(`${BASE}/${execucaoTreinoId}/exercicios`, payload)
      .then((r) => r.data),

  concluir: (execucaoTreinoId: string, payload: ConcluirExecucaoPayload) =>
    api
      .post<{ mensagem: string }>(`${BASE}/${execucaoTreinoId}/concluir`, payload)
      .then((r) => r.data),

  // Retorna 400 quando não há execução ativa — chamadas devem tratar como "ausente".
  obterAtiva: (treinoId: string) =>
    api
      .get<ExecucaoTreinoDto>(`${BASE}/ativas`, { params: { treinoId } })
      .then((r) => r.data),

  historico: (alunoId: string) =>
    api.get<ExecucaoTreinoDto[]>(`${BASE}/historico/${alunoId}`).then((r) => r.data),

  detalhes: (execucaoTreinoId: string) =>
    api.get<ExecucaoTreinoDto>(`${BASE}/${execucaoTreinoId}`).then((r) => r.data),

  // Retorna feedbacks (nota + comentário) deixados pelos alunos do treinador
  // logado ao concluírem execuções de treino. Acesso restrito a Treinador/Admin.
  feedbacks: () =>
    api.get<FeedbackTreinoDto[]>(`${BASE}/feedbacks`).then((r) => r.data),
}
