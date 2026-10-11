import { z } from 'zod'
import { formatLongDate } from '@/features/verificar/format'

export const buildIssueSchema = (todayIso: string) =>
  z
    .object({
      type: z.string().min(1, 'Elige el tipo de certificado.'),
      issuedAt: z
        .string()
        .min(1, 'Escribe la fecha de emisión.')
        .refine(
          (value) => value === '' || value <= todayIso,
          `La fecha de emisión no puede ser posterior a hoy (${formatLongDate(todayIso)}).`,
        ),
      validUntil: z.string().min(1, 'Escribe la fecha hasta la que estará vigente.'),
    })
    .superRefine((values, context) => {
      if (values.issuedAt === '' || values.validUntil === '' || values.validUntil > values.issuedAt) return
      context.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'La fecha de vigencia debe ser posterior a la fecha de emisión.',
      })
    })

export type IssueFormValues = z.infer<ReturnType<typeof buildIssueSchema>>
