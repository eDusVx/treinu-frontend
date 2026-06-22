import api from './api'
import type { MetricasPlataforma } from '../types'

export const adminService = {
  aprovarTreinador: (id: string) =>
    api.patch(`/api/admin/treinador/${id}/approve`).then((r) => r.data),

  // Backend exige dataInicio e dataFim (ambos obrigatórios) — agregados de
  // usuários ativos, volumes do período e score de engajamento.
  // Importante: se os params somem, o backend trata como DateTime.MinValue e
  // devolve todos os volumes/engajamento zerados (mas usuariosAtivos correto).
  // Por isso codificamos na URL direto, evitando qualquer problema com axios
  // params serializer ou interceptor.
  metricasPlataforma: (dataInicio: string, dataFim: string) => {
    const qs = new URLSearchParams({ dataInicio, dataFim }).toString()
    return api
      .get<MetricasPlataforma>(`/api/admin/metricas-plataforma?${qs}`)
      .then((r) => r.data)
  },
}
