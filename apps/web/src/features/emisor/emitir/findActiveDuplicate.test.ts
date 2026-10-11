import { describe, expect, it } from 'vitest'
import type { Certificate } from '@/data'
import { findActiveDuplicate } from '@/features/emisor/emitir/findActiveDuplicate'

const make = (overrides: Partial<Certificate>): Certificate => ({
  number: 1,
  id: 'HAB-2026-000001',
  entityId: 'e',
  workerId: 'w-1',
  type: 'height-work',
  issuedAt: '2026-01-01',
  validUntil: '2027-01-01',
  annulledAt: null,
  ...overrides,
})

const ON = '2026-10-09'

describe('findActiveDuplicate', () => {
  it('finds a valid certificate of the same type for the same worker', () => {
    const valid = make({})

    expect(findActiveDuplicate([valid], 'w-1', 'height-work', ON)).toBe(valid)
  })

  it('ignores other workers and other types', () => {
    const certificates = [make({ workerId: 'w-2' }), make({ type: 'confined-spaces' })]

    expect(findActiveDuplicate(certificates, 'w-1', 'height-work', ON)).toBeNull()
  })

  it('ignores expired and annulled certificates', () => {
    const certificates = [make({ validUntil: '2026-10-08' }), make({ annulledAt: '2026-05-01' })]

    expect(findActiveDuplicate(certificates, 'w-1', 'height-work', ON)).toBeNull()
  })

  it('counts the last day of validity as valid', () => {
    const lastDay = make({ validUntil: ON })

    expect(findActiveDuplicate([lastDay], 'w-1', 'height-work', ON)).toBe(lastDay)
  })

  it('returns the one that lasts longest when there are several', () => {
    const shorter = make({ number: 1, validUntil: '2026-12-01' })
    const longer = make({ number: 2, validUntil: '2028-01-01' })

    expect(findActiveDuplicate([shorter, longer], 'w-1', 'height-work', ON)).toBe(longer)
  })
})
