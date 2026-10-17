import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { DataError } from '@/data/errors'
import { NotIssuerError } from '@/features/emisor/auth/useIssuerProfile'
import { endIssuerSession, sessionEndReasonFor } from '@/features/emisor/auth/sessionEnd'

describe('sessionEndReasonFor', () => {
  it.each([
    [new DataError('unauthorized'), false, 'expired'],
    [new DataError('unauthorized'), true, 'expired'],
    [new DataError('entity-revoked'), false, 'revoked'],
    [new DataError('entity-revoked'), true, 'revoked'],
    [new DataError('forbidden'), true, 'no-role'],
    [new NotIssuerError(), true, 'not-issuer'],
  ])('maps %o (profile query: %s) to %s', (error, fromProfile, reason) => {
    expect(sessionEndReasonFor(error, fromProfile)).toBe(reason)
  })

  it.each([
    [new DataError('forbidden'), false],
    [new DataError('unavailable'), true],
    [new DataError('unavailable'), false],
    [new DataError('not-found'), false],
    [new Error('boom'), true],
  ])('keeps the session open for %o (profile query: %s)', (error, fromProfile) => {
    expect(sessionEndReasonFor(error, fromProfile)).toBeNull()
  })
})

describe('endIssuerSession', () => {
  it('closes the Clerk session, empties the cache and goes to the login with the reason', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    queryClient.setQueryData(['issuer', 'workers'], ['w1'])
    const calls: string[] = []
    const signOut = vi.fn(async () => {
      calls.push('signOut')
    })
    const navigate = vi.fn(() => {
      calls.push('navigate')
    })

    await endIssuerSession({ signOut, queryClient, navigate }, 'revoked')

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/emisor/ingresar' })
    expect(queryClient.getQueryData(['issuer', 'workers'])).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith('/emisor/ingresar', { replace: true, state: { reason: 'revoked' } })
    expect(calls).toEqual(['signOut', 'navigate'])
  })

  it('goes to the login without a reason when the user signs out', async () => {
    const navigate = vi.fn()

    await endIssuerSession({ signOut: vi.fn(async () => undefined), queryClient: new QueryClient(), navigate })

    expect(navigate).toHaveBeenCalledWith('/emisor/ingresar', { replace: true, state: undefined })
  })

  it('still empties the cache and leaves when Clerk fails to sign out', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    queryClient.setQueryData(['issuer', 'workers'], ['w1'])
    const navigate = vi.fn()

    await endIssuerSession({ signOut: vi.fn(async () => Promise.reject(new Error('offline'))), queryClient, navigate }, 'expired')

    expect(queryClient.getQueryData(['issuer', 'workers'])).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith('/emisor/ingresar', { replace: true, state: { reason: 'expired' } })
  })
})
