import type { IssuerProfile } from '@/api/me'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { CertificateType, Worker } from '@/data'
import type { IssueFailure } from '@/features/emisor/emitir/useIssueFlow'
import { certificateTypeLabel, formatDocument, formatLongDate } from '@/features/verificar/format'

interface ReviewStepProps {
  worker: Worker
  profile: IssuerProfile
  values: { type: CertificateType; issuedAt: string; validUntil: string }
  issuing: boolean
  failure: IssueFailure
  onBack: () => void
  onConfirm: () => void
}

interface RowProps {
  label: string
  value: string
  mono?: boolean
}

const Row = ({ label, value, mono = false }: RowProps) => (
  <div className="grid gap-1">
    <dt className="text-sm text-ha-text-muted">{label}</dt>
    <dd className={mono ? 'font-mono font-semibold' : 'font-semibold'}>{value}</dd>
  </div>
)

export const ReviewStep = ({ worker, profile, values, issuing, failure, onBack, onConfirm }: ReviewStepProps) => (
  <div className="grid gap-5">
    <section className="rounded-lg border border-ha-border bg-ha-surface p-5">
      <h2 tabIndex={-1} className="text-lg font-semibold">
        Revisa antes de emitir
      </h2>
      <p className="mt-1 text-ha-text-muted">
        Confirma que los datos son correctos. El certificado solo lleva identificación, tipo y fechas.
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Row label="Trabajador" value={worker.fullName} />
        <Row label="Documento" value={formatDocument(worker.documentType, worker.documentNumber)} mono />
        <Row label="Tipo de certificado" value={certificateTypeLabel(values.type)} />
        <Row label="Entidad emisora" value={profile.name} />
        <Row label="Fecha de emisión" value={formatLongDate(values.issuedAt)} />
        <Row label="Vigente hasta" value={formatLongDate(values.validUntil)} />
      </dl>
    </section>

    <Alert tone="info" title="Al confirmar, el certificado queda registrado">
      Se genera su código QR y desde ese momento se puede comprobar. Para corregirlo después tendrás que anularlo y
      emitir uno nuevo.
    </Alert>

    {failure === 'duplicate' && (
      <Alert tone="danger" title="Esta persona ya tiene este certificado">
        {`${worker.fullName} ya tiene este certificado habilitado. Podrás emitir otro cuando venza, o si lo anulas.`}
      </Alert>
    )}

    {failure === 'failed' && (
      <Alert tone="danger" title="No pudimos emitir el certificado">
        Revisa los datos e inténtalo de nuevo.
      </Alert>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" disabled={issuing} onClick={onBack}>
        Volver a editar
      </Button>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          loading={issuing}
          loadingText="Emitiendo…"
          onClick={onConfirm}
        >
          Emitir certificado
        </Button>
      </div>
    </div>
  </div>
)
