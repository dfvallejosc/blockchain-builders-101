import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/field'
import { Radio } from '@/components/ui/radio'
import type { Certificate, Worker } from '@/data'
import { formatDocument } from '@/features/verificar/format'

const REGISTER_WORKER_PATH = '/emisor/trabajadores/nuevo?volver=emitir'
const HELP_ID = 'worker-step-help'

interface WorkerStepProps {
  workers: Worker[]
  certificates: Certificate[]
  selectedId: string | null
  blockedReason: string | null
  onSelect: (id: string) => void
  onContinue: () => void
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const matchesQuery = (worker: Worker, query: string): boolean => {
  const normalized = normalize(query)
  if (normalized === '') return true
  const digits = normalized.replace(/[^a-z0-9]/g, '')
  return normalize(worker.fullName).includes(normalized) || (digits !== '' && worker.documentNumber.toLowerCase().includes(digits))
}

export const WorkerStep = ({ workers, certificates, selectedId, blockedReason, onSelect, onContinue }: WorkerStepProps) => {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => workers.filter((worker) => matchesQuery(worker, query)), [workers, query])

  const countsByWorker = useMemo(() => {
    const counts = new Map<string, number>()
    for (const certificate of certificates) counts.set(certificate.workerId, (counts.get(certificate.workerId) ?? 0) + 1)
    return counts
  }, [certificates])

  const columns = useMemo<Column<Worker>[]>(
    () => [
      {
        key: 'choose',
        header: 'Elegir',
        className: 'w-20',
        cell: (worker) => (
          <Radio
            name="worker"
            hideLabel
            label={`Elegir a ${worker.fullName}`}
            checked={worker.id === selectedId}
            onChange={() => onSelect(worker.id)}
          />
        ),
      },
      { key: 'name', header: 'Trabajador', cell: (worker) => worker.fullName },
      {
        key: 'document',
        header: 'Documento',
        cell: (worker) => <span className="font-mono">{formatDocument(worker.documentType, worker.documentNumber)}</span>,
      },
      { key: 'certificates', header: 'Certificados', className: 'text-right', cell: (worker) => countsByWorker.get(worker.id) ?? 0 },
    ],
    [selectedId, onSelect, countsByWorker],
  )

  const registerAction = blockedReason ? (
    <Button variant="secondary" disabled aria-describedby={HELP_ID}>
      <Plus aria-hidden="true" className="size-5" />
      Registrar trabajador nuevo
    </Button>
  ) : (
    <Link to={REGISTER_WORKER_PATH} className={buttonVariants({ variant: 'secondary' })}>
      <Plus aria-hidden="true" className="size-5" />
      Registrar trabajador nuevo
    </Link>
  )

  if (workers.length === 0) {
    return (
      <section className="rounded-lg border border-ha-border bg-ha-surface p-5">
        <h2 tabIndex={-1} className="text-lg font-semibold">
          Aún no hay trabajadores
        </h2>
        <EmptyState
          variant="empty"
          title="Registra al primer trabajador"
          action={
            blockedReason ? (
              <Button variant="primary" disabled aria-describedby={HELP_ID}>
                Registrar trabajador
              </Button>
            ) : (
              <Link to={REGISTER_WORKER_PATH} className={buttonVariants({ variant: 'primary' })}>
                Registrar trabajador
              </Link>
            )
          }
        >
          Registra al trabajador para poder emitirle su primer certificado.
        </EmptyState>
        {blockedReason && (
          <p id={HELP_ID} className="text-sm text-ha-text-muted">
            {blockedReason}
          </p>
        )}
      </section>
    )
  }

  const selectedWorker = workers.find((worker) => worker.id === selectedId)
  const help =
    blockedReason ??
    (selectedWorker ? `Elegiste a ${selectedWorker.fullName}.` : 'Elige a un trabajador para continuar.')

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-ha-border bg-ha-surface p-5">
        <h2 tabIndex={-1} className="text-lg font-semibold">
          Elige al trabajador
        </h2>
        <p className="mt-1 text-ha-text-muted">Busca por nombre o por documento. Si no está en la lista, regístralo.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Buscar por nombre o documento">
              {(control) => (
                <div className="relative">
                  <Input
                    {...control}
                    type="search"
                    value={query}
                    autoComplete="off"
                    className="pr-12"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query !== '' && (
                    <Button
                      iconOnly
                      variant="ghost"
                      aria-label="Limpiar búsqueda"
                      className="absolute top-0 right-0"
                      onClick={() => setQuery('')}
                    >
                      <X aria-hidden="true" className="size-5" />
                    </Button>
                  )}
                </div>
              )}
            </Field>
          </div>
          {registerAction}
        </div>
        <div className="mt-4">
          <DataTable
            caption="Lista de trabajadores"
            columns={columns}
            rows={rows}
            getRowKey={(worker) => worker.id}
            isSelected={(worker) => worker.id === selectedId}
            empty={
              <EmptyState
                variant="no-results"
                title="No encontramos trabajadores"
                action={
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Limpiar búsqueda
                  </Button>
                }
              >
                {`Ninguno coincide con “${query.trim()}”. Revisa el nombre o el documento, o registra al trabajador.`}
              </EmptyState>
            }
          />
        </div>
        <p aria-live="polite" className="mt-2 text-sm text-ha-text-muted">
          {`Mostrando ${rows.length} de ${workers.length} trabajadores`}
        </p>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {help && (
          <p id={HELP_ID} className="mr-auto text-sm text-ha-text-muted">
            {help}
          </p>
        )}
        <Button
          disabled={selectedId === null || blockedReason !== null}
          aria-describedby={help ? HELP_ID : undefined}
          onClick={onContinue}
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
