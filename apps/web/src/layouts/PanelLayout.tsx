import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router'
import { LOGIN_PATH } from '@/layouts/RequireSession'
import { signOut, type Role, type Session } from '@/data'

interface NavItem {
  label: string
  to: string
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  issuer: [
    { label: 'Emitir certificado', to: '/emisor/emitir' },
    { label: 'Registrar trabajador', to: '/emisor/trabajadores/nuevo' },
  ],
  admin: [
    { label: 'Emisores', to: '/admin/emisores' },
    { label: 'Registrar emisor', to: '/admin/emisores/nuevo' },
  ],
}

const PANEL_NAME: Record<Role, string> = {
  issuer: 'Panel del emisor',
  admin: 'Panel de administración',
}

const userLabel = (session: Session): string =>
  session.role === 'issuer' ? session.entityName : session.name

export const PanelLayout = () => {
  const session = useOutletContext<Session>()
  const navigate = useNavigate()
  const { role } = session

  const handleSignOut = async () => {
    await signOut(role)
    navigate(LOGIN_PATH[role])
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground md:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:w-64 md:border-r md:border-b-0">
        <p className="font-bold">HabilitApp</p>
        <p className="text-sm text-muted-foreground">{PANEL_NAME[role]}</p>
        <nav aria-label="Secciones" className="mt-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS[role].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className="block rounded-md px-3 py-2 text-sm aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-bold"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-border px-6 py-3">
          <span className="text-sm">{userLabel(session)}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </header>
        <main className="flex-1">
          <Outlet context={session} />
        </main>
      </div>
    </div>
  )
}
