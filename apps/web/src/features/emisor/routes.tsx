import { Navigate, type RouteObject } from 'react-router'
import { IssuerAuthLayout } from '@/features/emisor/auth/IssuerAuthLayout'
import { CertificatesPage } from '@/features/emisor/certificados/CertificatesPage'
import { IssueCertificatePage } from '@/features/emisor/emitir/IssueCertificatePage'
import { CertificateSheetPage } from '@/features/emisor/hoja/CertificateSheetPage'
import { LoginPage } from '@/features/emisor/ingreso/LoginPage'
import { RegisterWorkerPage } from '@/features/emisor/trabajadores/RegisterWorkerPage'
import { WorkersPage } from '@/features/emisor/trabajadores/WorkersPage'
import { PanelLayout } from '@/layouts/PanelLayout'
import { RequireSession } from '@/layouts/RequireSession'

export const issuerRoutes: RouteObject[] = [
  {
    element: <IssuerAuthLayout />,
    children: [
      { path: '/emisor/ingresar', element: <LoginPage /> },
      {
        path: '/emisor',
        element: <RequireSession role="issuer" />,
        children: [
          {
            element: <PanelLayout />,
            children: [
              { index: true, element: <Navigate to="/emisor/emitir" replace /> },
              { path: 'certificados', element: <CertificatesPage /> },
              { path: 'emitir', element: <IssueCertificatePage /> },
              { path: 'trabajadores', element: <WorkersPage /> },
              { path: 'trabajadores/nuevo', element: <RegisterWorkerPage /> },
            ],
          },
          { path: 'certificados/:id/hoja', element: <CertificateSheetPage /> },
        ],
      },
    ],
  },
]
