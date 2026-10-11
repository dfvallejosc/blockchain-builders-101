import type { AdminSession, Certificate, Entity, IssuerSession, Worker } from '@/data/types'

export interface StoredState {
  sessions: { issuer: IssuerSession | null; admin: AdminSession | null }
  addedEntities: Entity[]
  revokedEntities: Record<string, string>
  addedWorkers: Worker[]
  addedCertificates: Certificate[]
}

const STORAGE_KEY = 'habilitapp-demo'

const emptyState = (): StoredState => ({
  sessions: { issuer: null, admin: null },
  addedEntities: [],
  revokedEntities: {},
  addedWorkers: [],
  addedCertificates: [],
})

let memoryState: StoredState = emptyState()

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const arrayOrEmpty = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const rebuildState = (parsed: Record<string, unknown>): StoredState => {
  const sessions = isPlainObject(parsed.sessions) ? parsed.sessions : {}
  return {
    sessions: {
      issuer: (sessions.issuer as IssuerSession | null | undefined) ?? null,
      admin: (sessions.admin as AdminSession | null | undefined) ?? null,
    },
    addedEntities: arrayOrEmpty<Entity>(parsed.addedEntities),
    revokedEntities: isPlainObject(parsed.revokedEntities)
      ? (parsed.revokedEntities as Record<string, string>)
      : {},
    addedWorkers: arrayOrEmpty<Worker>(parsed.addedWorkers),
    addedCertificates: arrayOrEmpty<Certificate>(parsed.addedCertificates),
  }
}

const readRaw = (): string | null | undefined => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return undefined
  }
}

export const readState = (): StoredState => {
  const raw = readRaw()
  if (raw === undefined || raw === null) return memoryState
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainObject(parsed)) return emptyState()
    return rebuildState(parsed)
  } catch {
    return emptyState()
  }
}

export const writeState = (state: StoredState): void => {
  memoryState = state
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can be blocked (private mode); the in-memory copy keeps the demo working.
  }
}

export const resetState = (): void => {
  memoryState = emptyState()
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
