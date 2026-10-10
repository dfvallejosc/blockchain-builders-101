import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip, type ChipStatus } from '@/components/ui/status-chip'
import { useToast } from '@/components/ui/toast-context'

const CHIP_STATUSES: ChipStatus[] = ['valid', 'expired', 'invalid', 'annulled', 'in-review', 'revoked']

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-4 border-t border-ha-border py-6">
    <h2 className="text-xl font-bold">{title}</h2>
    {children}
  </section>
)

export const ComponentsPage = () => {
  const { show } = useToast()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ha-primary">Componentes</h1>
      <p className="mt-2 text-ha-text-muted">Muestra solo para desarrollo: cada componente con sus estados.</p>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Emitir certificado</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver detalle</Button>
          <Button variant="destructive">Anular certificado</Button>
          <Button disabled>Deshabilitado</Button>
          <Button loading loadingText="Emitiendo…">
            Emitir certificado
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeño</Button>
          <Button size="md">Mediano</Button>
          <Button size="lg">Grande</Button>
          <Button iconOnly aria-label="Registrar emisor">
            <Plus aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </Section>

      <Section title="Campos">
        <Field label="Nombre completo" required help="Como aparece en su documento.">
          {(control) => <Input {...control} placeholder="Carlos Andrés Ramírez" />}
        </Field>
        <Field label="NIT" required error="Escribe un NIT con dígito de verificación, por ejemplo 901.482.317-5.">
          {(control) => <Input {...control} defaultValue="901482317" />}
        </Field>
        <Field label="Entidad">{(control) => <Input {...control} disabled defaultValue="Cumbre Firme" />}</Field>
      </Section>

      <Section title="Chips de estado">
        <div className="flex flex-wrap gap-3">
          {CHIP_STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {CHIP_STATUSES.map((status) => (
            <StatusChip key={status} status={status} size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Alertas y avisos">
        <Alert tone="success" title="Emisor registrado">
          Ya puede emitir certificados.
        </Alert>
        <Alert tone="warning" title="Entidad revocada">
          No puedes emitir certificados.
        </Alert>
        <Alert tone="danger" title="No pudimos iniciar tu sesión">
          El correo o la contraseña no coinciden.
        </Alert>
        <Alert tone="info" title="Acceso enviado" onClose={() => undefined}>
          Le enviamos las instrucciones por correo.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => show({ tone: 'success', title: 'Certificado emitido', message: 'Ya puedes imprimirlo.' })}>
            Mostrar aviso
          </Button>
          <Button variant="secondary" onClick={() => show({ tone: 'danger', title: 'No se pudo guardar', message: 'Inténtalo de nuevo.' })}>
            Mostrar aviso de error
          </Button>
        </div>
      </Section>

      <Section title="Esqueletos">
        <div className="grid gap-2">
          <Skeleton className="w-2/3" />
          <Skeleton className="w-full" />
          <Skeleton className="w-1/2" />
        </div>
      </Section>
    </main>
  )
}
