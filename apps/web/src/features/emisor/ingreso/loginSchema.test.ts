import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/emisor/ingreso/loginSchema'

const messagesFor = (values: { email: string; password: string }) => {
  const result = loginSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('loginSchema', () => {
  it('accepts an email and a password', () => {
    expect(loginSchema.safeParse({ email: 'coordinacion@cumbrefirme.co', password: 'x' }).success).toBe(true)
  })

  it('asks for the user and the password', () => {
    expect(messagesFor({ email: '', password: '' })).toEqual({
      email: 'Escribe el usuario, que es el correo de tu entidad.',
      password: 'Escribe tu contraseña.',
    })
  })

  it('rejects an email that is not an email', () => {
    expect(messagesFor({ email: 'cumbrefirme', password: 'x' }).email).toBe('Escribe un correo válido.')
  })

  it('ignores spaces around the email', () => {
    expect(messagesFor({ email: '  coordinacion@cumbrefirme.co ', password: 'x' }).email).toBeUndefined()
  })

  it('keeps the password exactly as typed', () => {
    const result = loginSchema.safeParse({ email: 'coordinacion@cumbrefirme.co', password: ' clave con espacios ' })

    expect(result.success && result.data.password).toBe(' clave con espacios ')
  })

  it('treats a blank password as empty', () => {
    expect(messagesFor({ email: 'coordinacion@cumbrefirme.co', password: '   ' }).password).toBe('Escribe tu contraseña.')
  })
})
