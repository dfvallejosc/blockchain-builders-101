import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe el usuario, que es el correo de tu entidad.')
    .refine((value) => value === '' || z.email().safeParse(value).success, 'Escribe un correo válido.'),
  password: z.string().refine((value) => value.trim() !== '', 'Escribe tu contraseña.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
