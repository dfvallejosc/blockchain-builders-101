import { createContext } from 'react'

export interface SessionActions {
  signOut: () => Promise<void>
}

export const SessionActionsContext = createContext<SessionActions | null>(null)
