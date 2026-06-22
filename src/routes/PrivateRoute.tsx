import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks'
import type { UserRole } from '../types'

interface Props {
  component: React.ComponentType
  roles?: UserRole[]
}

export default function PrivateRoute({ component: Component, roles }: Props) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'TREINADOR') return <Navigate to="/treinador/dashboard" replace />
    return <Navigate to="/aluno/dashboard" replace />
  }

  return <Component />
}
