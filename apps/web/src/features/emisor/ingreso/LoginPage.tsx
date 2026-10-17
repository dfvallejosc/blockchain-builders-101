import { useAuth, useSignIn } from '@clerk/react'
import { isClerkAPIResponseError } from '@clerk/react/errors'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/Logo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { loginSchema, type LoginFormValues } from '@/features/emisor/ingreso/loginSchema'
import type { SessionEndReason } from '@/features/emisor/auth/sessionEnd'

const PANEL_PATH = '/emisor'

type Failure = 'credentials' | 'generic'

const REJECTED_CREDENTIAL_CODES = ['form_identifier_not_found', 'form_password_incorrect']

const REASON_ALERTS: Record<SessionEndReason, { title: string; text: string }> = {
  expired: { title: 'Tu sesión venció', text: 'Inicia sesión de nuevo.' },
  revoked: { title: 'Tu entidad fue revocada', text: 'Tu entidad ya no puede usar HabilitApp.' },
  'no-role': { title: 'Tu cuenta no tiene un rol asignado', text: 'Pídele ayuda al equipo de HabilitApp.' },
  'not-issuer': { title: 'Esta cuenta no es de una entidad emisora', text: 'Entra con la cuenta de tu entidad.' },
}

// The location state is untrusted: only a known reason is shown.
const isSessionEndReason = (value: unknown): value is SessionEndReason =>
  typeof value === 'string' && Object.hasOwn(REASON_ALERTS, value)

const readReason = (state: unknown): SessionEndReason | null => {
  if (typeof state !== 'object' || state === null || !('reason' in state)) return null
  return isSessionEndReason(state.reason) ? state.reason : null
}

const failureFor = (error: unknown): Failure =>
  isClerkAPIResponseError(error) && error.errors.some((item) => REJECTED_CREDENTIAL_CODES.includes(item.code))
    ? 'credentials'
    : 'generic'

interface LoginFormProps {
  reason: SessionEndReason | null
}

const LoginForm = ({ reason }: LoginFormProps) => {
  const navigate = useNavigate()
  const { signIn } = useSignIn()
  const [failure, setFailure] = useState<Failure | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const attempt = async (values: LoginFormValues): Promise<Failure | null> => {
    const { error } = await signIn.password({ identifier: values.email, password: values.password })
    if (error) return failureFor(error)
    if (signIn.status !== 'complete') return 'generic'
    const { error: finalizeError } = await signIn.finalize()
    return finalizeError ? 'generic' : null
  }

  const submit = async (values: LoginFormValues) => {
    setFailure(null)
    const result = await attempt(values).catch((): Failure => 'generic')
    if (result) {
      setFailure(result)
      return
    }
    await navigate(PANEL_PATH)
  }

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 p-4 sm:p-6">
      <div>
        <p className="flex items-center gap-3 text-lg font-bold">
          <Logo className="size-8" />
          HabilitApp
        </p>
        <h1 className="mt-6 text-3xl font-bold">Panel del emisor</h1>
        <p className="mt-1 text-ha-text-muted">
          Entra con el usuario y la contraseña de tu entidad para emitir y consultar certificados.
        </p>
      </div>

      {failure === 'credentials' && (
        <Alert tone="danger" title="No pudimos iniciar tu sesión">
          El usuario o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.
        </Alert>
      )}
      {failure === 'generic' && (
        <Alert tone="danger" title="No pudimos iniciar tu sesión">
          Inténtalo de nuevo en un momento.
        </Alert>
      )}
      {failure === null && reason && (
        <Alert tone="danger" title={REASON_ALERTS[reason].title}>
          {REASON_ALERTS[reason].text}
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
        <Field
          label="Usuario"
          required
          help="Es el correo con el que registramos a tu entidad."
          error={errors.email?.message}
        >
          {(control) => <Input {...control} type="email" autoComplete="username" {...register('email', { onChange: () => setFailure(null) })} />}
        </Field>
        <Field label="Contraseña" required error={errors.password?.message}>
          {(control) => (
            <Input {...control} type="password" autoComplete="current-password" {...register('password', { onChange: () => setFailure(null) })} />
          )}
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="grid gap-2 text-sm text-ha-text-muted">
        <p>Si no recuerdas tu contraseña, pídele ayuda al equipo de HabilitApp.</p>
        <Link to="/" className="min-h-(--touch-min) font-semibold text-ha-primary underline">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}

export const LoginPage = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const reason = readReason(useLocation().state)

  if (!isLoaded) return null
  // With a reason, Clerk may still hold the session (its sign out failed): going to the panel would loop back here.
  if (isSignedIn && reason === null) return <Navigate to={PANEL_PATH} replace />
  return <LoginForm reason={reason} />
}
