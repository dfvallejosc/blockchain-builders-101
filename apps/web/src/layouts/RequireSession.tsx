import { Navigate, Outlet } from 'react-router'
import { LOGIN_PATH } from '@/features/auth/loginPaths'
import { useSession } from '@/hooks/useSession'
import type { Role, Session } from '@/data'

interface RequireSessionProps {
  role: Role
}

export const RequireSession = ({ role }: RequireSessionProps) => {
  const state = useSession(role)

  if (state.status === 'loading') return null
  if (state.session === null) return <Navigate to={LOGIN_PATH[role]} replace />
  return <Outlet context={state.session satisfies Session} />
}
