import type { ReactNode } from 'react'
import { StatusChip } from '@/components/ui/status-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { certificateTypeLabel, formatDocument, formatLongDate, toIsoDate } from '@/features/verificar/format'
import type { VerificationState } from '@/features/verificar/useVerification'

interface CardProps {
  title: string
  children: ReactNode
}

const Card = ({ title, children }: CardProps) => (
  <section className="rounded-lg border border-ha-border bg-ha-surface p-4">
    <h2 className="text-sm font-semibold text-ha-text-muted">{title}</h2>
    {children}
  </section>
)

const Entity = ({ name, status }: { name: string; status: 'valid' | 'revoked' }) => (
  <Card title="Entidad emisora">
    <p className="mt-1 grid justify-items-start gap-2 text-base">
      <b>{name}</b>
      <StatusChip status={status} size="sm" />
    </p>
  </Card>
)

const SkeletonCards = () => (
  <>
    {[0, 1, 2].map((index) => (
      <section key={index} className="rounded-lg border border-ha-border bg-ha-surface p-4">
        <Skeleton className="w-1/3" />
        <Skeleton className="mt-3 h-5.5 w-3/4" />
        <Skeleton className="mt-2 w-1/2" />
      </section>
    ))}
  </>
)

interface CertificateDetailsProps {
  state: VerificationState
  queriedAt: Date
}

export const CertificateDetails = ({ state, queriedAt }: CertificateDetailsProps) => {
  if (state.phase === 'error') return null
  if (state.phase === 'loading') {
    return (
      <div className="grid gap-3 px-4 pt-3">
        <SkeletonCards />
      </div>
    )
  }

  const { result } = state
  if (result.status === 'invalid' && result.reason === 'unknown-certificate') return null

  const consultedAt = `${formatLongDate(toIsoDate(queriedAt))}, ${queriedAt.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`

  if (result.status === 'invalid') {
    return (
      <div className="grid gap-3 px-4 pt-3">
        <Entity name={result.entity.name} status="revoked" />
        <p className="text-center text-sm text-ha-text-muted">Consulta: {consultedAt}</p>
      </div>
    )
  }

  const { certificate, worker, entity } = result
  return (
    <div className="grid gap-3 px-4 pt-3">
      <Card title="Trabajador">
        <p className="mt-1 text-xl leading-snug font-bold [overflow-wrap:anywhere]">{worker.fullName}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{formatDocument(worker.documentType, worker.documentNumber)}</p>
        <p className="mt-2 text-sm text-ha-text-muted">Compara el nombre y el documento con la cédula del trabajador.</p>
      </Card>
      <Card title="Certificado">
        <p className="mt-1 text-xl leading-snug font-bold">{certificateTypeLabel(certificate.type)}</p>
        <p className="mt-1 font-mono text-lg tabular-nums">{certificate.id}</p>
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ha-border pt-3">
          <div>
            <span className="block text-sm font-semibold text-ha-text-muted">Emitido</span>
            <b className="block text-lg font-semibold">{formatLongDate(certificate.issuedAt)}</b>
          </div>
          <div>
            <span className="block text-sm font-semibold text-ha-text-muted">
              {result.status === 'expired' ? 'Venció' : 'Vigente hasta'}
            </span>
            <b className="block text-lg font-semibold">{formatLongDate(certificate.validUntil)}</b>
          </div>
        </div>
      </Card>
      <Entity name={entity.name} status="valid" />
      <p className="text-center text-sm text-ha-text-muted">Consulta: {consultedAt}</p>
    </div>
  )
}
