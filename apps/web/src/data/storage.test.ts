import { beforeEach, describe, expect, it } from 'vitest'
import { readState, resetState, writeState } from '@/data/storage'

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
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

  it('resetState clears what was written', () => {
    writeState({ ...readState(), revokedEntities: { x: '2026-10-09' } })

    resetState()

    expect(readState().revokedEntities).toEqual({})
  })
})
