import { useState } from 'react'
import { Link } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { buttonVariants } from '@/components/ui/button'
import { CertificateDetails } from '@/features/verificar/CertificateDetails'
import { VerdictBanner } from '@/features/verificar/VerdictBanner'
import type { VerificationState } from '@/features/verificar/useVerification'
import { SECTION_WIDTH } from '@/features/inicio/landing-ui'
import { cn } from '@/lib/utils'

// A fixed, made-up result: the landing page never asks the API about a certificate that is not real.
const PREVIEW_STATE: VerificationState = {
  phase: 'done',
  result: {
    status: 'valid',
    certificate: { id: 'HAB-2026-004718', type: 'height-work', issuedAt: '2026-10-02', validUntil: '2027-10-02' },
    worker: { fullName: 'Carlos Andrés Ramírez Pineda', documentType: 'cc', documentNumber: '1020345678' },
    entity: { name: 'Centro de Entrenamiento Cumbre Firme' },
  },
}

const PhonePreview = () => {
  const [queriedAt] = useState(() => new Date())
  const previewState = PREVIEW_STATE

  return (
    <div
      data-testid="hero-preview"
      aria-hidden="true"
      inert
      className="w-full max-w-sm justify-self-center overflow-hidden rounded-[2rem] border-8 border-ha-text bg-ha-bg"
    >
      <div className="flex items-center gap-2 border-b border-ha-border bg-ha-surface px-4 py-3 font-bold text-ha-text">
        <Logo className="size-6" />
        HabilitApp
      </div>
      <VerdictBanner state={previewState} />
      <div className="pb-4">
        <CertificateDetails state={previewState} queriedAt={queriedAt} />
      </div>
    </div>
  )
}

export const HeroSection = () => {
  // A real demo certificate, if the deployment has one. Without it the link is left out.
  const demoCertificateId = import.meta.env.VITE_DEMO_CERTIFICATE_ID?.trim()

  return (
    <section className={cn(SECTION_WIDTH, 'grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-12')}>
      <div>
        <h1 className="max-w-[16ch] text-3xl leading-tight font-bold tracking-tight md:text-4xl">
          Comprueba en segundos si un trabajador está habilitado.
        </h1>
        <p className="mt-5 max-w-[50ch] text-xl leading-snug text-ha-text-muted">
          HabilitApp reúne los certificados de seguridad laboral de consultorios y centros de entrenamiento autorizados. Escanea el
          código QR del certificado y mira el resultado en tu celular, sin instalar nada.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {demoCertificateId && (
            <Link to={`/c/${encodeURIComponent(demoCertificateId)}`} className={buttonVariants({ size: 'lg' })}>
              Ver cómo se verifica un certificado
            </Link>
          )}
          <a href="#entidades" className={buttonVariants({ size: 'lg', variant: 'ghost' })}>
            Soy una entidad emisora
          </a>
        </div>
        <p className="mt-5 flex max-w-[52ch] items-start gap-2 text-sm text-ha-text-muted">
          <ShieldCheck aria-hidden="true" className="mt-px size-5 shrink-0 text-ha-primary" />
          El certificado solo lleva identificación, tipo y fechas. Nunca resultados médicos, restricciones ni diagnósticos.
        </p>
      </div>
      <PhonePreview />
    </section>
  )
}
