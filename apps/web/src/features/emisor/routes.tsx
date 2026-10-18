import { Navigate, type RouteObject } from 'react-router'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { IssuerSessionGate } from '@/features/emisor/auth/IssuerSessionGate'
import { CertificatesPage } from '@/features/emisor/certificados/CertificatesPage'
import { IssueCertificatePage } from '@/features/emisor/emitir/IssueCertificatePage'
import { CertificateSheetPage } from '@/features/emisor/hoja/CertificateSheetPage'
import { AcceptInvitationPage } from '@/features/emisor/invitacion/AcceptInvitationPage'
import { LoginPage } from '@/features/emisor/ingreso/LoginPage'
import { RegisterWorkerPage } from '@/features/emisor/trabajadores/RegisterWorkerPage'
import { WorkersPage } from '@/features/emisor/trabajadores/WorkersPage'
import { PanelLayout } from '@/layouts/PanelLayout'

export const issuerRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: '/emisor/ingresar', element: <LoginPage /> },
      { path: '/emisor/aceptar-invitacion', element: <AcceptInvitationPage /> },
      {
        path: '/emisor',
        element: <IssuerSessionGate />,
        children: [
          {
            element: <PanelLayout />,
            children: [
              { index: true, element: <Navigate to="/emisor/certificados" replace /> },
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
