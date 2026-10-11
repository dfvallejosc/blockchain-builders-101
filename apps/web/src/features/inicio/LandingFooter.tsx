import { Logo } from '@/components/Logo'

export const LandingFooter = () => (
  <footer className="border-t border-ha-border bg-ha-surface">
    <div className="mx-auto flex max-w-295 flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-8 text-sm text-ha-text-muted md:px-6">
      <span className="flex items-center gap-3 text-base font-bold text-ha-text">
        <Logo className="size-6" />
        HabilitApp
      </span>
      <span>Certificados verificables de seguridad laboral.</span>
    </div>
  </footer>
)
