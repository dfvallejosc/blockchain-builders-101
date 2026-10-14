import { useCallback, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import {
  CERTIFICATE_OPTIONS,
  CITY_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  registerEntitySchema,
  type RegisterEntityValues,
} from '@/features/admin/emisores/registerEntitySchema'
import { useRegisterEntity } from '@/features/admin/emisores/useRegisterEntity'

const LIST_PATH = '/admin/emisores'

const FIELD_LABELS: Record<keyof RegisterEntityValues, string> = {
  name: 'Nombre de la entidad',
  type: 'Tipo de entidad',
  city: 'Ciudad',
  certificateTypes: 'Certificados que emite',
  nit: 'NIT',
  ministryRegistration: 'Número de registro ante el Ministerio del Trabajo',
  contactName: 'Persona de contacto',
  email: 'Correo',
  phone: 'Teléfono',
}

const certificatesSummary = (count: number): string =>
  `${count} ${count === 1 ? 'certificado seleccionado' : 'certificados seleccionados'}`

export const RegisterEntityPage = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { submitting, error, register, clearError } = useRegisterEntity()

  const summaryRef = useRef<HTMLDivElement>(null)
  const focusSummaryAfterRender = useRef(false)
  const certificatesRef = useRef<HTMLDivElement>(null)
  const attachSummary = useCallback((node: HTMLDivElement | null) => {
    summaryRef.current = node
    if (node && focusSummaryAfterRender.current) {
      node.focus()
      focusSummaryAfterRender.current = false
    }
  }, [])

  const focusOnMount = useCallback((node: HTMLDivElement | null) => node?.focus(), [])

  const {
    register: field,
    control,
    handleSubmit,
    setFocus,
    formState: { errors, submitCount },
  } = useForm<RegisterEntityValues>({
    resolver: zodResolver(registerEntitySchema),
    defaultValues: {
      name: '',
      type: '',
      city: '',
      certificateTypes: [],
      nit: '',
      ministryRegistration: '',
      contactName: '',
      email: '',
      phone: '',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  })

  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof RegisterEntityValues)[]).filter((key) => errors[key])

  const focusField = (key: keyof RegisterEntityValues) => {
    if (key === 'certificateTypes') certificatesRef.current?.querySelector('button')?.focus()
    else setFocus(key)
  }

  const submit = async (values: RegisterEntityValues) => {
    const entity = await register(values)
    if (!entity) return
    toast.show({ tone: 'success', title: 'Emisor registrado', message: `${entity.name} ya puede emitir certificados.` })
    navigate(`${LIST_PATH}/${entity.id}?nuevo=1`)
  }

  return (
    <section className="mx-auto grid w-full max-w-240 content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div>
        <h1 className="text-3xl font-bold">Registrar emisor</h1>
        <p className="mt-1 text-ha-text-muted">
          Cuando registres la entidad, podrá emitir certificados. Revisa bien el NIT y el correo: el correo será su
          usuario de acceso.
        </p>
      </div>

      {error && (
        <div key={error} ref={focusOnMount} tabIndex={-1}>
          {error === 'duplicate' ? (
            <Alert tone="warning" title="Ya hay un emisor con esos datos">
              El nombre, el NIT o el correo ya están registrados. Revisa los datos.
            </Alert>
          ) : (
            <Alert tone="danger" title="No pudimos registrar al emisor">
              Revisa tu conexión e inténtalo de nuevo.
            </Alert>
          )}
        </div>
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
                    onClick={() => focusField(key)}
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
          <h2 className="text-lg font-semibold">Datos de la entidad</h2>
          <Field
            label={FIELD_LABELS.name}
            required
            help="Como aparece en su registro legal."
            error={errors.name?.message}
          >
            {(controlProps) => <Input {...controlProps} autoComplete="off" {...field('name')} />}
          </Field>
          <Field label={FIELD_LABELS.type} required error={errors.type?.message}>
            {(controlProps) => (
              <Select {...controlProps} {...field('type')}>
                <option value="">Elige un tipo</option>
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={FIELD_LABELS.city} required error={errors.city?.message}>
            {(controlProps) => (
              <Select {...controlProps} {...field('city')}>
                <option value="">Elige una ciudad</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={FIELD_LABELS.certificateTypes}
            required
            help="Solo podrá emitir los tipos que marques aquí."
            error={errors.certificateTypes?.message}
          >
            {(controlProps) => (
              <Controller
                control={control}
                name="certificateTypes"
                render={({ field: { value, onChange } }) => (
                  <div ref={certificatesRef}>
                    <MultiSelect
                      {...controlProps}
                      options={[...CERTIFICATE_OPTIONS]}
                      value={value}
                      onChange={onChange}
                      placeholder="Elegir certificados"
                      summary={certificatesSummary}
                    />
                  </div>
                )}
              />
            )}
          </Field>
          <Field
            label={FIELD_LABELS.nit}
            required
            help="Con dígito de verificación, por ejemplo 901.482.317-5."
            error={errors.nit?.message}
          >
            {(controlProps) => <Input {...controlProps} autoComplete="off" inputMode="numeric" {...field('nit')} />}
          </Field>
          <Field label={FIELD_LABELS.ministryRegistration} help="Puedes completarlo después.">
            {(controlProps) => <Input {...controlProps} autoComplete="off" {...field('ministryRegistration')} />}
          </Field>
        </section>

        <section className="grid gap-4 rounded-lg border border-ha-border bg-ha-surface p-5">
          <h2 className="text-lg font-semibold">Contacto y acceso</h2>
          <Field label={FIELD_LABELS.contactName} required error={errors.contactName?.message}>
            {(controlProps) => <Input {...controlProps} autoComplete="off" {...field('contactName')} />}
          </Field>
          <Field
            label={FIELD_LABELS.email}
            required
            help="Será su usuario de acceso. Le enviaremos allí las instrucciones para entrar."
            error={errors.email?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="email"
                autoComplete="off"
                placeholder="nombre@entidad.co"
                {...field('email')}
              />
            )}
          </Field>
          <Field
            label={FIELD_LABELS.phone}
            required
            help="Celular o fijo con indicativo, 10 dígitos."
            error={errors.phone?.message}
          >
            {(controlProps) => (
              <Input {...controlProps} type="tel" autoComplete="off" inputMode="tel" {...field('phone')} />
            )}
          </Field>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to={LIST_PATH} className={buttonVariants({ variant: 'ghost' })}>
            Cancelar
          </Link>
          <Button type="submit" disabled={submitting}>
            Registrar emisor
          </Button>
        </div>
      </form>
    </section>
  )
}
