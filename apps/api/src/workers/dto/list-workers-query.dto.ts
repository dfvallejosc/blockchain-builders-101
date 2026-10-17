import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { MAX_DOCUMENT_LENGTH } from './create-worker.dto.js';

const normalizeDocumentPrefix = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ListWorkersQueryDto {
  @IsOptional()
  @Transform(normalizeDocumentPrefix)
  @IsString({ message: 'Escribe un prefijo de documento válido.' })
  @Length(1, MAX_DOCUMENT_LENGTH, { message: 'El prefijo debe tener entre 1 y 20 caracteres.' })
  @Matches(/^[^\s.]+$/, { message: 'Escribe el prefijo sin puntos ni espacios.' })
  documentNumber?: string;
}
