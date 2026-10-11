import { describe, expect, it } from 'vitest'
import { certificateTypeLabel, formatDocument, formatLongDate, formatShortDate } from '@/features/verificar/format'

describe('formatLongDate', () => {
  it('writes the date in Colombian Spanish without time zone shifts', () => {
    expect(formatLongDate('2027-10-02')).toBe('2 de octubre de 2027')
    expect(formatLongDate('2026-01-01')).toBe('1 de enero de 2026')
  })
})

describe('formatDocument', () => {
  it('puts a dot every three digits for cédulas', () => {
    expect(formatDocument('cc', '1020345678')).toBe('C.C. 1.020.345.678')
    expect(formatDocument('ce', '987654')).toBe('C.E. 987.654')
  })

  it('keeps permits and passports as they are', () => {
    expect(formatDocument('ppt', '5647382')).toBe('PPT 5647382')
    expect(formatDocument('passport', 'AB123456')).toBe('Pasaporte AB123456')
  })
})

describe('certificateTypeLabel', () => {
  it('names each certificate type', () => {
    expect(certificateTypeLabel('height-work')).toBe('Trabajo en alturas')
    expect(certificateTypeLabel('confined-spaces')).toBe('Espacios confinados')
    expect(certificateTypeLabel('crane-operation')).toBe('Operación de grúa')
    expect(certificateTypeLabel('occupational-medical')).toBe('Concepto médico ocupacional')
  })
})

describe('formatShortDate', () => {
  it('writes day, short month and year without time zone shifts', () => {
    expect(formatShortDate('2026-10-05')).toBe('05 oct 2026')
    expect(formatShortDate('2027-01-31')).toBe('31 ene 2027')
    expect(formatShortDate('2025-09-01')).toBe('01 sep 2025')
  })
})
