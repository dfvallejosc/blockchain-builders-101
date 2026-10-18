import { useAuth, useSignUp } from '@clerk/react'
import { useCallback, useRef, useState, type JSX } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Logo } from '@/components/Logo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { acceptInvitationSchema, type AcceptInvitationValues } from '@/features/emisor/invitacion/acceptInvitationSchema'
import { invitationFailureFor, type InvitationFailure } from '@/features/emisor/invitacion/acceptInvitationErrors'

const PANEL_PATH = '/emisor'
const SIGN_IN_PATH = '/emisor/ingresar'
const BAD_LINK_TITLE = 'Este enlace ya no sirve'
const BAD_LINK_TEXT = 'Puede que haya vencido o que ya lo hayas usado. Si ya creaste tu contraseña, inicia sesión. Si no, pídele al equipo de HabilitApp una invitación nueva.'
const GENERIC_FAILURE_TEXT = 'No pudimos crear tu contraseña. Inténtalo de nuevo en un momento.'
const FIELD_LABELS = { password: 'Contraseña', confirmation: 'Repite la contraseña' } as const

const InvitationHeader = ({ title = 'Crea tu contraseña' }: { title?: string }) => (
  <div>
    <p className="flex items-center gap-3 text-lg font-bold">
      <Logo className="size-8" />
      HabilitApp
    </p>
    <h1 className="mt-6 text-3xl font-bold">{title}</h1>
    {title === 'Crea tu contraseña' && <p className="mt-1 text-ha-text-muted">Usa una contraseña que puedas recordar para entrar al panel de tu entidad.</p>}
  </div>
)

const BadLinkView = () => (
  <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 p-4 sm:p-6">
    <InvitationHeader title={BAD_LINK_TITLE} />
    <Alert tone="danger" title={BAD_LINK_TITLE}>{BAD_LINK_TEXT}</Alert>
    <Link to={SIGN_IN_PATH} className="inline-flex min-h-(--touch-min) items-center justify-center rounded-md bg-ha-primary px-5 font-semibold text-ha-on-primary">
      Iniciar sesión
    </Link>
  </main>
)

interface InvitationFormProps {
  ticket: string
}

const InvitationForm = ({ ticket }: InvitationFormProps): JSX.Element => {
  const { signUp } = useSignUp()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<InvitationFailure | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const focusSummaryAfterRender = useRef(false)
  const attachSummary = useCallback((node: HTMLDivElement | null) => {
    summaryRef.current = node
    if (node && focusSummaryAfterRender.current) {
      node.focus()
      focusSummaryAfterRender.current = false
    }
  }, [])
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<AcceptInvitationValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { password: '', confirmation: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const submit = async (values: AcceptInvitationValues) => {
    setFailure(null)
    const recordFailure = (error: unknown) => {
      const result = invitationFailureFor(error)
      setFailure(result)
    }
    try {
      const { error } = await signUp.create({ strategy: 'ticket', ticket, password: values.password })
      if (error) {
        recordFailure(error)
        return
      }
      if (signUp.status !== 'complete') {
        setFailure('generic')
        return
      }
      const { error: finalizeError } = await signUp.finalize()
      if (finalizeError) {
        recordFailure(finalizeError)
        return
      }
      await navigate(PANEL_PATH)
    } catch {
      setFailure('generic')
    }
  }

  if (failure === 'bad-link') return <BadLinkView />

  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof AcceptInvitationValues)[]).filter((key) => errors[key])

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 p-4 sm:p-6">
      <InvitationHeader />
      {failure === 'generic' && <Alert tone="danger" title={GENERIC_FAILURE_TEXT} />}
      {submitCount > 0 && errorKeys.length > 0 && (
        <div ref={attachSummary} tabIndex={-1}>
          <Alert tone="danger" title={`Revisa ${errorKeys.length} ${errorKeys.length === 1 ? 'campo' : 'campos'} antes de continuar`}>
            <ul className="mt-1 grid gap-1">
              {errorKeys.map((key) => (
                <li key={key}>
                  <button type="button" className="min-h-(--touch-min) font-semibold text-ha-primary underline" onClick={() => setFocus(key)}>
                    {FIELD_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      <form noValidate onSubmit={handleSubmit(submit, () => {
        if (summaryRef.current) summaryRef.current.focus()
        else focusSummaryAfterRender.current = true
      })} className="grid gap-4">
        <Field label="Contraseña" required error={errors.password?.message}>
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('password', { onChange: () => setFailure(null) })} />}
        </Field>
        <Field label="Repite la contraseña" required error={errors.confirmation?.message}>
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('confirmation', { onChange: () => setFailure(null) })} />}
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando contraseña…' : 'Crear contraseña'}
        </Button>
      </form>
    </main>
  )
}

export const AcceptInvitationPage = (): JSX.Element | null => {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const ticket = searchParams.get('__clerk_ticket')
  const [sessionClosed, setSessionClosed] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)

  if (!isLoaded) return null
  if (!ticket) return <BadLinkView />
  if (isSignedIn && !sessionClosed) {
    const continueAfterSignOut = async () => {
      setSignOutFailed(false)
      try {
        await signOut()
        setSessionClosed(true)
      } catch {
        setSignOutFailed(true)
      }
    }

    return (
      <main className="mx-auto grid min-h-svh w-full max-w-md content-center gap-6 p-4 sm:p-6">
        <InvitationHeader />
        <Alert tone="info" title="Ya hay una sesión abierta en este navegador. Para crear tu contraseña, cierra esa sesión primero." />
        {signOutFailed && <Alert tone="danger" title={GENERIC_FAILURE_TEXT} />}
        <Button onClick={() => void continueAfterSignOut()}>Cerrar sesión y continuar</Button>
      </main>
    )
  }
  return <InvitationForm ticket={ticket} />
}
