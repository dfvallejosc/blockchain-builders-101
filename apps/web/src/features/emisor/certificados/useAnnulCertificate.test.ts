import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { annulCertificate } from '@/api/certificates'
import { DataError } from '@/data'
import type { Certificate } from '@/data/types'
import { useAnnulCertificate } from '@/features/emisor/certificados/useAnnulCertificate'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), annulCertificate: vi.fn() }))

const ID = '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'

const ANNULLED: Certificate = {
  number: 4718,
  id: ID,
  entityId: 'e-1',
  workerId: 'w-1',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: '2026-10-09',
}

const setup = () => {
  const client = createTestQueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const view = renderHook(() => useAnnulCertificate(), { wrapper: createQueryWrapper(client) })
  return { view, invalidate }
}

describe('useAnnulCertificate', () => {
  beforeEach(() => {
    vi.mocked(annulCertificate).mockReset()
  })

  it('annuls the certificate and refreshes the certificates', async () => {
    vi.mocked(annulCertificate).mockResolvedValue(ANNULLED)
    const { view, invalidate } = setup()

    let result: string | undefined
    await act(async () => {
      result = await view.result.current.annul(ID)
    })

    expect(result).toBe('annulled')
    expect(annulCertificate).toHaveBeenCalledWith(ID)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issuer', 'certificates'] })
    expect(view.result.current.annulling).toBe(false)
  })

  it('says it was already annulled on a 409 and still refreshes the certificates', async () => {
    vi.mocked(annulCertificate).mockRejectedValue(new DataError('duplicate'))
    const { view, invalidate } = setup()

    let result: string | undefined
    await act(async () => {
      result = await view.result.current.annul(ID)
    })

    expect(result).toBe('already-annulled')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issuer', 'certificates'] })
  })

  it.each([
    ['not-found', new DataError('not-found')],
    ['unavailable', new DataError('unavailable')],
    ['unexpected', new Error('boom')],
  ])('fails on %s without refreshing', async (_name, error) => {
    vi.mocked(annulCertificate).mockRejectedValue(error)
    const { view, invalidate } = setup()

    let result: string | undefined
    await act(async () => {
      result = await view.result.current.annul(ID)
    })

    expect(result).toBe('failed')
    expect(invalidate).not.toHaveBeenCalled()
  })

  it.each(['unauthorized', 'entity-revoked'] as const)(
    'lets %s reach the session gate instead of turning it into a failure',
    async (code) => {
      vi.mocked(annulCertificate).mockRejectedValue(new DataError(code))
      const { view } = setup()

      await act(async () => {
        await expect(view.result.current.annul(ID)).rejects.toMatchObject({ code })
      })
    },
  )

  it('sends one request when annul is called again while one is in flight', async () => {
    let finish: (certificate: Certificate) => void = () => undefined
    vi.mocked(annulCertificate).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { view } = setup()

    let first: Promise<string> | undefined
    let second: Promise<string> | undefined
    act(() => {
      first = view.result.current.annul(ID)
      second = view.result.current.annul(ID)
    })
    await waitFor(() => expect(view.result.current.annulling).toBe(true))
    await act(async () => {
      finish(ANNULLED)
      await Promise.all([first, second])
    })

    expect(annulCertificate).toHaveBeenCalledTimes(1)
    await expect(second).resolves.toBe('annulled')
  })
})
