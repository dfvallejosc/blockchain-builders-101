import { Link } from 'react-router'

export const NotFoundPage = () => (
  <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 px-4">
    <h1 className="text-2xl font-bold">Página no encontrada</h1>
    <Link className="underline" to="/">
      Volver al inicio
    </Link>
  </main>
)
