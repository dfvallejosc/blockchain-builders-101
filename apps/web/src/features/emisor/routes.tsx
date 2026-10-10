import { Navigate, type RouteObject } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { PanelLayout } from '@/layouts/PanelLayout'
import { RequireSession } from '@/layouts/RequireSession'

export const issuerRoutes: RouteObject[] = [
  { path: '/emisor/ingresar', element: <PlaceholderPage title="Ingreso del emisor" /> },
  {
    path: '/emisor',
    element: <RequireSession role="issuer" />,
    children: [
      {
        element: <PanelLayout />,
        children: [
          { index: true, element: <Navigate to="/emisor/emitir" replace /> },
          { path: 'emitir', element: <PlaceholderPage title="Emitir certificado" /> },
          { path: 'trabajadores/nuevo', element: <PlaceholderPage title="Registrar trabajador" /> },
        ],
      },
      { path: 'certificados/:id/hoja', element: <PlaceholderPage title="Hoja del certificado" /> },
    ],
  },
]
