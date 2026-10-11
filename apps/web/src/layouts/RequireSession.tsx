import { Navigate, Outlet } from 'react-router'
import { useSession } from '@/hooks/useSession'
import type { Role, Session } from '@/data'

export const LOGIN_PATH: Record<Role, string> = {
  issuer: '/emisor/ingresar',
  admin: '/admin/ingresar',
}

interface RequireSessionProps {
  role: Role
}

export const RequireSession = ({ role }: RequireSessionProps) => {
  const state = useSession(role)

  if (state.status === 'loading') return null
  if (state.session === null) return <Navigate to={LOGIN_PATH[role]} replace />
  return <Outlet context={state.session satisfies Session} />
}
