import { beforeEach, describe, expect, it } from 'vitest'
import { DataError } from '@/data/errors'
import { getSession, signIn, signOut } from '@/data/session'
import { resetState } from '@/data/storage'

describe('session', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  it('signs an issuer in with the email of a registered entity', async () => {
    const session = await signIn('issuer', 'coordinacion@cumbrefirme.co', 'anything')

    expect(session).toMatchObject({
      role: 'issuer',
      entityId: 'centro-entrenamiento-cumbre-firme',
      entityName: 'Centro de Entrenamiento Cumbre Firme',
    })
    expect(await getSession('issuer')).toEqual(session)
  })

  it('ignores case and spaces in the email', async () => {
    await expect(signIn('issuer', '  Coordinacion@CumbreFirme.co ', 'x')).resolves.toMatchObject({
      role: 'issuer',
    })
  })

  it('signs the administrator in', async () => {
    const session = await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')

    expect(session).toEqual({ role: 'admin', name: 'Daniela Rojas', email: 'daniela.rojas@habilitapp.co' })
  })

  it('rejects an unknown email, an empty password and an empty email', async () => {
    await expect(signIn('issuer', 'nobody@example.co', 'x')).rejects.toEqual(new DataError('invalid-credentials'))
    await expect(signIn('issuer', 'coordinacion@cumbrefirme.co', '   ')).rejects.toEqual(
      new DataError('invalid-credentials'),
    )
    await expect(signIn('admin', '', 'x')).rejects.toEqual(new DataError('invalid-credentials'))
  })

  it('does not let an issuer email sign in as administrator, nor the other way round', async () => {
    await expect(signIn('admin', 'coordinacion@cumbrefirme.co', 'x')).rejects.toEqual(
      new DataError('invalid-credentials'),
    )
    await expect(signIn('issuer', 'daniela.rojas@habilitapp.co', 'x')).rejects.toEqual(
      new DataError('invalid-credentials'),
    )
  })

  it('keeps one session per role and signs out only the asked role', async () => {
    await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
    await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')

    await signOut('issuer')

    expect(await getSession('issuer')).toBeNull()
    expect(await getSession('admin')).not.toBeNull()
  })

  it('stores no password', async () => {
    await signIn('issuer', 'coordinacion@cumbrefirme.co', 'a-secret-value')

    expect(window.localStorage.getItem('habilitapp-demo')).not.toContain('a-secret-value')
  })
})
