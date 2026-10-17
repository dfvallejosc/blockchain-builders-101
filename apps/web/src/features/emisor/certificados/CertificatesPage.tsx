import { useId, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterChip } from '@/components/ui/filter-chip'
import { SearchField } from '@/components/ui/search-field'
import { StatusChip } from '@/components/ui/status-chip'
import type { CertificateStatus, IssuerSession, Session } from '@/data'
import {
  filterRows,
  STATUS_LABEL,
  toRows,
  type CertificateRow,
  type NoteTone,
} from '@/features/emisor/certificados/certificateRows'
import { useCertificates } from '@/features/emisor/certificados/useCertificates'
import { formatLongDate, formatShortDate } from '@/features/verificar/format'
import { cn } from '@/lib/utils'

const ISSUE_PATH = '/emisor/emitir'
const STATUS_ORDER: CertificateStatus[] = ['valid', 'expired', 'annulled']

const NOTE_CLASS: Record<NoteTone, string> = {
  neutral: 'text-ha-text-muted',
  warning: 'font-semibold text-ha-warning',
  danger: 'font-semibold text-ha-danger',
}

const COLUMNS: Column<CertificateRow>[] = [
  {
    key: 'worker',
    header: 'Trabajador',
    className: 'min-w-55',
    cell: (row) => (
      <>
        <span className="block break-words">{row.workerName}</span>
        {row.workerDocument !== '' && (
          <span className="block text-sm tracking-wide text-ha-text-muted">{row.workerDocument}</span>
        )}
      </>
    ),
    sortValue: (row) => row.workerName,
  },
  {
    key: 'type',
    header: 'Tipo',
    cell: (row) => (
      <>
        <span className="block">{row.typeLabel}</span>
        <span className="block text-sm tracking-wide text-ha-text-muted">{row.code}</span>
      </>
    ),
  },
  {
    key: 'issuedAt',
    header: 'Emisión',
    className: 'whitespace-nowrap',
    cell: (row) => formatShortDate(row.issuedAt),
    sortValue: (row) => row.issuedAt,
  },
  {
    key: 'validUntil',
    header: 'Vigencia',
    className: 'whitespace-nowrap',
    cell: (row) => (
      <>
        <span className="block">{formatShortDate(row.validUntil)}</span>
        <span className={cn('block text-sm', NOTE_CLASS[row.noteTone])}>{row.validityNote}</span>
      </>
    ),
    sortValue: (row) => row.validUntil,
  },
  {
    key: 'status',
    header: 'Estado',
    cell: (row) => <StatusChip status={row.status} />,
    sortValue: (row) => STATUS_LABEL[row.status],
  },
  {
    key: 'actions',
    header: 'Acciones',
    className: 'text-right',
    cell: (row) => (
      <Button variant="ghost" size="sm" disabled aria-label={`Ver la hoja del certificado ${row.code}`}>
        Ver hoja
      </Button>
    ),
  },
]

const EmitAction = ({ blocked }: { blocked: boolean }) => {
  const reasonId = useId()

  if (!blocked) {
    return (
      <Link to={ISSUE_PATH} className={buttonVariants({ variant: 'primary' })}>
        <Plus aria-hidden="true" className="size-5" />
        Emitir certificado
      </Link>
    )
  }

  return (
    <div className="grid justify-items-start gap-1 sm:justify-items-end">
      <Button disabled aria-describedby={reasonId}>
        <Plus aria-hidden="true" className="size-5" />
        Emitir certificado
      </Button>
      <p id={reasonId} className="max-w-[30ch] text-sm text-ha-text-muted sm:text-right">
        No disponible: tu entidad está revocada.
      </p>
    </div>
  )
}

const CertificatesView = ({ session }: { session: IssuerSession }) => {
  const { load, retry } = useCertificates(session.entityId)
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<ReadonlySet<CertificateStatus>>(new Set())
  const controlsRef = useRef<HTMLDivElement>(null)

  const ready = load.phase === 'ready'
  const revokedAt = ready ? load.entity.revokedAt : null
  const allRows = useMemo(() => (ready ? toRows(load.certificates, load.workers) : []), [load, ready])
  const rows = useMemo(() => filterRows(allRows, query, statuses), [allRows, query, statuses])
  const hasCertificates = ready && allRows.length > 0
  const filtering = query.trim() !== '' || statuses.size > 0

  const toggleStatus = (status: CertificateStatus, pressed: boolean) => {
    setStatuses((current) => {
      const next = new Set(current)
      if (pressed) next.add(status)
      else next.delete(status)
      return next
    })
  }

  const reset = () => {
    setQuery('')
    setStatuses(new Set())
    controlsRef.current?.querySelector<HTMLElement>('input[type="search"]')?.focus()
  }

  const emptyState = !hasCertificates ? (
    <EmptyState variant="empty" title="Aún no has emitido certificados" action={<EmitAction blocked={revokedAt !== null} />}>
      Cuando emitas el primero, aparecerá aquí con su estado y su vigencia.
    </EmptyState>
  ) : (
    <EmptyState
      variant="no-results"
      title="No encontramos certificados"
      action={
        <Button variant="secondary" onClick={reset}>
          Ver todos los certificados
        </Button>
      }
    >
      {query.trim() !== ''
        ? `Ninguno coincide con “${query.trim()}” y los filtros activos.`
        : 'Ninguno coincide con los filtros activos.'}
    </EmptyState>
  )

  return (
    <section className="mx-auto grid w-full max-w-7xl content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Certificados</h1>
          <p className="mt-1 max-w-[62ch] text-ha-text-muted">
            Los certificados que ha emitido tu entidad. Busca uno por trabajador, documento o número.
          </p>
        </div>
        {hasCertificates && <EmitAction blocked={revokedAt !== null} />}
      </div>

      {revokedAt !== null && (
        <Alert tone="danger" title={`Tu entidad está revocada desde el ${formatLongDate(revokedAt)}`}>
          No puedes emitir certificados nuevos. Tu historial de certificados y trabajadores sigue disponible para consultarlo.
        </Alert>
      )}

      {hasCertificates && (
        <div ref={controlsRef} className="grid gap-3">
          <SearchField
            label="Buscar certificados"
            value={query}
            onChange={setQuery}
            placeholder="Buscar por trabajador, documento o número"
            className="max-w-lg"
          />
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Estado</span>
            {STATUS_ORDER.map((status) => (
              <FilterChip
                key={status}
                pressed={statuses.has(status)}
                onPressedChange={(pressed) => toggleStatus(status, pressed)}
              >
                {STATUS_LABEL[status]}
              </FilterChip>
            ))}
            {filtering && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      <DataTable
        caption="Tabla de certificados"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={load.phase === 'loading'}
        error={load.phase === 'error' ? { message: 'No pudimos cargar tus certificados', onRetry: retry } : undefined}
        empty={emptyState}
      />

      {hasCertificates && (
        <p aria-live="polite" className="text-sm text-ha-text-muted">
          Mostrando {rows.length} de {allRows.length} {allRows.length === 1 ? 'certificado' : 'certificados'}
        </p>
      )}
    </section>
  )
}

export const CertificatesPage = () => {
  const session = useOutletContext<Session>()
  return session.role === 'issuer' ? <CertificatesView session={session} /> : null
}
