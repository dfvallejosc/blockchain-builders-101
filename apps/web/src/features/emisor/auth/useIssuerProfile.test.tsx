import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { DataError } from '@/data/errors'
import { NotIssuerError } from '@/features/auth/errors'
import { useIssuerProfile } from '@/features/emisor/auth/useIssuerProfile'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

const clerk = vi.hoisted(() => ({ isSignedIn: true }))

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerk.isSignedIn }),
}))

vi.mock('@/api/me', () => ({ getMe: vi.fn() }))

const PROFILE: IssuerProfile = {
  id: 'e1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '900123456-7',
  city: 'Medellín',
}

const renderProfile = (client = createTestQueryClient()) =>
  renderHook(() => useIssuerProfile(), { wrapper: createQueryWrapper(client) })

describe('useIssuerProfile', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset()
    clerk.isSignedIn = true
  })

  it('loads the issuer profile from GET /me under the issuer me key', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    const client = createTestQueryClient()

    const { result } = renderProfile(client)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(PROFILE)
    expect(client.getQueryData(['issuer', 'me'])).toEqual(PROFILE)
  })

  it('does not call GET /me without a Clerk session', async () => {
    clerk.isSignedIn = false

    const { result } = renderProfile()

    await Promise.resolve()
    expect(result.current.fetchStatus).toBe('idle')
    expect(getMe).not.toHaveBeenCalled()
  })

  it.each([
    ['an admin', { role: 'admin' as const, issuer: null }],
    ['an issuer without entity', { role: 'issuer' as const, issuer: null }],
    ['an admin with an entity', { role: 'admin' as const, issuer: PROFILE }],
  ])('fails with NotIssuerError for %s', async (_label, me) => {
    vi.mocked(getMe).mockResolvedValue(me)

    const { result } = renderProfile()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(NotIssuerError)
  })

  it('passes the API error through', async () => {
    vi.mocked(getMe).mockRejectedValue(new DataError('forbidden'))

    const { result } = renderProfile()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new DataError('forbidden'))
  })
})
