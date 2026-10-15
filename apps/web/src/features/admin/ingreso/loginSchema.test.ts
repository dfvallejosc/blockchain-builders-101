import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/admin/ingreso/loginSchema'

const messagesFor = (values: { email: string; password: string }) => {
  const result = loginSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('admin loginSchema', () => {
  it('accepts an email and a password', () => {
    expect(loginSchema.safeParse({ email: 'daniela.rojas@habilitapp.co', password: 'x' }).success).toBe(true)
  })

  it('asks for the email and the password', () => {
    expect(messagesFor({ email: '', password: '' })).toEqual({
      email: 'Escribe tu correo.',
      password: 'Escribe tu contraseña.',
    })
  })

  it('rejects an email that is not an email', () => {
    expect(messagesFor({ email: 'daniela', password: 'x' }).email).toBe('Escribe un correo válido.')
  })

  it('ignores spaces around the email', () => {
    const result = loginSchema.safeParse({ email: '  daniela.rojas@habilitapp.co ', password: 'x' })

    expect(result.success && result.data.email).toBe('daniela.rojas@habilitapp.co')
  })

  it('keeps the password exactly as typed', () => {
    const result = loginSchema.safeParse({ email: 'daniela.rojas@habilitapp.co', password: ' clave con espacios ' })

    expect(result.success && result.data.password).toBe(' clave con espacios ')
  })

  it('treats a blank password as empty', () => {
    expect(messagesFor({ email: 'daniela.rojas@habilitapp.co', password: '   ' }).password).toBe('Escribe tu contraseña.')
  })
})
