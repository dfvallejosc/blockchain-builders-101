import { z } from 'zod'

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'cc', label: 'Cédula de ciudadanía' },
  { value: 'ce', label: 'Cédula de extranjería' },
  { value: 'ppt', label: 'Permiso por protección temporal (PPT)' },
  { value: 'passport', label: 'Pasaporte' },
] as const

const MIN_DOCUMENT_LENGTH = 5

export const workerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre completo.')
    .refine((value) => value === '' || value.split(/\s+/).length >= 2, 'Escribe nombres y apellidos, como aparecen en el documento.'),
  documentType: z
    .string()
    .refine((value) => DOCUMENT_TYPE_OPTIONS.some((option) => option.value === value), 'Elige el tipo de documento.'),
  documentNumber: z
    .string()
    .trim()
    .min(1, 'Escribe el número de documento.')
    .refine((value) => value === '' || !/[\s.]/.test(value), 'Escríbelo sin puntos ni espacios.')
    .refine(
      (value) => value === '' || /[\s.]/.test(value) || value.length >= MIN_DOCUMENT_LENGTH,
      'El número de documento es muy corto.',
    ),
  dataConsent: z
    .boolean()
    .refine(
      (value) => value,
      'Sin la autorización del trabajador no podemos registrarlo. Pídesela antes de continuar.',
    ),
})

export type WorkerFormValues = z.infer<typeof workerSchema>
