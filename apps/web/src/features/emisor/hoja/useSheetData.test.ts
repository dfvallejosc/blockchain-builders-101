import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { listCertificates } from '@/api/certificates'
import { listWorkers } from '@/api/workers'
import type { Certificate, Worker } from '@/data/types'
import { useSheetData } from '@/features/emisor/hoja/useSheetData'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

vi.mock('@clerk/react', () => ({ useAuth: () => ({ isSignedIn: true }) }))
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

const CERTIFICATE_ID = '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'
const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.456.223-8',
  city: 'Medellín',
}
const WORKER: Worker = {
  id: 'w-1',
  entityId: 'e-1',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
}
const CERTIFICATE: Certificate = {
  number: 4718,
  id: CERTIFICATE_ID,
  entityId: 'e-1',
  workerId: 'w-1',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: null,
}

const render = (certificateId: string, client = createTestQueryClient()) =>
  renderHook(({ id }) => useSheetData(id), { initialProps: { id: certificateId }, wrapper: createQueryWrapper(client) })

describe('useSheetData', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listCertificates).mockReset().mockResolvedValue([CERTIFICATE])
    vi.mocked(listWorkers).mockReset().mockResolvedValue([WORKER])
  })

  it('starts loading and then returns the certificate, the profile and the holder', async () => {
    const { result } = render(CERTIFICATE_ID)

    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current).toEqual({ status: 'ready', certificate: CERTIFICATE, profile: PROFILE, worker: WORKER })
  })

  it('returns not-found for an id that is not a uuid', async () => {
    const { result } = render('no-es-uuid')

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('returns not-found for a uuid that is not in the list of the issuer', async () => {
    const { result } = render('11111111-2222-4333-8444-555555555555')

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('returns not-found when the holder of the certificate is missing', async () => {
    vi.mocked(listWorkers).mockResolvedValue([])
    const { result } = render(CERTIFICATE_ID)

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('returns error when the certificates fail to load', async () => {
    vi.mocked(listCertificates).mockRejectedValue(new Error('boom'))
    const { result } = render(CERTIFICATE_ID)

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('returns error when the workers fail to load', async () => {
    vi.mocked(listWorkers).mockRejectedValue(new Error('boom'))
    const { result } = render(CERTIFICATE_ID)

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('shows loading again while the data is refetched after an error', async () => {
    vi.mocked(listCertificates).mockRejectedValueOnce(new Error('boom'))
    const client = createTestQueryClient()
    const { result } = render(CERTIFICATE_ID, client)
    await waitFor(() => expect(result.current.status).toBe('error'))
    vi.mocked(listCertificates).mockReturnValue(new Promise(() => undefined))

    await act(async () => {
      void client.invalidateQueries({ queryKey: ['issuer'] })
    })

    await waitFor(() => expect(result.current.status).toBe('loading'))
  })

  it('keeps the sheet when a refetch fails but the data is already there', async () => {
    const client = createTestQueryClient()
    const { result } = render(CERTIFICATE_ID, client)
    await waitFor(() => expect(result.current.status).toBe('ready'))
    vi.mocked(listCertificates).mockRejectedValue(new Error('boom'))

    await act(() => client.invalidateQueries({ queryKey: ['issuer'] }))

    await waitFor(() => expect(client.getQueryState(['issuer', 'certificates'])?.status).toBe('error'))
    expect(result.current.status).toBe('ready')
  })

  it('looks the new id up in the same list when it changes', async () => {
    const { result, rerender } = render(CERTIFICATE_ID)
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => rerender({ id: '11111111-2222-4333-8444-555555555555' }))

    await waitFor(() => expect(result.current.status).toBe('not-found'))
    expect(listCertificates).toHaveBeenCalledTimes(1)
  })
})
