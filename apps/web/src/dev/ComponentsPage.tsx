import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/field'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Steps } from '@/components/ui/steps'
import { StatusChip, type ChipStatus } from '@/components/ui/status-chip'
import { useToast } from '@/components/ui/toast-context'

const CHIP_STATUSES: ChipStatus[] = ['valid', 'expired', 'invalid', 'annulled', 'in-review', 'revoked']

interface SampleWorker {
  id: string
  name: string
  document: string
  certificates: number
}

const SAMPLE_WORKERS: SampleWorker[] = [
  { id: 'w1', name: 'Carlos Andrés Ramírez Pineda', document: 'C.C. 1.020.345.678', certificates: 2 },
  { id: 'w2', name: 'Paola Andrea Niño Vargas', document: 'C.C. 52.418.903', certificates: 3 },
  { id: 'w3', name: 'Wilmer Eduardo Quintero Salas', document: 'C.E. 1.043.822', certificates: 1 },
]

const WORKER_COLUMNS: Column<SampleWorker>[] = [
  { key: 'name', header: 'Nombre', cell: (row) => row.name, sortValue: (row) => row.name },
  { key: 'document', header: 'Documento', cell: (row) => <span className="font-mono">{row.document}</span> },
  { key: 'certificates', header: 'Certificados', cell: (row) => row.certificates, sortValue: (row) => row.certificates },
]

const CERTIFICATE_OPTIONS = [
  { value: 'height-work', label: 'Trabajo en alturas' },
  { value: 'confined-spaces', label: 'Espacios confinados' },
  { value: 'crane-operation', label: 'Operación de grúa' },
]

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-4 border-t border-ha-border py-6">
    <h2 className="text-xl font-bold">{title}</h2>
    {children}
  </section>
)

export const ComponentsPage = () => {
  const { show } = useToast()
  const [certificateTypes, setCertificateTypes] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

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
        <Field label="Nombre completo" required help="Como aparece en tu documento.">
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
          Ya puedes emitir certificados.
        </Alert>
        <Alert tone="warning" title="Entidad revocada">
          No puedes emitir certificados.
        </Alert>
        <Alert tone="danger" title="No pudimos iniciar tu sesión">
          El correo o la contraseña no coinciden.
        </Alert>
        <Alert tone="info" title="Acceso enviado" onClose={() => undefined}>
          Te enviamos las instrucciones por correo.
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

      <Section title="Selectores y casillas">
        <Field label="Ciudad" required>
          {(control) => (
            <Select {...control} defaultValue="">
              <option value="">Elige una ciudad</option>
              <option value="bogota">Bogotá</option>
              <option value="medellin">Medellín</option>
            </Select>
          )}
        </Field>
        <Field label="Certificados que emite" required help="Solo podrás emitir los tipos que marques aquí.">
          {(control) => (
            <MultiSelect
              {...control}
              options={CERTIFICATE_OPTIONS}
              value={certificateTypes}
              onChange={setCertificateTypes}
              placeholder="Elegir certificados"
              summary={(count) => (count === 1 ? '1 tipo seleccionado' : `${count} tipos seleccionados`)}
            />
          )}
        </Field>
        <Checkbox label="El trabajador autoriza el tratamiento de sus datos personales" />
        <Checkbox label="Deshabilitada" disabled />
      </Section>

      <Section title="Tabla">
        <DataTable caption="Trabajadores de ejemplo" columns={WORKER_COLUMNS} rows={SAMPLE_WORKERS} getRowKey={(row) => row.id} />
        <DataTable caption="Tabla cargando" columns={WORKER_COLUMNS} rows={[]} getRowKey={(row) => row.id} loading />
      </Section>

      <Section title="Estados vacíos">
        <div className="rounded-lg border border-ha-border bg-ha-surface">
          <EmptyState variant="empty" title="Aún no hay certificados" action={<Button>Emitir certificado</Button>}>
            Cuando emitas el primero, aparecerá aquí.
          </EmptyState>
        </div>
        <div className="rounded-lg border border-ha-border bg-ha-surface">
          <EmptyState variant="no-results" title="No encontramos resultados">
            Prueba con otro nombre o quita los filtros.
          </EmptyState>
        </div>
        <div className="rounded-lg border border-ha-border bg-ha-surface">
          <EmptyState variant="error" title="No pudimos cargar la lista" action={<Button variant="secondary">Reintentar</Button>}>
            Revisa tu conexión e inténtalo de nuevo.
          </EmptyState>
        </div>
      </Section>

      <Section title="Diálogo de confirmación">
        <div>
          <Button variant="destructive" onClick={() => setDialogOpen(true)}>
            Anular certificado
          </Button>
        </div>
        <ConfirmDialog
          open={dialogOpen}
          tone="destructive"
          title="Anular certificado"
          confirmLabel="Anular certificado"
          confirmText="ANULAR"
          onConfirm={() => setDialogOpen(false)}
          onCancel={() => setDialogOpen(false)}
        >
          Vas a anular el certificado HAB-2026-003981. No se puede deshacer.
        </ConfirmDialog>
      </Section>

      <Section title="Pasos">
        <Steps steps={['Elegir trabajador', 'Datos del certificado', 'Resumen', 'Certificado emitido']} current={1} />
      </Section>
    </main>
  )
}
