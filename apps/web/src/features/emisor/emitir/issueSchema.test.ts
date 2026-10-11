import { describe, expect, it } from 'vitest'
import { buildIssueSchema } from '@/features/emisor/emitir/issueSchema'

const TODAY = '2026-10-09'
const schema = buildIssueSchema(TODAY)

const messagesFor = (values: { type: string; issuedAt: string; validUntil: string }) => {
  const result = schema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('issueSchema', () => {
  it('accepts valid details', () => {
    expect(schema.safeParse({ type: 'height-work', issuedAt: TODAY, validUntil: '2027-10-09' }).success).toBe(true)
  })

  it('asks for the type', () => {
    expect(messagesFor({ type: '', issuedAt: TODAY, validUntil: '2027-10-09' }).type).toBe(
      'Elige el tipo de certificado.',
    )
  })

  it('asks for both dates', () => {
    const messages = messagesFor({ type: 'height-work', issuedAt: '', validUntil: '' })

    expect(messages.issuedAt).toBe('Escribe la fecha de emisión.')
    expect(messages.validUntil).toBe('Escribe la fecha hasta la que estará vigente.')
  })

  it('rejects an issue date after today', () => {
    expect(messagesFor({ type: 'height-work', issuedAt: '2026-10-10', validUntil: '2027-10-09' }).issuedAt).toBe(
      'La fecha de emisión no puede ser posterior a hoy (9 de octubre de 2026).',
    )
  })

  it('accepts an issue date equal to today', () => {
    expect(messagesFor({ type: 'height-work', issuedAt: TODAY, validUntil: '2027-10-09' }).issuedAt).toBeUndefined()
  })

  it.each(['2026-10-08', '2026-10-09'])('rejects a validity of %s that is not after the issue date', (validUntil) => {
    expect(messagesFor({ type: 'height-work', issuedAt: TODAY, validUntil }).validUntil).toBe(
      'La fecha de vigencia debe ser posterior a la fecha de emisión.',
    )
  })

  it('reports every error at once', () => {
    const messages = messagesFor({ type: '', issuedAt: '2026-10-20', validUntil: '2026-10-01' })

    expect(Object.keys(messages).sort()).toEqual(['issuedAt', 'type', 'validUntil'])
  })
})
