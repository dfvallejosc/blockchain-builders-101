import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterChip } from '@/components/ui/filter-chip'
import { SearchField } from '@/components/ui/search-field'
import { StatusChip } from '@/components/ui/status-chip'
import {
  filterEntityRows,
  toEntityRows,
  type EntityRow,
  type EntityStatus,
} from '@/features/admin/emisores/entityRows'
import { useEntities } from '@/features/admin/emisores/useEntities'
import { formatLongDate } from '@/features/verificar/format'

const REGISTER_PATH = '/admin/emisores/nuevo'

const STATUS_OPTIONS: { value: EntityStatus; label: string }[] = [
  { value: 'valid', label: 'Habilitado' },
  { value: 'revoked', label: 'Revocado' },
]

const COLUMNS: Column<EntityRow>[] = [
  {
    key: 'name',
    header: 'Entidad',
    cell: (row) => (
      <Link to={`/admin/emisores/${row.id}`} className="font-semibold text-ha-primary underline">
        {row.name}
      </Link>
    ),
    sortValue: (row) => row.name,
  },
  { key: 'type', header: 'Tipo', cell: (row) => row.typeLabel },
  { key: 'city', header: 'Ciudad', cell: (row) => row.city },
  {
    key: 'status',
    header: 'Estado',
    cell: (row) => <StatusChip status={row.status} />,
    sortValue: (row) => row.status,
  },
  {
    key: 'registeredAt',
    header: 'Registro',
    className: 'whitespace-nowrap',
    cell: (row) => formatLongDate(row.registeredAt),
    sortValue: (row) => row.registeredAt,
  },
  {
    key: 'issuedThisMonth',
    header: 'Certificados este mes',
    className: 'text-right',
    cell: (row) => row.issuedThisMonth,
    sortValue: (row) => row.issuedThisMonth,
  },
]

const RegisterLink = () => (
  <Link to={REGISTER_PATH} className={buttonVariants()}>
    <Plus aria-hidden="true" className="size-5" />
    Registrar emisor
  </Link>
)

const noResultsMessage = (query: string, hasStatuses: boolean): string => {
  const text = query.trim()
  if (text !== '' && hasStatuses) return `Ningún emisor coincide con “${text}” y los filtros activos.`
  if (text !== '') return `Ningún emisor coincide con “${text}”.`
  return 'Ningún emisor coincide con los filtros activos.'
}

export const EntitiesPage = () => {
  const { load, retry } = useEntities()
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<EntityStatus[]>([])

  const ready = load.phase === 'ready'
  const allRows = useMemo(() => (ready ? toEntityRows(load.entities) : []), [load, ready])
  const rows = useMemo(() => filterEntityRows(allRows, { query, statuses }), [allRows, query, statuses])
  const hasEntities = ready && allRows.length > 0
  const filtersActive = query.trim() !== '' || statuses.length > 0

  const toggleStatus = (value: EntityStatus, pressed: boolean) =>
    setStatuses((current) => (pressed ? [...current, value] : current.filter((status) => status !== value)))

  const clearFilters = () => {
    setQuery('')
    setStatuses([])
  }

  const emptyState = !hasEntities ? (
    <EmptyState variant="empty" title="Aún no hay emisores registrados" action={<RegisterLink />}>
      Registra la primera entidad para que pueda emitir certificados.
    </EmptyState>
  ) : (
    <EmptyState
      variant="no-results"
      title="No encontramos emisores"
      action={
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      }
    >
      {noResultsMessage(query, statuses.length > 0)}
    </EmptyState>
  )

  return (
    <section className="mx-auto grid w-full max-w-7xl content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Emisores</h1>
          <p className="mt-1 max-w-[62ch] text-ha-text-muted">
            Entidades autorizadas para emitir certificados. Solo las que se registran aquí pueden hacerlo.
          </p>
        </div>
        {hasEntities && <RegisterLink />}
      </div>

      {hasEntities && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SearchField
            label="Buscar emisor por nombre"
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre de la entidad"
            className="w-full max-w-lg"
          />
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Estado</span>
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                pressed={statuses.includes(option.value)}
                onPressedChange={(pressed) => toggleStatus(option.value, pressed)}
              >
                {option.label}
              </FilterChip>
            ))}
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      <DataTable
        caption="Tabla de emisores"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={load.phase === 'loading'}
        error={load.phase === 'error' ? { message: 'No pudimos cargar los emisores', onRetry: retry } : undefined}
        empty={emptyState}
      />

      {hasEntities && (
        <p aria-live="polite" className="text-sm text-ha-text-muted">
          Mostrando {rows.length} de {allRows.length} {allRows.length === 1 ? 'emisor' : 'emisores'}
        </p>
      )}
    </section>
  )
}
