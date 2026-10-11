import { describe, expect, it } from 'vitest'
import { workerSchema } from '@/features/emisor/trabajadores/workerSchema'

const valid = {
  fullName: 'Marta Lucía Gómez Ríos',
  documentType: 'cc',
  documentNumber: '1037456789',
  dataConsent: true,
}

const messagesFor = (values: Record<string, unknown>) => {
  const result = workerSchema.safeParse({ ...valid, ...values })
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('workerSchema', () => {
  it('accepts valid data', () => {
    expect(workerSchema.safeParse(valid).success).toBe(true)
  })

  it('asks for the full name', () => {
    expect(messagesFor({ fullName: '' }).fullName).toBe('Escribe el nombre completo.')
  })

  it.each(['Marta', '  Marta  '])('rejects an incomplete name: "%s"', (fullName) => {
    expect(messagesFor({ fullName }).fullName).toBe('Escribe nombres y apellidos, como aparecen en el documento.')
  })

  it('asks for the document type', () => {
    expect(messagesFor({ documentType: '' }).documentType).toBe('Elige el tipo de documento.')
  })

  it('asks for the document number', () => {
    expect(messagesFor({ documentNumber: '' }).documentNumber).toBe('Escribe el número de documento.')
  })

  it('rejects a document that is too short', () => {
    expect(messagesFor({ documentNumber: '1234' }).documentNumber).toBe('El número de documento es muy corto.')
  })

  it.each(['1.037.456.789', '1037 456 789'])('rejects dots and spaces in the document: "%s"', (documentNumber) => {
    expect(messagesFor({ documentNumber }).documentNumber).toBe('Escríbelo sin puntos ni espacios.')
  })

  it('ignores spaces around a pasted document number', () => {
    expect(messagesFor({ documentNumber: ' 1037456789\n' }).documentNumber).toBeUndefined()
  })

  it('accepts a passport with letters and digits', () => {
    expect(messagesFor({ documentType: 'passport', documentNumber: 'AB123456' }).documentNumber).toBeUndefined()
  })

  it('requires the data authorization and explains why', () => {
    expect(messagesFor({ dataConsent: false }).dataConsent).toBe(
      'Sin la autorización del trabajador no podemos registrarlo. Pídesela antes de continuar.',
    )
  })

  it('reports every error at once', () => {
    const messages = messagesFor({ fullName: '', documentType: '', documentNumber: '', dataConsent: false })

    expect(Object.keys(messages).sort()).toEqual(['dataConsent', 'documentNumber', 'documentType', 'fullName'])
  })
})
