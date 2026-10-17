import type { ReactNode } from 'react'
import type { MeResponse } from '@/api/me'
import { DataError, getEntity, getSession, signOut } from '@/data'
import { readState } from '@/data/storage'

// Until the issuer pages read the API, their tests drive the issuer session with the demo
// sign-in: these mocks make Clerk and GET /me mirror that demo session.

const demoIssuerSession = () => readState().sessions.issuer

export const demoClerkModule = () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: demoIssuerSession() !== null,
    getToken: async () => (demoIssuerSession() === null ? null : 'demo-token'),
    signOut: async () => signOut('issuer'),
  }),
  useUser: () => {
    const session = demoIssuerSession()
    if (session === null) return { isLoaded: true, isSignedIn: false, user: null }
    return { isLoaded: true, isSignedIn: true, user: { primaryEmailAddress: { emailAddress: session.email } } }
  },
})

const getDemoMe = async (): Promise<MeResponse> => {
  const session = await getSession('issuer')
  if (session?.role !== 'issuer') throw new DataError('unauthorized')
  const entity = await getEntity(session.entityId)
  if (entity === null) throw new DataError('unauthorized')
  const { id, name, certificateTypes, nit, city } = entity
  return { role: 'issuer', issuer: { id, name, certificateTypes, nit, city } }
}

export const demoMeModule = () => ({ getMe: getDemoMe })
