import { Ban, CircleCheck, CircleX, Clock, LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate } from '@/features/verificar/format'
import type { VerificationState } from '@/features/verificar/useVerification'

interface Verdict {
  word: string
  sub: string
  Icon: LucideIcon
  tone: string
  spin?: boolean
}

const SOLID_TONES = {
  success: 'bg-ha-success text-ha-on-success',
  warning: 'bg-ha-warning text-ha-on-warning',
  danger: 'bg-ha-danger text-ha-on-danger',
  soft: 'border-b border-ha-border bg-ha-neutral-bg text-ha-text',
}

const toVerdict = (state: VerificationState): Verdict => {
  if (state.phase === 'loading') {
    return { word: 'Verificando…', sub: 'Consultando el certificado', Icon: LoaderCircle, tone: SOLID_TONES.soft, spin: true }
  }
  if (state.phase === 'error') {
    return {
      word: 'Sin verificar',
      sub: 'No pudimos consultar el certificado. Revisa tu conexión: esto no significa que sea inválido.',
      Icon: TriangleAlert,
      tone: SOLID_TONES.soft,
    }
  }

  const { result } = state
  if (result.status === 'valid') {
    return { word: 'Habilitado', sub: `Vigente hasta el ${formatLongDate(result.certificate.validUntil)}.`, Icon: CircleCheck, tone: SOLID_TONES.success }
  }
  if (result.status === 'expired') {
    return {
      word: 'Vencido',
      sub: `Venció el ${formatLongDate(result.certificate.validUntil)}. No está habilitado hasta renovarlo.`,
      Icon: Clock,
      tone: SOLID_TONES.warning,
    }
  }
  if (result.status === 'annulled') {
    return { word: 'Anulado', sub: 'La entidad emisora anuló este certificado.', Icon: Ban, tone: SOLID_TONES.danger }
  }
  const sub =
    result.reason === 'entity-revoked'
      ? 'La entidad que lo emitió fue revocada.'
      : 'Este código QR no corresponde a ningún certificado.'
  return { word: 'No válido', sub, Icon: CircleX, tone: SOLID_TONES.danger }
}

interface VerdictBannerProps {
  state: VerificationState
}

export const VerdictBanner = ({ state }: VerdictBannerProps) => {
  const { word, sub, Icon, tone, spin } = toVerdict(state)

  return (
    <section role="status" aria-live="polite" className={cn('grid justify-items-start gap-2 px-5 py-6', tone)}>
      <Icon aria-hidden="true" className={cn('size-16', spin && 'animate-spin motion-reduce:animate-none')} strokeWidth={2.25} />
      <h1 className="text-4xl leading-tight font-bold tracking-tight">{word}</h1>
      <p className="text-lg leading-snug font-medium">{sub}</p>
    </section>
  )
}
