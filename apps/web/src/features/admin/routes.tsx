import { Navigate, type RouteObject } from 'react-router'
import { EntitiesPage } from '@/features/admin/emisores/EntitiesPage'
import { EntityDetailPage } from '@/features/admin/emisores/EntityDetailPage'
import { RegisterEntityPage } from '@/features/admin/emisores/RegisterEntityPage'
import { LoginPage } from '@/features/admin/ingreso/LoginPage'
import { PanelLayout } from '@/layouts/PanelLayout'
import { RequireSession } from '@/layouts/RequireSession'

export const adminRoutes: RouteObject[] = [
  { path: '/admin/ingresar', element: <LoginPage /> },
  {
    path: '/admin',
    element: <RequireSession role="admin" />,
    children: [
      {
        element: <PanelLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/emisores" replace /> },
          { path: 'emisores', element: <EntitiesPage /> },
          { path: 'emisores/nuevo', element: <RegisterEntityPage /> },
          { path: 'emisores/:id', element: <EntityDetailPage /> },
        ],
      },
    ],
  },
]
