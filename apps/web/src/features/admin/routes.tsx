import { Navigate, type RouteObject } from 'react-router'
import { AdminSessionGate } from '@/features/admin/auth/AdminSessionGate'
import { EntitiesPage } from '@/features/admin/emisores/EntitiesPage'
import { EntityDetailPage } from '@/features/admin/emisores/EntityDetailPage'
import { RegisterEntityPage } from '@/features/admin/emisores/RegisterEntityPage'
import { LoginPage } from '@/features/admin/ingreso/LoginPage'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { PanelLayout } from '@/layouts/PanelLayout'

export const adminRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: '/admin/ingresar', element: <LoginPage /> },
      {
        path: '/admin',
        element: <AdminSessionGate />,
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
    ],
  },
]
