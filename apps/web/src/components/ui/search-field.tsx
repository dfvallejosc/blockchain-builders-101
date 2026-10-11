import { useId, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldControlClass } from '@/components/ui/field-control'
import { cn } from '@/lib/utils'

interface SearchFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchField = ({ label, value, onChange, placeholder, className }: SearchFieldProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ha-text-muted" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(fieldControlClass, 'pr-12 pl-10 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value !== '' && (
        <Button iconOnly variant="ghost" aria-label="Borrar búsqueda" onClick={clear} className="absolute top-0 right-0">
          <X aria-hidden="true" className="size-5" />
        </Button>
      )}
    </div>
  )
}
