import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readState, resetState, writeState } from '@/data/storage'

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    expect(readState()).toEqual({
      sessions: { issuer: null, admin: null },
      addedEntities: [],
      revokedEntities: {},
      addedWorkers: [],
      addedCertificates: [],
    })
  })

  it('keeps what is written', () => {
    writeState({ ...readState(), revokedEntities: { 'some-entity': '2026-10-09' } })

    expect(readState().revokedEntities).toEqual({ 'some-entity': '2026-10-09' })
  })

  it('falls back to an empty state when the saved JSON is corrupt', () => {
    window.localStorage.setItem('habilitapp-demo', '{not json')

    expect(readState().addedEntities).toEqual([])
  })

  it('falls back to an empty state when the saved value is not an object', () => {
    window.localStorage.setItem('habilitapp-demo', '42')

    expect(readState().addedCertificates).toEqual([])
  })

  it('keeps the in-memory state when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    writeState({ ...readState(), revokedEntities: { 'blocked-entity': '2026-10-09' } })

    expect(readState().revokedEntities).toEqual({ 'blocked-entity': '2026-10-09' })
  })

  it('resetState clears what was written', () => {
    writeState({ ...readState(), revokedEntities: { x: '2026-10-09' } })

    resetState()

    expect(readState().revokedEntities).toEqual({})
  })
})
