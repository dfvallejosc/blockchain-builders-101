import { useCallback, useRef } from 'react'
import { CircleAlert } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, Input } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import type { IssuerSession, Session } from '@/data'
import { useRegisterWorker } from '@/features/emisor/trabajadores/useRegisterWorker'
import { DOCUMENT_TYPE_OPTIONS, workerSchema, type WorkerFormValues } from '@/features/emisor/trabajadores/workerSchema'

const ISSUE_PATH = '/emisor/emitir'
const CONSENT_ERROR_ID = 'worker-consent-error'
const CONSENT_HELP_ID = 'worker-consent-help'

const FIELD_LABELS: Record<keyof WorkerFormValues, string> = {
  fullName: 'Nombre completo',
  documentType: 'Tipo de documento',
  documentNumber: 'Número de documento',
  dataConsent: 'Autorización',
}

const RegisterWorkerForm = ({ session }: { session: IssuerSession }) => {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const comesFromIssue = params.get('volver') === 'emitir'
  const { blocked, submitting, error, register, clearError } = useRegisterWorker(session)

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
    register: field,
    handleSubmit,
    setFocus,
    formState: { errors, submitCount },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: { fullName: '', documentType: '', documentNumber: '', dataConsent: false },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  })

  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof WorkerFormValues)[]).filter((key) => errors[key])

  const submit = async (values: WorkerFormValues) => {
    if (blocked) return
    const worker = await register(values)
    if (!worker) return
    if (comesFromIssue) {
      navigate(`${ISSUE_PATH}?trabajador=${worker.id}&nuevo=1`)
      return
    }
    toast.show({ tone: 'success', title: 'Trabajador registrado', message: `${worker.fullName} ya está en tu lista.` })
    navigate(ISSUE_PATH)
  }

  const consentDescribedBy = errors.dataConsent ? `${CONSENT_HELP_ID} ${CONSENT_ERROR_ID}` : CONSENT_HELP_ID

  return (
    <section className="mx-auto grid w-full max-w-240 content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div>
        <h1 className="text-3xl font-bold">Registrar trabajador</h1>
        <p className="mt-1 text-ha-text-muted">
          Solo pedimos lo necesario para identificarlo. Nunca pedimos resultados médicos, restricciones ni diagnósticos.
        </p>
      </div>

      {blocked && (
        <Alert tone="danger" title="Tu entidad está revocada">
          Por eso no puedes registrar trabajadores nuevos.
        </Alert>
      )}

      {error === 'duplicate' && (
        <Alert tone="warning" title="Ya registraste a esta persona">
          Ya hay un trabajador con ese tipo y número de documento en tu entidad. Revisa los datos.
        </Alert>
      )}
      {error === 'failed' && (
        <Alert tone="danger" title="No pudimos registrar al trabajador">
          Revisa tu conexión e inténtalo de nuevo.
        </Alert>
      )}

      {submitCount > 0 && errorKeys.length > 0 && (
        <div ref={attachSummary} tabIndex={-1}>
          <Alert
            tone="danger"
            title={`Revisa ${errorKeys.length} ${errorKeys.length === 1 ? 'campo' : 'campos'} antes de continuar`}
          >
            <ul className="mt-1 grid gap-1">
              {errorKeys.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className="min-h-(--touch-min) font-semibold text-ha-primary underline"
                    onClick={() => setFocus(key)}
                  >
                    {FIELD_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(submit, () => {
          clearError()
          if (summaryRef.current) summaryRef.current.focus()
          else focusSummaryAfterRender.current = true
        })}
        className="grid gap-5"
      >
        <section className="grid gap-4 rounded-lg border border-ha-border bg-ha-surface p-5">
          <h2 className="text-lg font-semibold">Datos del trabajador</h2>
          <Field
            label={FIELD_LABELS.fullName}
            required
            help="Nombres y apellidos, como aparecen en su documento."
            error={errors.fullName?.message}
          >
            {(control) => <Input {...control} autoComplete="off" {...field('fullName')} />}
          </Field>
          <Field label={FIELD_LABELS.documentType} required error={errors.documentType?.message}>
            {(control) => (
              <Select {...control} {...field('documentType')}>
                <option value="">Elige un tipo</option>
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={FIELD_LABELS.documentNumber}
            required
            help="Sin puntos ni espacios."
            error={errors.documentNumber?.message}
          >
            {(control) => <Input {...control} autoComplete="off" inputMode="text" {...field('documentNumber')} />}
          </Field>
        </section>

        <section className="grid gap-2 rounded-lg border border-ha-border bg-ha-surface p-5">
          <h2 className="text-lg font-semibold">Autorización</h2>
          <Checkbox
            label="El trabajador autoriza el tratamiento de sus datos personales (obligatorio)"
            aria-describedby={consentDescribedBy}
            aria-invalid={errors.dataConsent ? true : undefined}
            aria-required
            {...field('dataConsent')}
          />
          <p id={CONSENT_HELP_ID} className="text-sm text-ha-text-muted">
            Márcala solo si el trabajador ya dio su autorización. Sin ella no podemos registrarlo.
          </p>
          {errors.dataConsent && (
            <p id={CONSENT_ERROR_ID} className="flex items-start gap-2 text-sm font-medium text-ha-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {errors.dataConsent.message}
            </p>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to={ISSUE_PATH} className={buttonVariants({ variant: 'ghost' })}>
            Cancelar
          </Link>
          <Button type="submit" disabled={blocked || submitting}>
            Registrar trabajador
          </Button>
        </div>
      </form>
    </section>
  )
}

export const RegisterWorkerPage = () => {
  const session = useOutletContext<Session>()
  return session.role === 'issuer' ? <RegisterWorkerForm session={session} /> : null
}
