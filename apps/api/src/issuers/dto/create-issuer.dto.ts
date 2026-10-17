import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CertificateType, type CertificateTypeValue } from '../../certificates/certificate-type.js';
import { IssuerType, type IssuerTypeValue } from '../issuer-type.js';

export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 120;
export const MAX_CITY_LENGTH = 80;
export const MAX_MINISTRY_REGISTRATION_LENGTH = 60;
export const MAX_EMAIL_LENGTH = 254;

const NIT_DIGITS = 10;
const PHONE_DIGITS = 10;

const digitsOf = (value: string): string => value.replace(/\D/g, '');
const collapseSpaces = (value: string): string => value.trim().replace(/\s+/g, ' ');

const mapString =
  (convert: (value: string) => string) =>
  ({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? convert(value) : value;

// Same shapes the front sends (formatNit and formatPhone), so the unique NIT index always compares one format.
const formatNit = (value: string): string => {
  const digits = digitsOf(value);
  return /^[\d.\s-]+$/.test(value) && digits.length === NIT_DIGITS
    ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    : value;
};

const formatPhone = (value: string): string => {
  const digits = digitsOf(value);
  return /^[\d\s-]+$/.test(value) && digits.length === PHONE_DIGITS
    ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : value;
};

export class CreateIssuerDto {
  @Transform(mapString(collapseSpaces))
  @IsString({ message: 'Escribe el nombre de la entidad.' })
  @MinLength(MIN_NAME_LENGTH, { message: 'Escribe el nombre de la entidad.' })
  @MaxLength(MAX_NAME_LENGTH, { message: 'El nombre no puede superar 120 caracteres.' })
  name!: string;

  @IsIn(Object.values(IssuerType), { message: 'Elige el tipo de entidad.' })
  type!: IssuerTypeValue;

  @Transform(mapString(collapseSpaces))
  @IsString({ message: 'Elige la ciudad de la entidad.' })
  @MinLength(1, { message: 'Elige la ciudad de la entidad.' })
  @MaxLength(MAX_CITY_LENGTH, { message: 'La ciudad no puede superar 80 caracteres.' })
  city!: string;

  @IsArray({ message: 'Elige al menos un tipo de certificado.' })
  @ArrayMinSize(1, { message: 'Elige al menos un tipo de certificado.' })
  @ArrayUnique({ message: 'No repitas tipos de certificado.' })
  @IsIn(Object.values(CertificateType), { each: true, message: 'Elige tipos de certificado válidos.' })
  certificateTypes!: CertificateTypeValue[];

  @Transform(mapString((value) => formatNit(value.trim())))
  @IsString({ message: 'Escribe el NIT de la entidad.' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d$/, {
    message: 'Revisa el NIT. Debe tener 9 dígitos y el dígito de verificación, por ejemplo 901.482.317-5.',
  })
  nit!: string;

  @Transform(mapString(collapseSpaces))
  @IsString({ message: 'Escribe el registro ante el ministerio.' })
  @MaxLength(MAX_MINISTRY_REGISTRATION_LENGTH, { message: 'El registro no puede superar 60 caracteres.' })
  ministryRegistration!: string;

  @Transform(mapString(collapseSpaces))
  @IsString({ message: 'Escribe el nombre de la persona de contacto.' })
  @MinLength(MIN_NAME_LENGTH, { message: 'Escribe el nombre de la persona de contacto.' })
  @MaxLength(MAX_NAME_LENGTH, { message: 'El nombre no puede superar 120 caracteres.' })
  contactName!: string;

  @Transform(mapString((value) => value.trim().toLowerCase()))
  @IsString({ message: 'Escribe el correo de la persona de contacto.' })
  @MaxLength(MAX_EMAIL_LENGTH, { message: 'El correo no puede superar 254 caracteres.' })
  @IsEmail({}, { message: 'Escribe un correo válido, por ejemplo nombre@entidad.co.' })
  email!: string;

  @Transform(mapString((value) => formatPhone(value.trim())))
  @IsString({ message: 'Escribe 10 dígitos, por ejemplo 310 555 0142.' })
  @Matches(/^\d{3} \d{3} \d{4}$/, { message: 'Escribe 10 dígitos, por ejemplo 310 555 0142.' })
  phone!: string;
}
