import { z } from 'zod'
import type { CertificateType, EntityType, NewEntityInput } from '@/data'

export const ENTITY_TYPE_OPTIONS = [
  { value: 'clinic', label: 'Consultorio de salud ocupacional' },
  { value: 'training-center', label: 'Centro de entrenamiento' },
] as const

export const CITY_OPTIONS = [
  'Barranquilla',
  'Bogotá',
  'Bucaramanga',
  'Cali',
  'Cartagena',
  'Cúcuta',
  'Ibagué',
  'Manizales',
  'Medellín',
  'Pereira',
] as const

export const CERTIFICATE_OPTIONS = [
  { value: 'height-work', label: 'Trabajo en alturas' },
  { value: 'confined-spaces', label: 'Espacios confinados' },
  { value: 'crane-operation', label: 'Operación de grúa' },
  { value: 'occupational-medical', label: 'Concepto médico ocupacional' },
] as const

const NIT_MESSAGE = 'Revisa el NIT. Debe tener 9 dígitos y el dígito de verificación, por ejemplo 901.482.317-5.'
const PHONE_MESSAGE = 'Escribe 10 dígitos, por ejemplo 310 555 0142.'
const NIT_DIGITS = 10
const PHONE_DIGITS = 10

const digitsOf = (value: string): string => value.replace(/\D/g, '')
const collapseSpaces = (value: string): string => value.trim().replace(/\s+/g, ' ')

const isValidNit = (value: string): boolean => /^[\d.\s-]+$/.test(value) && digitsOf(value).length === NIT_DIGITS
const isValidPhone = (value: string): boolean => /^[\d\s-]+$/.test(value) && digitsOf(value).length === PHONE_DIGITS

export const formatNit = (value: string): string => {
  const digits = digitsOf(value)
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export const formatPhone = (value: string): string => {
  const digits = digitsOf(value)
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export const registerEntitySchema = z.object({
  name: z.string().trim().min(3, 'Escribe el nombre de la entidad.'),
  type: z.string().refine((value) => ENTITY_TYPE_OPTIONS.some((option) => option.value === value), 'Elige el tipo de entidad.'),
  city: z.string().refine((value) => CITY_OPTIONS.some((city) => city === value), 'Elige la ciudad de la entidad.'),
  certificateTypes: z
    .array(z.string())
    .min(1, 'Elige al menos un tipo de certificado.')
    .refine(
      (values) => values.every((value) => CERTIFICATE_OPTIONS.some((option) => option.value === value)),
      'Elige al menos un tipo de certificado.',
    ),
  nit: z
    .string()
    .trim()
    .min(1, 'Escribe el NIT de la entidad.')
    .refine((value) => value === '' || isValidNit(value), NIT_MESSAGE),
  ministryRegistration: z.string().trim(),
  contactName: z.string().trim().min(3, 'Escribe el nombre de la persona de contacto.'),
  email: z
    .string()
    .trim()
    .min(1, 'Escribe el correo de la persona de contacto.')
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Escribe un correo válido, por ejemplo nombre@entidad.co.',
    ),
  phone: z.string().trim().refine(isValidPhone, PHONE_MESSAGE),
})

export type RegisterEntityValues = z.infer<typeof registerEntitySchema>

export const toNewEntityInput = (values: RegisterEntityValues): NewEntityInput => ({
  name: collapseSpaces(values.name),
  type: values.type as EntityType,
  city: values.city,
  certificateTypes: values.certificateTypes as CertificateType[],
  nit: formatNit(values.nit),
  ministryRegistration: values.ministryRegistration.trim(),
  contactName: collapseSpaces(values.contactName),
  email: values.email.trim(),
  phone: formatPhone(values.phone),
})
