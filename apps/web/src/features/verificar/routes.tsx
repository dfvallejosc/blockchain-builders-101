import type { RouteObject } from 'react-router'
import { VerifyPage } from '@/features/verificar/VerifyPage'
import { PublicLayout } from '@/layouts/PublicLayout'

export const verifyRoutes: RouteObject[] = [
  {
    path: '/c/:id',
    element: <PublicLayout />,
    children: [{ index: true, element: <VerifyPage /> }],
  },
]
