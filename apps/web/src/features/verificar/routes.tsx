import type { RouteObject } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { PublicLayout } from '@/layouts/PublicLayout'

export const verifyRoutes: RouteObject[] = [
  {
    path: '/c/:id',
    element: <PublicLayout />,
    children: [{ index: true, element: <PlaceholderPage title="Verificación del certificado" /> }],
  },
]
