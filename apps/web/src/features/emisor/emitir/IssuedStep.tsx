import { Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Certificate, Worker } from '@/data'
import { cn } from '@/lib/utils'

interface IssuedStepProps {
  certificate: Certificate
  worker: Worker
  onIssueAnother: () => void
}

export const IssuedStep = ({ certificate, worker, onIssueAnother }: IssuedStepProps) => (
  <div className="grid gap-5">
    <Alert tone="success" title="Certificado emitido">
      {`El certificado ${certificate.id} de ${worker.fullName} quedó registrado y ya se puede comprobar con su código QR.`}
    </Alert>
    <section className="grid w-full max-w-80 justify-items-center gap-4 rounded-lg border border-ha-border bg-ha-surface p-5 text-center">
      <h2 tabIndex={-1} className="text-lg font-semibold">
        Código QR
      </h2>
      <div role="img" aria-label={`Código QR del certificado ${certificate.id}`}>
        <QRCodeSVG
          value={`${window.location.origin}/c/${certificate.id}`}
          size={240}
          marginSize={4}
          className="h-auto w-full max-w-60 rounded-md border border-ha-border"
        />
      </div>
      <div>
        <p className="font-mono text-lg font-medium tracking-wide">{certificate.id}</p>
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
  </div>
)
