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

const isPlainObject = (value: unknown): value is Partial<StoredState> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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
    return { ...emptyState(), ...parsed }
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
