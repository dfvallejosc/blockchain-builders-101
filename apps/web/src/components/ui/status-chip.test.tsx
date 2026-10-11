import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip, type ChipStatus } from '@/components/ui/status-chip'

const WORDS: Array<[ChipStatus, string]> = [
  ['valid', 'Habilitado'],
  ['expired', 'Vencido'],
  ['invalid', 'No válido'],
  ['annulled', 'Anulado'],
  ['in-review', 'En revisión'],
  ['revoked', 'Revocado'],
]

describe('StatusChip', () => {
  it.each(WORDS)('shows the word for %s', (status, word) => {
    render(<StatusChip status={status} />)

    expect(screen.getByText(word)).toBeInTheDocument()
  })

  it('hides the icon from assistive tech so the word is the only content', () => {
    const { container } = render(<StatusChip status="valid" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses a different color family per tone', () => {
    const { container: ok } = render(<StatusChip status="valid" />)
    const { container: warn } = render(<StatusChip status="expired" />)
    const { container: bad } = render(<StatusChip status="invalid" />)
    const { container: neutral } = render(<StatusChip status="in-review" />)

    expect(ok.firstElementChild).toHaveClass('text-ha-success')
    expect(warn.firstElementChild).toHaveClass('text-ha-warning')
    expect(bad.firstElementChild).toHaveClass('text-ha-danger')
    expect(neutral.firstElementChild).toHaveClass('text-ha-neutral')
  })

  it('supports a small size', () => {
    const { container } = render(<StatusChip status="valid" size="sm" />)

    expect(container.firstElementChild).toHaveClass('h-6')
  })
})
