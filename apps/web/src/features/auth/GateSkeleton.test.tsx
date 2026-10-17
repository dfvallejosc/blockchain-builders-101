import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GateSkeleton } from '@/features/auth/GateSkeleton'

describe('GateSkeleton', () => {
  it('announces that the panel is loading, as a status', () => {
    render(<GateSkeleton />)

    expect(screen.getByRole('status', { name: 'Cargando tu panel' })).toBeInTheDocument()
  })
})
