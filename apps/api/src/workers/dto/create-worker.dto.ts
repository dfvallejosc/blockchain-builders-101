import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsIn, IsString, Length, Matches, MaxLength } from 'class-validator';
import { DocumentType, type DocumentTypeValue } from '../document-type.js';

export const MAX_FULL_NAME_LENGTH = 120;
export const MIN_DOCUMENT_LENGTH = 5;
export const MAX_DOCUMENT_LENGTH = 20;

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

const normalizeDocumentNumber = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateWorkerDto {
  @Transform(trimString)
  @IsString({ message: 'Escribe el nombre completo.' })
  @MaxLength(MAX_FULL_NAME_LENGTH, { message: 'El nombre no puede superar 120 caracteres.' })
  @Matches(/^\S+(\s+\S+)+$/, { message: 'Escribe el nombre y al menos un apellido.' })
  fullName!: string;

  @IsIn(Object.values(DocumentType), { message: 'Elige un tipo de documento válido.' })
  documentType!: DocumentTypeValue;

  @Transform(normalizeDocumentNumber)
  @IsString({ message: 'Escribe un número de documento válido.' })
  @Length(MIN_DOCUMENT_LENGTH, MAX_DOCUMENT_LENGTH, {
    message: 'El número de documento debe tener entre 5 y 20 caracteres.',
  })
  @Matches(/^[^\s.]+$/, { message: 'Escribe el número de documento sin puntos ni espacios.' })
  documentNumber!: string;

  @IsBoolean({ message: 'Confirma la autorización para tratar los datos.' })
  @Equals(true, { message: 'Confirma la autorización para tratar los datos.' })
  dataConsent!: boolean;
}
