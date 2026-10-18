import { describe, expect, it } from 'vitest'
import { acceptInvitationSchema } from './acceptInvitationSchema'

describe('acceptInvitationSchema', () => {
  it('requires a password', () => {
    const result = acceptInvitationSchema.safeParse({ password: '', confirmation: '' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Escribe una contraseña.')
  })

  it('requires matching passwords', () => {
    const result = acceptInvitationSchema.safeParse({ password: 'clave-segura', confirmation: 'otra-clave' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['confirmation'], message: 'Las contraseñas no coinciden.' }),
      )
    }
  })

  it('accepts matching passwords without enforcing a minimum length', () => {
    expect(acceptInvitationSchema.safeParse({ password: '123', confirmation: '123' }).success).toBe(true)
  })
})
