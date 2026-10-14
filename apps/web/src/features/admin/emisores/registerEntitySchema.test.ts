import { describe, expect, it } from 'vitest'
import {
  formatNit,
  formatPhone,
  registerEntitySchema,
  toNewEntityInput,
  type RegisterEntityValues,
} from '@/features/admin/emisores/registerEntitySchema'

const valid: RegisterEntityValues = {
  name: 'Torre Firme Salud',
  type: 'clinic',
  city: 'Bogotá',
  certificateTypes: ['height-work'],
  nit: '901.482.317-5',
  ministryRegistration: '',
  contactName: 'Laura Pardo Soto',
  email: 'laura.pardo@torrefirme.co',
  phone: '310 555 0142',
}

const messagesFor = (overrides: Partial<RegisterEntityValues>) => {
  const result = registerEntitySchema.safeParse({ ...valid, ...overrides })
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('registerEntitySchema', () => {
  it('accepts a complete form, with the Ministry number left empty', () => {
    expect(registerEntitySchema.safeParse(valid).success).toBe(true)
  })

  it('asks for every required field when the form is empty', () => {
    expect(
      messagesFor({ name: '', type: '', city: '', certificateTypes: [], nit: '', contactName: '', email: '', phone: '' }),
    ).toEqual({
      name: 'Escribe el nombre de la entidad.',
      type: 'Elige el tipo de entidad.',
      city: 'Elige la ciudad de la entidad.',
      certificateTypes: 'Elige al menos un tipo de certificado.',
      nit: 'Escribe el NIT de la entidad.',
      contactName: 'Escribe el nombre de la persona de contacto.',
      email: 'Escribe el correo de la persona de contacto.',
      phone: 'Escribe 10 dígitos, por ejemplo 310 555 0142.',
    })
  })

  it('treats a name or a contact of fewer than 3 characters, or only spaces, as empty', () => {
    expect(messagesFor({ name: 'ab' }).name).toBe('Escribe el nombre de la entidad.')
    expect(messagesFor({ name: '     ' }).name).toBe('Escribe el nombre de la entidad.')
    expect(messagesFor({ contactName: 'Al' }).contactName).toBe('Escribe el nombre de la persona de contacto.')
  })

  it.each(['901.482.317-5', '9014823175', '901 482 317 5', ' 901.482.317-5 '])('accepts the NIT %j', (nit) => {
    expect(messagesFor({ nit }).nit).toBeUndefined()
  })

  it.each(['901.482.31', '901.482.317-55', '901.482.31A-5', '901/482/317-5'])('rejects the NIT %j', (nit) => {
    expect(messagesFor({ nit }).nit).toBe(
      'Revisa el NIT. Debe tener 9 dígitos y el dígito de verificación, por ejemplo 901.482.317-5.',
    )
  })

  it('rejects an email that is not an email', () => {
    expect(messagesFor({ email: 'laura.pardo@torrefirme' }).email).toBe(
      'Escribe un correo válido, por ejemplo nombre@entidad.co.',
    )
  })

  it.each(['310 555 0142', '3105550142', '310-555-0142'])('accepts the phone %j', (phone) => {
    expect(messagesFor({ phone }).phone).toBeUndefined()
  })

  it.each(['310 555 014', '310 555 01422', '310 555 O142', '+57 310 555 0142'])('rejects the phone %j', (phone) => {
    expect(messagesFor({ phone }).phone).toBe('Escribe 10 dígitos, por ejemplo 310 555 0142.')
  })

  it('rejects a type or a city that is not in the lists', () => {
    expect(messagesFor({ type: 'hospital' }).type).toBe('Elige el tipo de entidad.')
    expect(messagesFor({ city: 'Gotham' }).city).toBe('Elige la ciudad de la entidad.')
  })
})

describe('formatNit and formatPhone', () => {
  it('writes the NIT as ddd.ddd.ddd-d whatever way it was typed', () => {
    expect(formatNit('9014823175')).toBe('901.482.317-5')
    expect(formatNit(' 901 482 317 5 ')).toBe('901.482.317-5')
    expect(formatNit('901.482.317-5')).toBe('901.482.317-5')
  })

  it('writes the phone as ddd ddd dddd', () => {
    expect(formatPhone('3105550142')).toBe('310 555 0142')
    expect(formatPhone('310-555-0142')).toBe('310 555 0142')
  })
})

describe('toNewEntityInput', () => {
  it('trims and normalizes what the data layer compares and stores', () => {
    expect(
      toNewEntityInput({
        ...valid,
        name: '  Torre   Firme  Salud ',
        nit: '9014823175',
        phone: '310-555-0142',
        contactName: ' Laura  Pardo Soto ',
        email: ' laura.pardo@torrefirme.co ',
        ministryRegistration: ' MT-2026-00001 ',
      }),
    ).toEqual({
      name: 'Torre Firme Salud',
      type: 'clinic',
      city: 'Bogotá',
      certificateTypes: ['height-work'],
      nit: '901.482.317-5',
      ministryRegistration: 'MT-2026-00001',
      contactName: 'Laura Pardo Soto',
      email: 'laura.pardo@torrefirme.co',
      phone: '310 555 0142',
    })
  })
})
