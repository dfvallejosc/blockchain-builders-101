import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { Logo } from '@/components/Logo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { signIn } from '@/data'
import { loginSchema, type LoginFormValues } from '@/features/admin/ingreso/loginSchema'
import { useSession } from '@/hooks/useSession'

const PANEL_PATH = '/admin'

const LoginForm = () => {
  const navigate = useNavigate()
  const [rejected, setRejected] = useState(false)
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

  const submit = async (values: LoginFormValues) => {
    setRejected(false)
    try {
      await signIn('admin', values.email, values.password)
      navigate(PANEL_PATH)
    } catch {
      setRejected(true)
    }
  }

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 p-4 sm:p-6">
      <div>
        <p className="flex items-center gap-3 text-lg font-bold">
          <Logo className="size-8" />
          HabilitApp
        </p>
        <h1 className="mt-6 text-3xl font-bold">Panel de administración</h1>
        <p className="mt-1 text-ha-text-muted">Entra con el correo que el equipo de HabilitApp registró para ti.</p>
      </div>

      {rejected && (
        <Alert tone="danger" title="No pudimos iniciar tu sesión">
          El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
        <Field label="Correo" required error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="username"
              placeholder="nombre@habilitapp.co"
              {...register('email', { onChange: () => setRejected(false) })}
            />
          )}
        </Field>
        <Field label="Contraseña" required error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="current-password"
              {...register('password', { onChange: () => setRejected(false) })}
            />
          )}
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>

      <div className="grid gap-2 text-sm text-ha-text-muted">
        <p>Uso interno del equipo de HabilitApp.</p>
        <Link to="/" className="min-h-(--touch-min) font-semibold text-ha-primary underline">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}

export const LoginPage = () => {
  const state = useSession('admin')

  if (state.status === 'loading') return null
  if (state.session !== null) return <Navigate to={PANEL_PATH} replace />
  return <LoginForm />
}
