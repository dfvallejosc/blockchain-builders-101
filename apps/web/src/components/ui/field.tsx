import { useId, type ComponentProps, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { fieldControlClass } from '@/components/ui/field-control'
import { cn } from '@/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

interface FieldProps {
  label: string
  help?: string
  error?: string
  required?: boolean
  children: (control: FieldControlProps) => ReactNode
}

export const Input = ({ className, ...props }: ComponentProps<'input'>) => (
  <input className={cn(fieldControlClass, className)} {...props} />
)

export const Field = ({ label, help, error, required, children }: FieldProps) => {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
        {required && ' '}
        {required && <span className="ml-1 text-sm font-normal text-ha-text-muted">(obligatorio)</span>}
      </label>
      {help && (
        <p id={helpId} className="text-sm text-ha-text-muted">
          {help}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-2 text-sm font-medium text-ha-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
