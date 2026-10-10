import type { RouteObject } from 'react-router'
import { adminRoutes } from '@/features/admin/routes'
import { issuerRoutes } from '@/features/emisor/routes'
import { verifyRoutes } from '@/features/verificar/routes'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const appRoutes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  ...issuerRoutes,
  ...adminRoutes,
  ...verifyRoutes,
  { path: '*', element: <NotFoundPage /> },
]
