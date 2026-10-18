import { z } from 'zod'

export const acceptInvitationSchema = z
  .object({
    password: z.string().refine((value) => value.trim() !== '', 'Escribe una contraseña.'),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmation'],
  })

export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>
