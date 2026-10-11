import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  id?: string
  heading: string
  intro?: string
  children: ReactNode
}

export const SECTION_WIDTH = 'mx-auto w-full max-w-295 px-4 py-12 md:px-6 md:py-16'

export const Section = ({ id, heading, intro, children }: SectionProps) => (
  <section id={id} className={cn(SECTION_WIDTH, 'scroll-mt-20')}>
    <div className="mb-8 grid max-w-[62ch] gap-2">
      <h2 className="text-3xl leading-tight font-bold">{heading}</h2>
      {intro && <p className="text-lg leading-snug text-ha-text-muted">{intro}</p>}
    </div>
    {children}
  </section>
)

export const Band = ({ children }: { children: ReactNode }) => (
  <div className="border-y border-ha-border bg-ha-surface">{children}</div>
)

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('h-full rounded-lg border border-ha-border bg-ha-surface p-6', className)}>{children}</div>
)

export const IconTile = ({ children }: { children: ReactNode }) => (
  <span className="grid size-11 place-items-center rounded-md bg-ha-primary-soft text-ha-primary">{children}</span>
)
