import api from './api'
import type { TokenDto } from '../types'

export const authService = {
  login: (email: string, senha: string) =>
    api.post<TokenDto>('/api/auth/login', { email, senha }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<TokenDto>('/api/auth/refresh', { refreshToken }).then((r) => r.data),

  recuperarSenha: (email: string) =>
    api.post('/api/auth/recuperar-senha', { email }).then((r) => r.data),

  redefinirSenha: (token: string, novaSenha: string) =>
    api.post('/api/auth/redefinir-senha', { token, novaSenha }).then((r) => r.data),

  solicitarCodigoLogin: (email: string) =>
    api.post('/api/auth/solicitar-codigo-login', { email }).then((r) => r.data),

  loginCodigo: (email: string, codigo: string) =>
    api.post<TokenDto>('/api/auth/login-codigo', { email, codigo }).then((r) => r.data),
}
