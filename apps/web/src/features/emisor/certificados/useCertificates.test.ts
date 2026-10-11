import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState } from '@/data'
import * as certificatesModule from '@/data/certificates'
import { useCertificates } from '@/features/emisor/certificados/useCertificates'

vi.mock('@/data/certificates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/certificates')>()
  return { ...actual, listCertificates: vi.fn(actual.listCertificates) }
})

const CUMBRE = 'centro-entrenamiento-cumbre-firme'

describe('useCertificates', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    resetState()
    const actual = await vi.importActual<typeof import('@/data/certificates')>('@/data/certificates')
    vi.mocked(certificatesModule.listCertificates).mockReset()
    vi.mocked(certificatesModule.listCertificates).mockImplementation(actual.listCertificates)
  })

  it('starts loading and then gives the entity, its workers and its certificates', async () => {
    const view = renderHook(() => useCertificates(CUMBRE))

    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))

    const load = view.result.current.load
    if (load.phase !== 'ready') throw new Error('expected ready')
    expect(load.entity.id).toBe(CUMBRE)
    expect(load.workers.length).toBeGreaterThan(0)
    expect(load.certificates).toHaveLength(18)
    expect(certificatesModule.listCertificates).toHaveBeenCalledWith(CUMBRE)
  })

  it('goes to error when the entity does not exist', async () => {
    const view = renderHook(() => useCertificates('no-existe'))

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
  })

  it('goes to error when loading fails and recovers on retry', async () => {
    vi.mocked(certificatesModule.listCertificates).mockRejectedValueOnce(new Error('boom'))
    const view = renderHook(() => useCertificates(CUMBRE))

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
    act(() => view.result.current.retry())
    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
  })
})
