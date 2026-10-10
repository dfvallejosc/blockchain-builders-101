import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { fieldControlClass } from '@/components/ui/field-control'
import type { FieldControlProps } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps extends Partial<FieldControlProps> {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  summary: (count: number) => string
}

export const MultiSelect = ({ options, value, onChange, placeholder, summary, ...control }: MultiSelectProps) => {
  const [open, setOpen] = useState(false)
  const summaryId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const toggle = (optionValue: string) => {
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue])
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className={cn(fieldControlClass, 'flex cursor-pointer items-center justify-between gap-2 text-left', open && 'border-ha-focus')}
        {...control}
        aria-describedby={[control['aria-describedby'], summaryId].filter(Boolean).join(' ')}
      >
        <span id={summaryId} className={cn(value.length === 0 && 'text-ha-text-muted')}>
          {value.length === 0 ? placeholder : summary(value.length)}
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ha-text-muted" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-(--z-menu) min-w-60 rounded-lg border border-ha-border bg-ha-surface p-2 shadow-(--shadow-overlay)">
          {options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="flex w-full"
            />
          ))}
        </div>
      )}
    </div>
  )
}
