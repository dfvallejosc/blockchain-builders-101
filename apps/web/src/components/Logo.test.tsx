import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from '@/components/Logo'

describe('Logo', () => {
  it('is decorative, because the brand name is always written next to it', () => {
    const { container } = render(<Logo />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
  })

  it('takes its colors from the design tokens, with no hex values', () => {
    const { container } = render(<Logo />)

    const markup = container.innerHTML
    expect(markup).toContain('var(--ha-primary)')
    expect(markup).toContain('var(--ha-brand-yellow)')
    expect(markup).toContain('var(--ha-on-primary)')
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('accepts a class to set its size', () => {
    const { container } = render(<Logo className="size-8" />)

    expect(container.querySelector('svg')).toHaveClass('size-8')
  })
})
