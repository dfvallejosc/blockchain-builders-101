import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type MeResponse } from '@/api/me'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

describe('getMe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests GET /me and returns the response data', async () => {
    const me: MeResponse = {
      role: 'issuer',
      issuer: {
        id: 'e1',
        name: 'Centro',
        certificateTypes: ['height-work'],
        nit: '900',
        city: 'Medellín',
      },
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: me })

    await expect(getMe()).resolves.toEqual(me)
    expect(apiClient.get).toHaveBeenCalledWith('/me')
  })
})
