import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetState } from '@/data'
import { useSheetData } from '@/features/emisor/hoja/useSheetData'

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const LOMAS = 'consultorio-ocupacional-lomas-del-sur'

describe('useSheetData', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  it('starts loading and then returns the certificate, entity and holder', async () => {
    const { result, rerender } = renderHook(
      ({ certificateId, entityId }) => useSheetData(certificateId, entityId),
      { initialProps: { certificateId: 'HAB-2026-004718', entityId: CUMBRE } },
    )

    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('expected ready')
    expect(result.current.certificate.id).toBe('HAB-2026-004718')
    expect(result.current.entity.id).toBe(CUMBRE)
    expect(result.current.worker.fullName).toBe('Carlos Andrés Ramírez Pineda')

    rerender({ certificateId: 'HAB-2026-999999', entityId: CUMBRE })

    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('returns not-found for an unknown certificate', async () => {
    const { result } = renderHook(() => useSheetData('HAB-2026-999999', CUMBRE))

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })

  it('returns not-found for a certificate of another entity', async () => {
    const { result } = renderHook(() => useSheetData('HAB-2026-004718', LOMAS))

    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })
})
