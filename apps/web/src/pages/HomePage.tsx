import { Link } from 'react-router'

export const HomePage = () => (
  <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-4">
    <p className="font-mono text-sm text-muted-foreground">HabilitApp</p>
    <h1 className="text-3xl font-bold text-primary">Certificados verificables de seguridad laboral</h1>
    <ul className="flex flex-col gap-2">
      <li>
        <Link className="underline" to="/emisor/ingresar">
          Panel del emisor
        </Link>
      </li>
      <li>
        <Link className="underline" to="/admin/ingresar">
          Panel de administración
        </Link>
      </li>
    </ul>
  </main>
)
