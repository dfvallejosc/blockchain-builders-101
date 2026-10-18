import type { ReactNode } from 'react'
import { vi } from 'vitest'

// Controls what the Clerk sign-in hook does in the login screen tests.
export const signInControl = {
  password: vi.fn(async (_params: { identifier: string; password: string }): Promise<{ error: unknown }> => ({ error: null })),
  finalize: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
  status: 'complete',
}

// Controls what the Clerk sign-up hook does in invitation tests.
export const signUpControl = {
  ticket: vi.fn(async (_params: { ticket: string }): Promise<{ error: unknown }> => ({ error: null })),
  create: vi.fn(async (_params: { strategy: 'ticket'; ticket: string; password: string }): Promise<{ error: unknown }> => ({ error: null })),
  finalize: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
  status: 'complete',
}

// What the Clerk session looks like to the mocked hooks, for the tests that sign in and out.
export const clerkSession = { signedIn: false }

// Who the mocked Clerk user is. `fullName` is null when the account has no name.
export const clerkUser = { email: 'emisor@example.co', fullName: null as string | null }

const createClerkModule = (isSignedIn: () => boolean, signOut: () => Promise<void> = async () => undefined) => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: isSignedIn(),
    getToken: async () => (isSignedIn() ? 'test-token' : null),
    signOut,
  }),
  useSignIn: () => ({
    errors: { fields: { identifier: null, password: null, code: null }, raw: null, global: null },
    fetchStatus: 'idle',
    signIn: signInControl,
  }),
  useSignUp: () => ({
    signUp: signUpControl,
  }),
  useUser: () => {
    if (!isSignedIn()) return { isLoaded: true, isSignedIn: false, user: null }
    return {
      isLoaded: true,
      isSignedIn: true,
      user: { primaryEmailAddress: { emailAddress: clerkUser.email }, fullName: clerkUser.fullName },
    }
  },
})

// For tests that mock `@/api/*` themselves: a signed-in Clerk user, whatever the page does.
export const signedInClerkModule = () => createClerkModule(() => true)

// Follows `clerkSession`: signing out closes it, and the test opens it to sign in.
export const sessionClerkModule = () =>
  createClerkModule(
    () => clerkSession.signedIn,
    async () => {
      clerkSession.signedIn = false
    },
  )
