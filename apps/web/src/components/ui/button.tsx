import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-semibold whitespace-nowrap no-underline transition-colors duration-(--duration-fast) ease-(--ease-standard) enabled:cursor-pointer disabled:cursor-not-allowed aria-busy:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-ha-primary text-ha-on-primary enabled:hover:bg-ha-primary-hover enabled:active:bg-ha-primary-active disabled:border-ha-border disabled:bg-ha-surface-2 disabled:text-ha-disabled-fg',
        secondary:
          'border-ha-border-strong bg-ha-surface text-ha-text enabled:hover:bg-ha-surface-2 enabled:active:bg-ha-border disabled:border-ha-border disabled:bg-ha-surface-2 disabled:text-ha-disabled-fg',
        ghost:
          'bg-transparent text-ha-primary enabled:hover:bg-ha-primary-soft enabled:active:bg-ha-primary-soft-active disabled:bg-transparent disabled:text-ha-disabled-fg',
        destructive:
          'bg-ha-danger text-ha-on-danger enabled:hover:bg-ha-danger-hover enabled:active:bg-ha-danger-active disabled:border-ha-border disabled:bg-ha-surface-2 disabled:text-ha-disabled-fg',
      },
      size: {
        sm: 'min-h-(--control-sm) px-3 text-sm pointer-coarse:min-h-(--touch-min)',
        md: 'min-h-(--control-md) px-5 text-base',
        lg: 'min-h-(--control-lg) px-6 text-lg',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'sm', className: 'w-(--control-sm) pointer-coarse:w-(--touch-min)' },
      { iconOnly: true, size: 'md', className: 'w-(--control-md)' },
      { iconOnly: true, size: 'lg', className: 'w-(--control-lg)' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', iconOnly: false },
  },
)

type ButtonBaseProps = Omit<ComponentProps<'button'>, 'children'> &
  Pick<VariantProps<typeof buttonVariants>, 'variant' | 'size'> & {
    children: ReactNode
    loading?: boolean
    loadingText?: string
  }

type IconOnlyProps = { iconOnly: true; 'aria-label': string } | { iconOnly?: false }

export type ButtonProps = ButtonBaseProps & IconOnlyProps

export const Button = ({
  variant,
  size,
  iconOnly = false,
  loading = false,
  loadingText,
  className,
  onClick,
  type = 'button',
  children,
  ...rest
}: ButtonProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={cn(buttonVariants({ variant, size, iconOnly }), className)}
      {...rest}
    >
      <span className="inline-grid place-items-center">
        <span
          aria-hidden={loading || undefined}
          className={cn('col-start-1 row-start-1 inline-flex items-center justify-center gap-2', loading && 'invisible')}
        >
          {children}
        </span>
        {loading && (
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
            {loadingText}
          </span>
        )}
      </span>
    </button>
  )
}
