import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { issueCertificate, listCertificates } from '@/api/certificates'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers } from '@/api/workers'
import { DataError, type DataErrorCode } from '@/data/errors'
import type { Certificate, Worker } from '@/data/types'
import { useIssueFlow } from '@/features/emisor/emitir/useIssueFlow'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), issueCertificate: vi.fn() }))

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work', 'confined-spaces'],
  nit: '901.482.317-5',
  city: 'Bogotá',
}
const SANDRA: Worker = {
  id: 'w-sandra',
  entityId: 'e-1',
  fullName: 'Sandra Milena Lozano Pardo',
  documentType: 'cc',
  documentNumber: '1032774019',
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
}
const CARLOS: Worker = { ...SANDRA, id: 'w-carlos', fullName: 'Carlos Andrés Ramírez Pineda', documentNumber: '1020345678' }
const EXISTING: Certificate = {
  number: 10,
  id: '11111111-1111-4111-8111-111111111111',
  entityId: 'e-1',
  workerId: 'w-carlos',
  type: 'height-work',
  issuedAt: '2026-01-01',
  validUntil: '2027-01-01',
  annulledAt: null,
}
const CREATED: Certificate = {
  number: 4801,
  id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c',
  entityId: 'e-1',
  workerId: 'w-sandra',
  type: 'height-work',
  issuedAt: '2026-10-09',
  validUntil: '2027-10-09',
  annulledAt: null,
}
const DETAILS = { type: 'height-work', issuedAt: '2026-10-09', validUntil: '2027-10-09' } as const

const renderFlow = async (initialWorkerId: string | null = null) => {
  const view = renderHook(() => useIssueFlow(initialWorkerId), { wrapper: createQueryWrapper() })
  await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
  return view
}

type FlowResult = Awaited<ReturnType<typeof renderFlow>>['result']

const toReview = (result: FlowResult) => {
  act(() => result.current.selectWorker('w-sandra'))
  act(() => result.current.continueToDetails())
  act(() => result.current.saveDetails(DETAILS))
}

describe('useIssueFlow', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listWorkers).mockReset().mockResolvedValue([SANDRA, CARLOS])
    vi.mocked(listCertificates).mockReset().mockResolvedValue([EXISTING])
    vi.mocked(issueCertificate).mockReset().mockResolvedValue(CREATED)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the profile, the workers and the certificates from the API', async () => {
    const { result } = await renderFlow()

    expect(result.current.load).toEqual({
      phase: 'ready',
      profile: PROFILE,
      workers: [SANDRA, CARLOS],
      certificates: [EXISTING],
    })
  })

  it('starts loading, on the worker step, with today as issue date and no validity', async () => {
    const view = renderHook(() => useIssueFlow(null), { wrapper: createQueryWrapper() })
    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))

    expect(view.result.current.step).toBe('worker')
    expect(view.result.current.draft).toEqual({ workerId: null, type: '', issuedAt: '2026-10-09', validUntil: '' })
    expect(view.result.current.failure).toBeNull()
  })

  it('goes to error when loading fails and recovers on retry', async () => {
    vi.mocked(listWorkers).mockRejectedValueOnce(new DataError('unavailable')).mockResolvedValue([SANDRA])
    const view = renderHook(() => useIssueFlow(null), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
    act(() => view.result.current.retry())

    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
  })

  it('starts on the details step when the worker comes from the address', async () => {
    const { result } = await renderFlow('w-sandra')

    await waitFor(() => expect(result.current.step).toBe('details'))
    expect(result.current.draft.workerId).toBe('w-sandra')
  })

  it('ignores an unknown worker from the address', async () => {
    const { result } = await renderFlow('w-nobody')

    expect(result.current.step).toBe('worker')
    expect(result.current.draft.workerId).toBeNull()
  })

  it('does not continue without a worker', async () => {
    const { result } = await renderFlow()

    act(() => result.current.continueToDetails())
    expect(result.current.step).toBe('worker')

    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    expect(result.current.step).toBe('details')
  })

  it('moves forward and back keeping what was typed', async () => {
    const { result } = await renderFlow()

    toReview(result)
    expect(result.current.step).toBe('review')

    act(() => result.current.backToDetails())
    expect(result.current.step).toBe('details')
    expect(result.current.draft).toMatchObject(DETAILS)

    act(() => result.current.backToWorker({ type: '', issuedAt: '2026-10-01', validUntil: '' }))
    expect(result.current.step).toBe('worker')
    expect(result.current.draft).toMatchObject({ workerId: 'w-sandra', type: '', issuedAt: '2026-10-01' })
  })

  it('issues the certificate, keeps the returned one and refreshes the certificates', async () => {
    const { result } = await renderFlow()
    toReview(result)
    vi.mocked(listCertificates).mockResolvedValue([CREATED, EXISTING])

    await act(() => result.current.issue())

    expect(issueCertificate).toHaveBeenCalledWith({ workerId: 'w-sandra', ...DETAILS })
    expect(result.current.step).toBe('issued')
    expect(result.current.issued).toEqual(CREATED)
    expect(result.current.failure).toBeNull()
    await waitFor(() => expect(listCertificates).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      const { load } = result.current
      expect(load.phase === 'ready' && load.certificates).toEqual([CREATED, EXISTING])
    })
  })

  it('sends one request when issue is called twice in a row', async () => {
    const { result } = await renderFlow()
    toReview(result)
    let release: (certificate: Certificate) => void = () => undefined
    vi.mocked(issueCertificate).mockImplementation(
      () =>
        new Promise<Certificate>((resolve) => {
          release = resolve
        }),
    )

    let first: Promise<void> = Promise.resolve()
    act(() => {
      first = result.current.issue()
      void result.current.issue()
    })
    await waitFor(() => expect(issueCertificate).toHaveBeenCalledTimes(1))
    await act(async () => {
      release(CREATED)
      await first
    })

    expect(issueCertificate).toHaveBeenCalledTimes(1)
    expect(result.current.step).toBe('issued')
  })

  it('reports a duplicate (409) and stays on review', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError('duplicate'))
    const { result } = await renderFlow()
    toReview(result)

    await act(() => result.current.issue())

    expect(result.current.step).toBe('review')
    expect(result.current.failure).toBe('duplicate')
    expect(result.current.issued).toBeNull()
  })

  it.each<DataErrorCode>(['invalid-input', 'not-found', 'type-not-allowed', 'unavailable'])(
    'reports a generic failure for %s and stays on review',
    async (code) => {
      vi.mocked(issueCertificate).mockRejectedValue(new DataError(code))
      const { result } = await renderFlow()
      toReview(result)

      await act(() => result.current.issue())

      expect(result.current.step).toBe('review')
      expect(result.current.failure).toBe('failed')
    },
  )

  it('reports a generic failure for an unexpected error', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new Error('boom'))
    const { result } = await renderFlow()
    toReview(result)

    await act(() => result.current.issue())

    expect(result.current.failure).toBe('failed')
  })

  it.each<DataErrorCode>(['unauthorized', 'entity-revoked'])(
    'shows no failure for %s: the session gate ends the session (see IssueCertificatePage tests)',
    async (code) => {
      vi.mocked(issueCertificate).mockRejectedValue(new DataError(code))
      const { result } = await renderFlow()
      toReview(result)

      await act(() => result.current.issue())

      expect(result.current.failure).toBeNull()
      expect(result.current.issuing).toBe(false)
      expect(result.current.step).toBe('review')
    },
  )

  it('clears a previous failure when the user goes back to edit', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError('duplicate'))
    const { result } = await renderFlow()
    toReview(result)
    await act(() => result.current.issue())
    expect(result.current.failure).toBe('duplicate')

    act(() => result.current.backToDetails())

    expect(result.current.failure).toBeNull()
  })

  it('starts over with issueAnother', async () => {
    const { result } = await renderFlow()
    toReview(result)
    await act(() => result.current.issue())

    act(() => result.current.issueAnother())

    expect(result.current.step).toBe('worker')
    expect(result.current.issued).toBeNull()
    expect(result.current.draft).toEqual({ workerId: null, type: '', issuedAt: '2026-10-09', validUntil: '' })
  })
})
