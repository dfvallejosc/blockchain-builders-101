import { FileCheck } from 'lucide-react'
import { StatusChip, type ChipStatus } from '@/components/ui/status-chip'
import { Band, Card, IconTile, Section } from '@/features/inicio/landing-ui'

const STEPS = [
  {
    title: 'La entidad emite el certificado',
    text: 'Un consultorio o centro de entrenamiento autorizado registra al trabajador y emite su certificado en pocos pasos.',
  },
  {
    title: 'El certificado lleva un código QR',
    text: 'El trabajador lo recibe impreso o en PDF. El código QR es un enlace al resultado de ese certificado.',
  },
  {
    title: 'En la obra se escanea y se decide',
    text: 'El coordinador de SST apunta la cámara al código, ve el veredicto y compara el nombre con la cédula.',
  },
]

const CERTIFICATE_TYPES = [
  { title: 'Trabajo en alturas', text: 'Para el personal que trabaja en andamios, fachadas y cubiertas.' },
  { title: 'Espacios confinados', text: 'Para quien entra a tanques, cámaras, pozos y otros espacios cerrados.' },
  { title: 'Operación de grúa', text: 'Para quien opera grúas y equipos de izaje.' },
  {
    title: 'Concepto médico ocupacional',
    text: 'Lo emiten consultorios de salud ocupacional. Solo se muestra que existe y hasta cuándo vale.',
  },
]

const VERDICTS: { status: ChipStatus; text: string }[] = [
  { status: 'valid', text: 'Vigente y de una entidad autorizada.' },
  { status: 'expired', text: 'Es auténtico, pero su vigencia ya pasó.' },
  { status: 'annulled', text: 'La entidad que lo emitió lo anuló.' },
  { status: 'invalid', text: 'No existe, fue alterado o su entidad fue revocada.' },
]

const AUDIENCES = [
  {
    title: 'Si tienes un consultorio o un centro de entrenamiento',
    text: 'HabilitApp registra a tu entidad y desde ahí emites los certificados.',
    items: [
      'Emite un certificado en pocos pasos y entrega su hoja con QR.',
      'Encuentra, corrige o anula un certificado cuando haga falta.',
      'Ve solo los trabajadores y certificados de tu entidad.',
    ],
    hint: (
      <>
        Entra desde <b>Iniciar sesión</b>, arriba a la derecha.
      </>
    ),
  },
  {
    title: 'Si coordinas la seguridad en una obra',
    text: 'No necesitas cuenta ni instalar nada: la cámara del celular es suficiente.',
    items: [
      'Escanea el código QR del certificado del trabajador.',
      'Compara el nombre y el documento con su cédula.',
      'Decide el ingreso con el veredicto en la mano.',
    ],
    hint: null,
  },
]

export const HowItWorks = () => (
  <Band>
    <Section id="como-funciona" heading="Cómo funciona" intro="Tres pasos, desde el consultorio hasta la puerta de la obra.">
      <ol className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card>
              <span className="grid size-9 place-items-center rounded-md bg-ha-primary-soft font-bold text-ha-primary">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl leading-snug font-bold">{step.title}</h3>
              <p className="mt-2 text-ha-text-muted">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  </Band>
)

export const CertificateTypes = () => (
  <Section id="certificados" heading="Los certificados que se pueden comprobar" intro="Cada entidad emite solo los tipos para los que está autorizada.">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CERTIFICATE_TYPES.map((type) => (
        <Card key={type.title}>
          <IconTile>
            <FileCheck aria-hidden="true" className="size-6" />
          </IconTile>
          <h3 className="mt-3 text-lg leading-snug font-bold">{type.title}</h3>
          <p className="mt-1 text-sm text-ha-text-muted">{type.text}</p>
        </Card>
      ))}
    </div>
  </Section>
)

export const VerdictsSection = () => (
  <Band>
    <Section id="resultado" heading="Un resultado que se lee de un vistazo">
      <div className="grid items-start gap-6 md:grid-cols-2">
        <div className="grid gap-3">
          <p className="text-lg leading-snug text-ha-text-muted">
            Pensado para el celular, con sol y con prisa. El veredicto va primero, con ícono, palabra y color: nunca solo color.
          </p>
          <p>Si no hay señal, la página lo dice y ofrece reintentar: un fallo de conexión nunca se muestra como “No válido”.</p>
        </div>
        <ul className="grid list-none gap-3 p-0">
          {VERDICTS.map((verdict) => (
            <li
              key={verdict.status}
              className="flex flex-wrap items-center gap-4 rounded-md border border-ha-border bg-ha-surface p-4"
            >
              <StatusChip status={verdict.status} />
              <p>{verdict.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  </Band>
)

export const AudienceSection = () => (
  <Section id="entidades" heading="Para quién es HabilitApp" intro="Dos usos, una misma fuente de verdad.">
    <div className="grid items-start gap-6 md:grid-cols-2">
      {AUDIENCES.map((audience) => (
        <article key={audience.title}>
          <Card>
            <h3 className="text-xl leading-snug font-bold">{audience.title}</h3>
            <p className="mt-2 text-ha-text-muted">{audience.text}</p>
            <ul className="mt-4 grid list-disc gap-2 pl-5">
              {audience.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {audience.hint && (
              <p className="mt-5 border-t border-ha-border pt-4 text-sm text-ha-text-muted">{audience.hint}</p>
            )}
          </Card>
        </article>
      ))}
    </div>
  </Section>
)
