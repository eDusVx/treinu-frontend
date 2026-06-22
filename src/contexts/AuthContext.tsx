import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AuthUser, TokenDto, UserRole } from '../types'
import { chatRealtimeService } from '../services/chat-realtime.service'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  saveSession: (tokens: TokenDto) => AuthUser | null
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

function buildUser(token: string): AuthUser | null {
  const p = decodeJwt(token)

  // .NET emite ClaimTypes.Role → "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
  // Valor: "ALUNO" | "TREINADOR" | "ADMIN"
  const rawRole =
    p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    p['role'] ||
    p['Role']

  if (!rawRole || !['ALUNO', 'TREINADOR', 'ADMIN'].includes(rawRole)) {
    // Sem role válido no JWT — não há como decidir permissões; sessão é considerada inválida.
    return null
  }
  const role = rawRole as UserRole

  // sub = userId (GerarJwt usa JwtRegisteredClaimNames.Sub)
  const id = p['sub'] || p['nameid'] || ''
  if (!id) return null

  // JwtRegisteredClaimNames.Email → "email"
  const email = p['email'] || p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || ''

  // Sem claim de nome no JWT — fica vazio (UI usa email como fallback visível)
  const nome = p['name'] || p['unique_name'] || p['nome'] || ''

  return { id, email, nome, role }
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = decodeJwt(token)
    if (!exp) return false
    return Date.now() / 1000 > Number(exp)
  } catch {
    return true
  }
}

function loadUserFromStorage(): AuthUser | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  if (isTokenExpired(token)) {
    localStorage.clear()
    return null
  }
  try {
    return buildUser(token)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage)

  const saveSession = useCallback((tokens: TokenDto): AuthUser | null => {
    // ASP.NET Core responde em camelCase: { accessToken, refreshToken }
    localStorage.setItem('token', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    const authUser = buildUser(tokens.accessToken)
    if (!authUser) {
      // Token sem claims essenciais (id/role) — limpa sessão para não armar estado inválido
      localStorage.clear()
      setUser(null)
      return null
    }
    setUser(authUser)
    return authUser
  }, [])

  const logout = useCallback(() => {
    // Encerra a conexão do SignalR antes de limpar o token — evita conexão
    // zumbi com credencial antiga após login com outra conta na mesma aba.
    chatRealtimeService.disconnect().catch(() => {
      /* ignore — o token vai ser limpo de qualquer forma */
    })
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
