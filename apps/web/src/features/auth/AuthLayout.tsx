import { ClerkProvider } from '@clerk/react'
import { Outlet } from 'react-router'
import { EmptyState } from '@/components/ui/empty-state'

export const AuthLayout = () => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    return (
      <EmptyState variant="error" title="El ingreso no está configurado">
        Intenta de nuevo más tarde o avisa al equipo de HabilitApp.
      </EmptyState>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <Outlet />
    </ClerkProvider>
  )
}
