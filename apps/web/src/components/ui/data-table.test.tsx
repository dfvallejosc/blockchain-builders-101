import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from '@/components/ui/data-table'

interface Row {
  id: string
  name: string
  count: number
}

const ROWS: Row[] = [
  { id: 'a', name: 'Ángel', count: 10 },
  { id: 'b', name: 'Zoila', count: 2 },
  { id: 'c', name: 'Beatriz', count: 33 },
]

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Nombre', cell: (row) => row.name, sortValue: (row) => row.name },
  { key: 'count', header: 'Certificados', cell: (row) => row.count, sortValue: (row) => row.count },
  { key: 'actions', header: 'Acciones', cell: () => <button type="button">Ver</button> },
]

const names = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row').map((row) => within(row).getAllByRole('cell')[0].textContent)

const renderTable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  render(<DataTable caption="Trabajadores" columns={COLUMNS} rows={ROWS} getRowKey={(row) => row.id} {...props} />)

describe('DataTable', () => {
  it('renders a table named by its caption with one row per item', () => {
    renderTable()

    expect(screen.getByRole('table', { name: 'Trabajadores' })).toBeInTheDocument()
    expect(names()).toEqual(['Ángel', 'Zoila', 'Beatriz'])
  })

  it('sits in a scrollable, focusable, named region so the page does not scroll sideways', () => {
    renderTable()

    const region = screen.getByRole('region', { name: 'Trabajadores' })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('has no aria-sort until a header is used, and only sortable columns have a sort button', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: /Nombre/ })).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('button', { name: /Nombre/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acciones/ })).not.toBeInTheDocument()
  })

  it('makes the sort button a 44 px touch target on coarse pointers', () => {
    renderTable()

    expect(screen.getByRole('button', { name: /Nombre/ }).className).toContain('pointer-coarse:min-h-(--touch-min)')
  })

  it('sorts ascending then descending when the header is pressed, with aria-sort', () => {
    renderTable()
    const header = () => screen.getByRole('columnheader', { name: /Nombre/ })

    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(header()).toHaveAttribute('aria-sort', 'ascending')
    expect(names()).toEqual(['Ángel', 'Beatriz', 'Zoila'])

    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(header()).toHaveAttribute('aria-sort', 'descending')
    expect(names()).toEqual(['Zoila', 'Beatriz', 'Ángel'])
  })

  it('sorts numbers numerically, not as text', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /Certificados/ }))

    expect(names()).toEqual(['Zoila', 'Ángel', 'Beatriz'])
  })

  it('does not mutate the rows it receives', () => {
    const rows = [...ROWS]
    renderTable({ rows })

    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }))

    expect(rows.map((row) => row.name)).toEqual(['Ángel', 'Zoila', 'Beatriz'])
  })

  it('moves aria-sort to the newest sorted column', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    fireEvent.click(screen.getByRole('button', { name: /Certificados/ }))

    expect(screen.getByRole('columnheader', { name: /Nombre/ })).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('columnheader', { name: /Certificados/ })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('highlights selected rows', () => {
    renderTable({ isSelected: (row) => row.id === 'b' })

    const rows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-selected')
  })

  it('shows skeleton rows and marks the table busy while loading', () => {
    renderTable({ loading: true })

    expect(screen.getByRole('table', { name: 'Trabajadores' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Ángel')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no rows', () => {
    renderTable({ rows: [], empty: <p>Aún no hay trabajadores</p> })

    expect(screen.getByText('Aún no hay trabajadores')).toBeInTheDocument()
  })

  it('shows a default empty state when none is given', () => {
    renderTable({ rows: [] })

    expect(screen.getByRole('heading', { name: 'Aún no hay datos' })).toBeInTheDocument()
  })

  it('shows the error with a retry button', () => {
    const onRetry = vi.fn()
    renderTable({ error: { message: 'No pudimos cargar la lista', onRetry } })

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(screen.getByText('No pudimos cargar la lista')).toBeInTheDocument()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows only skeleton rows when loading and an error are both set', () => {
    renderTable({ loading: true, error: { message: 'No pudimos cargar la lista', onRetry: vi.fn() } })

    expect(screen.queryByText('No pudimos cargar la lista')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')).toHaveLength(5)
  })

  it('hides the data rows when there is an error', () => {
    renderTable({ error: { message: 'No pudimos cargar la lista' } })

    expect(screen.queryByText('Ángel')).not.toBeInTheDocument()
    expect(within(screen.getAllByRole('rowgroup')[1]).queryAllByRole('row')).toHaveLength(0)
  })

  it('does not show the empty state while loading empty rows', () => {
    renderTable({ rows: [], loading: true })

    expect(screen.queryByRole('heading', { name: 'Aún no hay datos' })).not.toBeInTheDocument()
  })

  it('shows exactly five skeleton rows while loading', () => {
    renderTable({ loading: true })

    expect(within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')).toHaveLength(5)
  })

  it('gives the selected row a non-color cue besides aria-selected', () => {
    renderTable({ isSelected: (row) => row.id === 'b' })

    const row = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')[1]
    expect(row).toHaveAttribute('aria-selected', 'true')
    expect(row.className).toContain('aria-selected:font-semibold')
  })
})
