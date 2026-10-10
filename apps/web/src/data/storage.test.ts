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

  it.each([
    ['sessions is null', { sessions: null }, (s: ReturnType<typeof readState>) => s.sessions, { issuer: null, admin: null }],
    ['addedCertificates is an object', { addedCertificates: {} }, (s: ReturnType<typeof readState>) => s.addedCertificates, []],
    ['revokedEntities is null', { revokedEntities: null }, (s: ReturnType<typeof readState>) => s.revokedEntities, {}],
    ['addedEntities is a string', { addedEntities: 'x' }, (s: ReturnType<typeof readState>) => s.addedEntities, []],
    ['addedWorkers is null', { addedWorkers: null }, (s: ReturnType<typeof readState>) => s.addedWorkers, []],
    ['revokedEntities is an array', { revokedEntities: [] }, (s: ReturnType<typeof readState>) => s.revokedEntities, {}],
  ])('falls back per field when %s', (_name, saved, pick, expected) => {
    window.localStorage.setItem('habilitapp-demo', JSON.stringify(saved))

    expect(pick(readState())).toEqual(expected)
  })

  it('falls back per field when several fields have the wrong shape', () => {
    window.localStorage.setItem('habilitapp-demo', JSON.stringify({ sessions: null, addedCertificates: {} }))

    const state = readState()

    expect(state.sessions).toEqual({ issuer: null, admin: null })
    expect(state.addedCertificates).toEqual([])
  })

  it('turns missing or null session keys into null', () => {
    window.localStorage.setItem('habilitapp-demo', JSON.stringify({ sessions: { issuer: null } }))

    expect(readState().sessions).toEqual({ issuer: null, admin: null })
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
