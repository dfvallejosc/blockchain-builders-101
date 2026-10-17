import { useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { IssuerProfile } from '@/api/me'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import type { Certificate, Worker } from '@/data'
import { today } from '@/data/clock'
import { findActiveDuplicate } from '@/features/emisor/emitir/findActiveDuplicate'
import { buildIssueSchema, type IssueFormValues } from '@/features/emisor/emitir/issueSchema'
import type { DetailsFormValues } from '@/features/emisor/emitir/useIssueFlow'
import { certificateTypeLabel, formatDocument, formatLongDate } from '@/features/verificar/format'

const DUPLICATE_ID = 'details-duplicate'

interface DetailsStepProps {
  worker: Worker
  profile: IssuerProfile
  certificates: Certificate[]
  initialValues: DetailsFormValues
  onChangeWorker: (values: DetailsFormValues) => void
  onSubmit: (values: DetailsFormValues) => void
}

const FIELD_LABELS: Record<keyof IssueFormValues, string> = {
  type: 'Tipo de certificado',
  issuedAt: 'Fecha de emisión',
  validUntil: 'Vigente hasta',
}

export const DetailsStep = ({ worker, profile, certificates, initialValues, onChangeWorker, onSubmit }: DetailsStepProps) => {
  const todayIso = today()
  const schema = useMemo(() => buildIssueSchema(todayIso), [todayIso])
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
    watch,
    getValues,
    trigger,
    setFocus,
    formState: { errors, submitCount, touchedFields },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  })

  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof IssueFormValues)[]).filter((key) => errors[key])

  const allowedType = (value: string) => profile.certificateTypes.find((type) => type === value)

  const selectedType = allowedType(watch('type'))
  const duplicate = selectedType ? findActiveDuplicate(certificates, worker.id, selectedType, todayIso) : null

  const submit = (values: IssueFormValues) => {
    if (duplicate) return
    const type = allowedType(values.type)
    if (!type) return
    onSubmit({ type, issuedAt: values.issuedAt, validUntil: values.validUntil })
  }

  const changeWorker = () => {
    const values = getValues()
    onChangeWorker({ type: allowedType(values.type) ?? '', issuedAt: values.issuedAt, validUntil: values.validUntil })
  }

  return (
    <section className="rounded-lg border border-ha-border bg-ha-surface p-5">
      <h2 tabIndex={-1} className="text-lg font-semibold">
        Datos del certificado
      </h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ha-border bg-ha-surface-2 px-4 py-2">
        <span>
          <b>{worker.fullName}</b> · <span className="font-mono">{formatDocument(worker.documentType, worker.documentNumber)}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={changeWorker}>
          Cambiar trabajador
        </Button>
      </div>

      {submitCount > 0 && errorKeys.length > 0 && (
        <div ref={attachSummary} tabIndex={-1} className="mt-4">
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
          if (summaryRef.current) summaryRef.current.focus()
          else focusSummaryAfterRender.current = true
        })}
        className="mt-4 grid gap-4"
      >
        <Field
          label={FIELD_LABELS.type}
          required
          help="Tu entidad solo puede emitir estos tipos."
          error={errors.type?.message}
        >
          {(control) => (
            <Select {...control} {...register('type')}>
              <option value="">Elige un tipo</option>
              {profile.certificateTypes.map((type) => (
                <option key={type} value={type}>
                  {certificateTypeLabel(type)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {duplicate && (
          <div id={DUPLICATE_ID}>
            <Alert
              tone="warning"
              title="Ya tiene este certificado"
              action={
                <Link to="/emisor/certificados" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Ver certificados
                </Link>
              }
            >
              {`${worker.fullName} ya tiene este certificado habilitado hasta el ${formatLongDate(duplicate.validUntil)}. Podrás emitir otro cuando venza, o si lo anulas.`}
            </Alert>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={FIELD_LABELS.issuedAt}
            required
            help={`Por defecto es hoy, ${formatLongDate(todayIso)}.`}
            error={errors.issuedAt?.message}
          >
            {(control) => (
              <Input
                {...control}
                type="date"
                {...register('issuedAt', {
                  onChange: () => {
                    if (touchedFields.validUntil || submitCount > 0) void trigger('validUntil')
                  },
                })}
              />
            )}
          </Field>
          <Field
            label={FIELD_LABELS.validUntil}
            required
            help="Último día en que el certificado estará habilitado."
            error={errors.validUntil?.message}
          >
            {(control) => <Input {...control} type="date" {...register('validUntil')} />}
          </Field>
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={changeWorker}>
            Volver
          </Button>
          <Button type="submit" disabled={duplicate !== null} aria-describedby={duplicate ? DUPLICATE_ID : undefined}>
            Revisar resumen
          </Button>
        </div>
      </form>
    </section>
  )
}
