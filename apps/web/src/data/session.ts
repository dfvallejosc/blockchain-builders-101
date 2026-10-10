import { DataError } from '@/data/errors'
import { ADMIN_USER } from '@/data/seed'
import { selectEntities } from '@/data/selectors'
import { readState, writeState } from '@/data/storage'
import type { AdminSession, IssuerSession, Role, Session } from '@/data/types'

const signInAdmin = (email: string): AdminSession => {
  if (email !== ADMIN_USER.email) throw new DataError('invalid-credentials')
  const session: AdminSession = { role: 'admin', name: ADMIN_USER.name, email: ADMIN_USER.email }
  const state = readState()
  writeState({ ...state, sessions: { ...state.sessions, admin: session } })
  return session
}

const signInIssuer = (email: string): IssuerSession => {
  const state = readState()
  const entity = selectEntities(state).find((candidate) => candidate.email.toLowerCase() === email)
  if (!entity) throw new DataError('invalid-credentials')
  const session: IssuerSession = {
    role: 'issuer',
    entityId: entity.id,
    entityName: entity.name,
    email: entity.email,
  }
  writeState({ ...state, sessions: { ...state.sessions, issuer: session } })
  return session
}

// The demo accepts any non-empty password: the repository is public and must not hold credentials.
export const signIn = async (role: Role, email: string, password: string): Promise<Session> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === '' || password.trim() === '') throw new DataError('invalid-credentials')
  return role === 'admin' ? signInAdmin(normalizedEmail) : signInIssuer(normalizedEmail)
}

export const signOut = async (role: Role): Promise<void> => {
  const state = readState()
  writeState({ ...state, sessions: { ...state.sessions, [role]: null } })
}

export const getSession = async (role: Role): Promise<Session | null> => readState().sessions[role]
