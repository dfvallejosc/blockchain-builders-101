import { describe, expect, it } from 'vitest'
import { toIsoDate } from '@/data/clock'

describe('toIsoDate', () => {
  it('uses the local year, month and day', () => {
    expect(toIsoDate(new Date(2026, 9, 11, 23, 59))).toBe('2026-10-11')
  })
})
