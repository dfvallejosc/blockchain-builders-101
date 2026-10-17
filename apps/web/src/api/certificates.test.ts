import { beforeEach, describe, expect, it, vi } from 'vitest'
import { annulCertificate, issueCertificate, listCertificates } from '@/api/certificates'
import { DataError, type DataErrorCode } from '@/data/errors'
import type { IssueCertificateInput } from '@/data/types'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

const input: IssueCertificateInput = {
  workerId: 'w1',
  type: 'height-work',
  issuedAt: '2026-01-01',
  validUntil: '2027-01-01',
}

describe('certificates api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists certificates with GET /certificates', async () => {
    const certificates = [{ id: 'c1' }]
    vi.mocked(apiClient.get).mockResolvedValue({ data: certificates })

    await expect(listCertificates()).resolves.toBe(certificates)
    expect(apiClient.get).toHaveBeenCalledWith('/certificates')
  })

  it('issues a certificate with POST /certificates and the input body', async () => {
    const certificate = { id: 'c1' }
    vi.mocked(apiClient.post).mockResolvedValue({ data: certificate })

    await expect(issueCertificate(input)).resolves.toBe(certificate)
    expect(apiClient.post).toHaveBeenCalledWith('/certificates', {
      workerId: 'w1',
      type: 'height-work',
      issuedAt: '2026-01-01',
      validUntil: '2027-01-01',
    })
  })

  it('annuls a certificate with POST /certificates/:id/annul', async () => {
    const certificate = { id: 'c1' }
    vi.mocked(apiClient.post).mockResolvedValue({ data: certificate })

    await expect(annulCertificate('c1')).resolves.toBe(certificate)
    expect(apiClient.post).toHaveBeenCalledWith('/certificates/c1/annul')
  })

  it('turns a forbidden error on issuing into type-not-allowed', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new DataError('forbidden'))

    await expect(issueCertificate(input)).rejects.toMatchObject({ code: 'type-not-allowed' })
  })

  it.each([
    'duplicate',
    'entity-revoked',
    'unauthorized',
    'unavailable',
    'invalid-input',
    'not-found',
  ] as DataErrorCode[])('lets %s pass through when issuing', async (code) => {
    const error = new DataError(code)
    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(issueCertificate(input)).rejects.toBe(error)
  })
})
