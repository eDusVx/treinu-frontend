import api from './api'
import type {
  ConfigurarNotificacoesPayload,
  PaginationResponse,
  Usuario,
  PerfilEnum,
  UsuarioCompleto,
} from '../types'

export const usuariosService = {
  listar: (tipoUsuario: PerfilEnum, page = 1, limit = 10) =>
    api
      .get<PaginationResponse<Usuario>>('/api/usuarios', {
        params: { tipoUsuario, page, limit },
      })
      .then((r) => r.data),

  // Mesma chamada, tipada como DTO completo (handler retorna AlunoDto/TreinadorDto via .Include)
  listarCompleto: <T extends UsuarioCompleto = UsuarioCompleto>(
    tipoUsuario: PerfilEnum,
    page = 1,
    limit = 10,
  ) =>
    api
      .get<PaginationResponse<T>>('/api/usuarios', {
        params: { tipoUsuario, page, limit },
      })
      .then((r) => r.data),

  // Backend exige que `id` seja o do usuário logado (Forbid caso contrário).
  configurarNotificacoes: (id: string, payload: ConfigurarNotificacoesPayload) =>
    api
      .put<{ mensagem: string }>(`/api/usuarios/${id}/notification-settings`, payload)
      .then((r) => r.data),
}
