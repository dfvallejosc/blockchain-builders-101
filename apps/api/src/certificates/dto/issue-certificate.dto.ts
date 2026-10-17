import { IsIn, IsISO8601, IsString, IsUUID, Matches } from 'class-validator';
import { CertificateType, type CertificateTypeValue } from '../certificate-type.js';

export class IssueCertificateDto {
  @IsUUID(undefined, { message: 'Escribe un identificador de trabajador válido.' })
  workerId!: string;

  @IsIn(Object.values(CertificateType), { message: 'Elige un tipo de certificado válido.' })
  type!: CertificateTypeValue;

  @IsString({ message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  @IsISO8601({ strict: true }, { message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  issuedAt!: string;

  @IsString({ message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  @IsISO8601({ strict: true }, { message: 'Escribe una fecha válida en formato AAAA-MM-DD.' })
  validUntil!: string;
}
