import { useEffect, useState } from 'react'
import { getSession, type Role, type Session } from '@/data'

export type SessionState = { status: 'loading' } | { status: 'ready'; session: Session | null }

export const useSession = (role: Role): SessionState => {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    getSession(role).then((session) => {
      if (active) setState({ status: 'ready', session })
    })
    return () => {
      active = false
    }
  }, [role])

  return state
}
