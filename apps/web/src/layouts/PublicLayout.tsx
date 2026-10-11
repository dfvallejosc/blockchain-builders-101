import { Outlet } from 'react-router'

export const PublicLayout = () => (
  <main className="min-h-svh bg-background text-foreground">
    <Outlet />
  </main>
)
