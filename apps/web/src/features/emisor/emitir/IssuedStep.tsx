import { Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Certificate, Entity, Worker } from '@/data'
import { formatCertificateId } from '@/data/certificate-id'
import { CertificateSheet } from '@/features/emisor/hoja/CertificateSheet'
import { cn } from '@/lib/utils'

interface IssuedStepProps {
  certificate: Certificate
  entity: Entity
  worker: Worker
  onIssueAnother: () => void
}

export const IssuedStep = ({ certificate, entity, worker, onIssueAnother }: IssuedStepProps) => {
  const code = formatCertificateId(certificate.number, certificate.issuedAt)
  const verifyUrl = `${window.location.origin}/c/${certificate.id}`

  return (
    <div className="grid gap-5">
      <Alert tone="success" title="Certificado emitido">
        {`El certificado ${code} de ${worker.fullName} quedó registrado y ya se puede comprobar con su código QR.`}
      </Alert>
      <div className="grid items-start gap-6 min-[1101px]:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="grid w-full max-w-80 justify-items-center gap-4 justify-self-center rounded-lg border border-ha-border bg-ha-surface p-5 text-center min-[1101px]:justify-self-stretch">
          <h2 tabIndex={-1} className="text-lg font-semibold">
            Código QR
          </h2>
          <div role="img" aria-label={`Código QR del certificado ${code}`}>
            <QRCodeSVG
              value={verifyUrl}
              size={240}
              marginSize={4}
              className="h-auto w-full max-w-60 rounded-md border border-ha-border"
            />
          </div>
          <div>
            <p className="font-mono text-lg font-medium tracking-wide">{code}</p>
            <p className="mt-1 text-sm text-ha-text-muted">Comprueba este certificado escaneando el código.</p>
          </div>
          <a
            href={`/emisor/certificados/${certificate.id}/hoja`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
          >
            <Download aria-hidden="true" className="size-5" />
            Descargar o imprimir
          </a>
          <Button variant="secondary" className="w-full" onClick={onIssueAnother}>
            Emitir otro certificado
          </Button>
        </section>
        <section
          aria-labelledby="certificate-preview-heading"
          className="grid gap-3 rounded-lg border border-ha-border bg-ha-surface p-5"
        >
          <h2 id="certificate-preview-heading" className="text-lg font-semibold">
            Vista previa del certificado
          </h2>
          <div className="mx-auto w-full max-w-105">
            <CertificateSheet certificate={certificate} profile={entity} worker={worker} verifyUrl={verifyUrl} />
          </div>
        </section>
      </div>
    </div>
  )
}
