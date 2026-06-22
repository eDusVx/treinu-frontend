import api from './api'
import type { RegistrarExercicioPayload, ExercicioDto } from '../types'

export const exerciciosService = {
  registrar: (payload: RegistrarExercicioPayload) =>
    api.post<ExercicioDto>('/api/exercicios', payload).then((r) => r.data),

  listar: (treinadorId: string, tags?: string) =>
    api
      .get<ExercicioDto[]>('/api/exercicios', {
        params: { treinadorId, ...(tags ? { tags } : {}) },
      })
      .then((r) => r.data),
}
