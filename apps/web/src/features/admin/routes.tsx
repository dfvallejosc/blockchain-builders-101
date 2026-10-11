import { Navigate, type RouteObject } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { PanelLayout } from '@/layouts/PanelLayout'
import { RequireSession } from '@/layouts/RequireSession'

export const adminRoutes: RouteObject[] = [
  { path: '/admin/ingresar', element: <PlaceholderPage title="Ingreso de administración" /> },
  {
    path: '/admin',
    element: <RequireSession role="admin" />,
    children: [
      {
        element: <PanelLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/emisores" replace /> },
          { path: 'emisores', element: <PlaceholderPage title="Emisores" /> },
          { path: 'emisores/nuevo', element: <PlaceholderPage title="Registrar emisor" /> },
          { path: 'emisores/:id', element: <PlaceholderPage title="Detalle del emisor" /> },
        ],
      },
    ],
  },
]
