import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listCertificates, resetState, revokeEntity, verifyCertificate, type IssuerSession } from '@/data'
import * as certificatesModule from '@/data/certificates'
import { useIssueFlow } from '@/features/emisor/emitir/useIssueFlow'

vi.mock('@/data/certificates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/certificates')>()
  return { ...actual, listCertificates: vi.fn(actual.listCertificates) }
})

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const session: IssuerSession = {
  role: 'issuer',
  entityId: CUMBRE,
  entityName: 'Centro de Entrenamiento Cumbre Firme',
  email: 'coordinacion@cumbrefirme.co',
}
const DETAILS = { type: 'height-work', issuedAt: '2026-10-09', validUntil: '2027-10-09' } as const

const renderFlow = async (initialWorkerId: string | null = null) => {
  const view = renderHook(() => useIssueFlow(session, initialWorkerId))
  await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
  return view
}

describe('useIssueFlow', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    resetState()
    const actual = await vi.importActual<typeof import('@/data/certificates')>('@/data/certificates')
    vi.mocked(certificatesModule.listCertificates).mockImplementation(actual.listCertificates)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the entity, its workers and its certificates', async () => {
    const { result } = await renderFlow()

    if (result.current.load.phase !== 'ready') throw new Error('not ready')
    expect(result.current.load.entity.id).toBe(CUMBRE)
    expect(result.current.load.workers.length).toBeGreaterThan(0)
    expect(result.current.load.certificates.length).toBeGreaterThan(0)
  })

  it('starts on the worker step with today as issue date and no validity', async () => {
    const { result } = await renderFlow()

    expect(result.current.step).toBe('worker')
    expect(result.current.draft).toEqual({ workerId: null, type: '', issuedAt: '2026-10-09', validUntil: '' })
    expect(result.current.blocked).toBe(false)
  })

  it('starts on the details step when the worker comes from the address', async () => {
    const { result } = await renderFlow('w-sandra')

    expect(result.current.step).toBe('details')
    expect(result.current.draft.workerId).toBe('w-sandra')
  })

  it('ignores an unknown worker from the address', async () => {
    const { result } = await renderFlow('w-nobody')

    expect(result.current.step).toBe('worker')
    expect(result.current.draft.workerId).toBeNull()
  })

  it('ignores the worker from the address when the entity is revoked', async () => {
    await revokeEntity(CUMBRE)
    const { result } = await renderFlow('w-sandra')

    expect(result.current.step).toBe('worker')
    expect(result.current.blocked).toBe(true)
  })

  it('does not continue without a worker or when blocked', async () => {
    const { result } = await renderFlow()

    act(() => result.current.continueToDetails())
    expect(result.current.step).toBe('worker')

    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    expect(result.current.step).toBe('details')
  })

  it('moves forward and back keeping what was typed', async () => {
    const { result } = await renderFlow()

    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    expect(result.current.step).toBe('review')

    act(() => result.current.backToDetails())
    expect(result.current.step).toBe('details')
    expect(result.current.draft).toMatchObject(DETAILS)

    act(() => result.current.backToWorker({ type: '', issuedAt: '2026-10-01', validUntil: '' }))
    expect(result.current.step).toBe('worker')
    expect(result.current.draft).toMatchObject({ workerId: 'w-sandra', type: '', issuedAt: '2026-10-01' })
  })

  it('issues the certificate so it can be verified, and refreshes the data', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    const before = result.current.load.phase === 'ready' ? result.current.load.certificates.length : 0

    await act(() => result.current.issue())

    expect(result.current.step).toBe('issued')
    expect(result.current.issued).not.toBeNull()
    const verification = await verifyCertificate(result.current.issued?.id ?? '')
    expect(verification.status).toBe('valid')
    expect(result.current.load.phase === 'ready' && result.current.load.certificates.length).toBe(before + 1)
  })

  it('keeps the new certificate in the list even if reloading the data fails', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    const before = result.current.load.phase === 'ready' ? result.current.load.certificates.length : 0
    vi.mocked(listCertificates).mockRejectedValue(new Error('offline'))

    await act(() => result.current.issue())

    if (result.current.load.phase !== 'ready') throw new Error('not ready')
    expect(result.current.load.certificates).toHaveLength(before + 1)
    expect(result.current.load.certificates[0]?.id).toBe(result.current.issued?.id)
  })

  it('becomes blocked after the entity is revoked meanwhile even if reloading the data fails', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    await revokeEntity(CUMBRE)
    vi.mocked(listCertificates).mockRejectedValue(new Error('offline'))

    await act(() => result.current.issue())

    expect(result.current.blocked).toBe(true)
    expect(result.current.failed).toBe(false)
    expect(result.current.step).toBe('review')
  })

  it('issues only once when issue is called twice in a row', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    const before = result.current.load.phase === 'ready' ? result.current.load.certificates.length : 0

    await act(async () => {
      await Promise.all([result.current.issue(), result.current.issue()])
    })

    expect(result.current.load.phase === 'ready' && result.current.load.certificates.length).toBe(before + 1)
  })

  it('stays on review and becomes blocked when the entity is revoked meanwhile', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    await revokeEntity(CUMBRE)

    await act(() => result.current.issue())

    expect(result.current.step).toBe('review')
    expect(result.current.blocked).toBe(true)
    expect(result.current.failed).toBe(false)
  })

  it('reports a generic failure and stays on review', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails({ ...DETAILS, type: 'occupational-medical' }))

    await act(() => result.current.issue())

    expect(result.current.step).toBe('review')
    expect(result.current.failed).toBe(true)
  })

  it('starts over with issueAnother', async () => {
    const { result } = await renderFlow()
    act(() => result.current.selectWorker('w-sandra'))
    act(() => result.current.continueToDetails())
    act(() => result.current.saveDetails(DETAILS))
    await act(() => result.current.issue())

    act(() => result.current.issueAnother())

    expect(result.current.step).toBe('worker')
    expect(result.current.issued).toBeNull()
    expect(result.current.draft).toEqual({ workerId: null, type: '', issuedAt: '2026-10-09', validUntil: '' })
  })
})
