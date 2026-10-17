import { useId } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Logo } from '@/components/Logo'
import type { Certificate, Entity, Worker } from '@/data'
import { formatCertificateId } from '@/data/certificate-id'
import { certificateTypeLabel, formatDocument, formatLongDate } from '@/features/verificar/format'
import '@/features/emisor/hoja/sheet.css'

const SEAL_TEXT = 'Registrado en HabilitApp · Verificable con QR ·'
const SEAL_PATH = 'M20 66a46 46 0 1 1 92 0a46 46 0 1 1-92 0'

interface CertificateSheetProps {
  certificate: Certificate
  entity: Entity
  worker: Worker
  verifyUrl: string
}

const Seal = () => {
  const pathId = useId()

  return (
    <div className="sheet__seal" aria-hidden="true">
      <svg viewBox="0 0 132 132" className="sheet__seal-ring">
        <defs>
          <path id={pathId} d={SEAL_PATH} />
        </defs>
        <circle className="ring" cx="66" cy="66" r="63" strokeWidth="2" />
        <circle className="ring" cx="66" cy="66" r="39" strokeWidth="1" />
        <text>
          <textPath href={`#${pathId}`} textLength="282" lengthAdjust="spacing">
            {SEAL_TEXT}
          </textPath>
        </text>
      </svg>
      <Logo className="sheet__seal-logo" />
    </div>
  )
}

export const CertificateSheet = ({ certificate, entity, worker, verifyUrl }: CertificateSheetProps) => {
  const code = formatCertificateId(certificate.number, certificate.issuedAt)

  return (
    <div className="sheet" data-theme="light" role="group" aria-label={`Certificado ${code}`}>
      <div className="sheet__in">
        <div className="sheet__top">
          <div className="sheet__brand">
            <Logo className="sheet__logo" />
            HabilitApp
          </div>
          <div className="sheet__no">
            <span className="sheet__lbl">Número de certificado</span>
            <b>{code}</b>
          </div>
        </div>
        <div className="sheet__ent">
          <span className="sheet__lbl">Entidad emisora</span>
          <b>{entity.name}</b>
          <span className="sheet__sub">{`NIT ${entity.nit} · ${entity.city}`}</span>
        </div>
        <div className="sheet__title">
          <span className="sheet__lbl">Certificado de</span>
          <p>{certificateTypeLabel(certificate.type)}</p>
        </div>
        <div className="sheet__who">
          <span className="sheet__lbl">Titular</span>
          <b>{worker.fullName}</b>
          <span className="sheet__doc">{formatDocument(worker.documentType, worker.documentNumber)}</span>
        </div>
        <div className="sheet__dates">
          <div>
            <span className="sheet__lbl">Fecha de emisión</span>
            <b>{formatLongDate(certificate.issuedAt)}</b>
          </div>
          <div>
            <span className="sheet__lbl">Vigente hasta</span>
            <b>{formatLongDate(certificate.validUntil)}</b>
          </div>
        </div>
        <div className="sheet__grow" />
        <div className="sheet__verify">
          <div role="img" aria-label={`Código QR del certificado ${code}`}>
            <QRCodeSVG value={verifyUrl} size={140} marginSize={4} className="sheet__qr" />
          </div>
          <p>
            Comprueba este certificado escaneando el código.
            <span className="sheet__url">{verifyUrl.replace(/^https?:\/\//, '')}</span>
          </p>
          <Seal />
        </div>
        <p className="sheet__note">
          Este certificado solo identifica al titular y registra el tipo y las fechas. No contiene resultados médicos ni diagnósticos.
        </p>
      </div>
    </div>
  )
}
