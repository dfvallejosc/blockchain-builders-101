import type { Role } from '@/data/types'

export const LOGIN_PATH: Record<Role, string> = {
  issuer: '/emisor/ingresar',
  admin: '/admin/ingresar',
}
