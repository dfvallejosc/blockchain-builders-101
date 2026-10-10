import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast-context'
import type { AlertTone } from '@/components/ui/alert'

const Trigger = ({ tone }: { tone: AlertTone }) => {
  const { show } = useToast()
  return (
    <button type="button" onClick={() => show({ tone, title: 'Emisor registrado', message: 'Ya puede emitir.' })}>
      Mostrar
    </button>
  )
}

const DoubleTrigger = () => {
  const { show } = useToast()
  const showTwice = () => {
    show({ tone: 'danger', title: 'Primer aviso' })
    show({ tone: 'danger', title: 'Segundo aviso' })
  }
  return (
    <button type="button" onClick={showTwice}>
      Mostrar dos
    </button>
  )
}

const renderToast = (tone: AlertTone) =>
  render(
    <ToastProvider>
      <Trigger tone={tone} />
    </ToastProvider>,
  )

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the title and the message', () => {
    renderToast('success')
    open()

    expect(screen.getByText('Emisor registrado')).toBeInTheDocument()
    expect(screen.getByText('Ya puede emitir.')).toBeInTheDocument()
  })

  it('closes by itself after 6 seconds', () => {
    renderToast('success')
    open()

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(screen.getByText('Emisor registrado')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Emisor registrado')).not.toBeInTheDocument()
  })

  it('never closes an error toast by itself', () => {
    renderToast('danger')
    open()

    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(screen.getByText('Emisor registrado')).toBeInTheDocument()
  })

  it('pauses the timer while the pointer is over the toast and resumes after', () => {
    renderToast('info')
    open()
    const toast = screen.getByText('Emisor registrado').closest('[data-toast]') as HTMLElement

    fireEvent.mouseEnter(toast)
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(screen.getByText('Emisor registrado')).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.queryByText('Emisor registrado')).not.toBeInTheDocument()
  })

  it('pauses the timer while a control inside has focus', () => {
    renderToast('info')
    open()
    const toast = screen.getByText('Emisor registrado').closest('[data-toast]') as HTMLElement

    fireEvent.focus(toast)
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(screen.getByText('Emisor registrado')).toBeInTheDocument()
  })

  it('closes with the close button', () => {
    renderToast('danger')
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByText('Emisor registrado')).not.toBeInTheDocument()
  })

  it('stacks several toasts', () => {
    renderToast('info')
    open()
    open()

    expect(screen.getAllByText('Emisor registrado')).toHaveLength(2)
  })

  it('gives each toast its own id when shown twice in one batch', () => {
    render(
      <ToastProvider>
        <DoubleTrigger />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'Mostrar dos' }).click()
    })
    expect(screen.getByText('Primer aviso')).toBeInTheDocument()
    expect(screen.getByText('Segundo aviso')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar aviso' })[0])

    expect(screen.queryByText('Primer aviso')).not.toBeInTheDocument()
    expect(screen.getByText('Segundo aviso')).toBeInTheDocument()
  })

  it('clears its timers when the provider unmounts', () => {
    const { unmount } = renderToast('success')
    open()

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('throws a clear error when useToast is used outside the provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Trigger tone="info" />)).toThrow('useToast must be used inside ToastProvider')

    error.mockRestore()
  })
})
