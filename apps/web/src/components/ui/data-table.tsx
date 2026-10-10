import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface Column<Row> {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  sortValue?: (row: Row) => string | number
  className?: string
}

interface DataTableProps<Row> {
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  /** Pair the selection with a checkbox column so it is not conveyed by color or weight alone. */
  isSelected?: (row: Row) => boolean
  loading?: boolean
  error?: { message: string; onRetry?: () => void }
  empty?: ReactNode
}

type Direction = 'ascending' | 'descending'

interface SortState {
  key: string
  direction: Direction
}

const SKELETON_ROWS = 5

const compare = (a: string | number, b: string | number): number =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es')

export const DataTable = <Row,>({
  caption,
  columns,
  rows,
  getRowKey,
  isSelected,
  loading = false,
  error,
  empty,
}: DataTableProps<Row>) => {
  const [sort, setSort] = useState<SortState | null>(null)

  const sortedRows = useMemo(() => {
    const column = columns.find((candidate) => candidate.key === sort?.key)
    if (!sort || !column?.sortValue) return rows
    const sortValue = column.sortValue
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => factor * compare(sortValue(a), sortValue(b)))
  }, [columns, rows, sort])

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key && current.direction === 'ascending'
        ? { key, direction: 'descending' }
        : { key, direction: 'ascending' },
    )
  }

  const message = loading ? null : error ? (
    <EmptyState
      variant="error"
      title={error.message}
      action={
        error.onRetry && (
          <Button variant="secondary" onClick={error.onRetry}>
            Reintentar
          </Button>
        )
      }
    />
  ) : rows.length === 0 ? (
    (empty ?? <EmptyState variant="empty" title="Aún no hay datos" />)
  ) : null

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-ha-border bg-ha-surface"
    >
      <table aria-busy={loading || undefined} className="w-full border-collapse text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortedHere = sort?.key === column.key ? sort.direction : undefined
              const SortIcon = sortedHere === 'ascending' ? ArrowUp : sortedHere === 'descending' ? ArrowDown : ChevronsUpDown
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sortedHere}
                  className={cn('h-10 border-b border-ha-border bg-ha-surface-2 px-3 text-left font-semibold whitespace-nowrap pointer-coarse:h-12', column.className)}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="-mx-2 inline-flex min-h-8 pointer-coarse:min-h-(--touch-min) cursor-pointer items-center gap-1 rounded-sm px-2 hover:bg-ha-border"
                    >
                      {column.header}
                      <SortIcon aria-hidden="true" className={cn('size-4', sortedHere ? 'text-ha-primary' : 'text-ha-text-muted')} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key} className="h-10 border-b border-ha-border px-3 pointer-coarse:h-12">
                    <Skeleton />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            !error &&
            sortedRows.map((row) => {
              const selected = isSelected?.(row) ?? false
              return (
                <tr
                  key={getRowKey(row)}
                  aria-selected={selected || undefined}
                  className={cn('hover:bg-ha-hover aria-selected:bg-ha-primary-soft aria-selected:font-semibold aria-selected:hover:bg-ha-primary-soft-active')}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn('h-10 border-b border-ha-border px-3 py-2 align-middle pointer-coarse:h-12', column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
      {message}
    </div>
  )
}
