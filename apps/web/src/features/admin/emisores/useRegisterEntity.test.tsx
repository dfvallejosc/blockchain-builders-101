import { QueryObserver } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerIssuer } from '@/api/issuers'
import { DataError } from '@/data/errors'
import type { Entity } from '@/data/types'
import { useRegisterEntity } from '@/features/admin/emisores/useRegisterEntity'
import type { RegisterEntityValues } from '@/features/admin/emisores/registerEntitySchema'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

vi.mock('@/api/issuers', () => ({ registerIssuer: vi.fn() }))

const VALUES: RegisterEntityValues = {
  name: '  Salud   Ocupacional del Valle ',
  type: 'clinic',
  city: 'Medellín',
  certificateTypes: ['occupational-medical'],
  nit: '901482317-5',
  ministryRegistration: 'REG-1',
  contactName: 'Marcela Ríos',
  email: 'marcela@saludvalle.co',
  phone: '3105550142',
}

const ENTITY = { id: 'i-1', name: 'Salud Ocupacional del Valle' } as Entity

describe('useRegisterEntity', () => {
  beforeEach(() => {
    vi.mocked(registerIssuer).mockReset()
  })

  it('sends the normalized input, returns the new issuer and refreshes the list', async () => {
    vi.mocked(registerIssuer).mockResolvedValue(ENTITY)
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useRegisterEntity(), { wrapper: createQueryWrapper(client) })

    let created: Entity | null = null
    await act(async () => {
      created = await result.current.register(VALUES)
    })

    expect(created).toBe(ENTITY)
    expect(vi.mocked(registerIssuer).mock.calls[0]?.[0]).toMatchObject({
      name: 'Salud Ocupacional del Valle',
      nit: '901.482.317-5',
      phone: '310 555 0142',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'issuers'] })
    expect(result.current.error).toBeNull()
  })

  it.each([
    ['a 409', new DataError('duplicate'), 'duplicate'],
    ['a 5xx', new DataError('unavailable'), 'failed'],
    ['a 400', new DataError('invalid-input'), 'failed'],
    ['anything else', new Error('boom'), 'failed'],
  ] as const)('sets the %s error and returns null', async (_label, failure, expected) => {
    vi.mocked(registerIssuer).mockRejectedValue(failure)
    const { result } = renderHook(() => useRegisterEntity(), { wrapper: createQueryWrapper() })

    let created: Entity | null = ENTITY
    await act(async () => {
      created = await result.current.register(VALUES)
    })

    expect(created).toBeNull()
    expect(result.current.error).toBe(expected)
    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('sends only one request when it is called twice while the first is in flight', async () => {
    let resolve: (entity: Entity) => void = () => undefined
    vi.mocked(registerIssuer).mockReturnValue(new Promise<Entity>((done) => (resolve = done)))
    const { result } = renderHook(() => useRegisterEntity(), { wrapper: createQueryWrapper() })

    let first!: Promise<Entity | null>
    let second: Entity | null = ENTITY
    await act(async () => {
      first = result.current.register(VALUES)
      second = await result.current.register(VALUES)
    })
    await act(async () => {
      resolve(ENTITY)
      await first
    })

    expect(second).toBeNull()
    expect(registerIssuer).toHaveBeenCalledTimes(1)
  })

  it('answers as soon as the issuer is saved, without waiting for the list to reload', async () => {
    vi.mocked(registerIssuer).mockResolvedValue(ENTITY)
    const client = createTestQueryClient()
    const slowList = new QueryObserver(client, {
      queryKey: ['admin', 'issuers'],
      queryFn: () => new Promise<never>(() => undefined),
    })
    const unsubscribe = slowList.subscribe(() => undefined)
    const { result } = renderHook(() => useRegisterEntity(), { wrapper: createQueryWrapper(client) })

    let outcome: unknown
    await act(async () => {
      outcome = await Promise.race([result.current.register(VALUES), new Promise((resolve) => setTimeout(() => resolve('waiting'), 300))])
    })
    unsubscribe()

    expect(outcome).toBe(ENTITY)
  })
})
