import { useId, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchField } from '@/components/ui/search-field'
import type { IssuerSession, Session } from '@/data'
import { useWorkers } from '@/features/emisor/trabajadores/useWorkers'
import {
  filterWorkerRows,
  toWorkerRows,
  type WorkerRow,
} from '@/features/emisor/trabajadores/workerRows'
import { formatLongDate } from '@/features/verificar/format'

const REGISTER_PATH = '/emisor/trabajadores/nuevo'
const ISSUE_PATH = '/emisor/emitir'
const BLOCKED_REASON = 'No disponible: tu entidad está revocada.'

const RegisterAction = ({ blocked, variant = 'primary' }: { blocked: boolean; variant?: 'primary' | 'secondary' }) => {
  const reasonId = useId()

  if (!blocked) {
    return (
      <Link to={REGISTER_PATH} className={buttonVariants({ variant })}>
        <Plus aria-hidden="true" className="size-5" />
        Registrar trabajador
      </Link>
    )
  }

  return (
    <div className="grid justify-items-start gap-1 sm:justify-items-end">
      <Button variant={variant} disabled aria-describedby={reasonId}>
        <Plus aria-hidden="true" className="size-5" />
        Registrar trabajador
      </Button>
      <p id={reasonId} className="max-w-[30ch] text-sm text-ha-text-muted sm:text-right">
        {BLOCKED_REASON}
      </p>
    </div>
  )
}

const WorkersView = ({ session }: { session: IssuerSession }) => {
  const { load, retry } = useWorkers(session.entityId)
  const [query, setQuery] = useState('')
  const reasonId = useId()

  const ready = load.phase === 'ready'
  const revokedAt = ready ? load.entity.revokedAt : null
  const blocked = revokedAt !== null
  const allRows = useMemo(() => (ready ? toWorkerRows(load.workers) : []), [load, ready])
  const rows = useMemo(() => filterWorkerRows(allRows, query), [allRows, query])
  const hasWorkers = ready && allRows.length > 0

  const columns: Column<WorkerRow>[] = [
    {
      key: 'worker',
      header: 'Trabajador',
      cell: (row) => (
        <>
          <span className="block break-words">{row.fullName}</span>
          <span className="block text-sm tracking-wide text-ha-text-muted sm:hidden">{row.document}</span>
        </>
      ),
      sortValue: (row) => row.fullName,
    },
    {
      key: 'document',
      header: 'Documento',
      className: 'whitespace-nowrap max-sm:hidden',
      cell: (row) => row.document,
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'text-right',
      cell: (row) =>
        blocked ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            aria-label={`Emitir certificado a ${row.fullName}`}
            aria-describedby={reasonId}
          >
            Emitir certificado
          </Button>
        ) : (
          <Link
            to={`${ISSUE_PATH}?trabajador=${row.id}`}
            aria-label={`Emitir certificado a ${row.fullName}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Emitir certificado
          </Link>
        ),
    },
  ]

  const emptyState = !hasWorkers ? (
    <EmptyState
      variant="empty"
      title="Aún no has registrado trabajadores"
      action={<RegisterAction blocked={blocked} />}
    >
      Cuando registres el primero, aparecerá aquí para emitirle certificados sin volver a escribir sus datos.
    </EmptyState>
  ) : (
    <EmptyState
      variant="no-results"
      title="No encontramos trabajadores"
      action={
        <Button variant="secondary" onClick={() => setQuery('')}>
          Ver todos los trabajadores
        </Button>
      }
    >
      {`Ninguno coincide con “${query.trim()}”.`}
    </EmptyState>
  )

  return (
    <section className="mx-auto grid w-full max-w-7xl content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trabajadores</h1>
          <p className="mt-1 max-w-[62ch] text-ha-text-muted">
            Los trabajadores que ha registrado tu entidad. Busca uno por nombre o documento y emítele un certificado.
          </p>
        </div>
        {hasWorkers && <RegisterAction blocked={blocked} />}
      </div>

      {blocked && (
        <Alert tone="danger" title={`Tu entidad está revocada desde el ${formatLongDate(revokedAt)}`}>
          No puedes emitir certificados nuevos ni registrar trabajadores. Tu lista de trabajadores sigue disponible para
          consultarla.
          <span id={reasonId} className="sr-only">
            {BLOCKED_REASON}
          </span>
        </Alert>
      )}

      {hasWorkers && (
        <SearchField
          label="Buscar trabajadores"
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre o documento"
          className="max-w-lg"
        />
      )}

      <DataTable
        caption="Tabla de trabajadores"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={load.phase === 'loading'}
        error={load.phase === 'error' ? { message: 'No pudimos cargar tus trabajadores', onRetry: retry } : undefined}
        empty={emptyState}
      />

      {hasWorkers && (
        <p aria-live="polite" className="text-sm text-ha-text-muted">
          Mostrando {rows.length} de {allRows.length} {allRows.length === 1 ? 'trabajador' : 'trabajadores'}
        </p>
      )}
    </section>
  )
}

export const WorkersPage = () => {
  const session = useOutletContext<Session>()
  return session.role === 'issuer' ? <WorkersView session={session} /> : null
}
