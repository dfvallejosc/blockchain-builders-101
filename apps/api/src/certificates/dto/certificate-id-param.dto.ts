import { IsUUID } from 'class-validator';

export class CertificateIdParamDto {
  @IsUUID(undefined, { message: 'Escribe un identificador de certificado válido.' })
  id!: string;
}
