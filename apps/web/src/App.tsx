import { useApiHealth, type ApiStatus } from '@/hooks/useApiHealth'

const STATUS_TEXT: Record<ApiStatus, string> = {
  loading: 'Consultando la API…',
  ok: 'API conectada a la base de datos',
  error: 'No se pudo conectar con la API',
}

export const App = () => {
  const status = useApiHealth()

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-4">
      <p className="font-mono text-sm text-muted-foreground">HabilitApp</p>
      <h1 className="text-3xl font-bold text-primary">Hola mundo</h1>
      <p className="text-muted-foreground">
        Estructura base del proyecto. Las pantallas de los paneles y de la verificación se construyen sobre esta base.
      </p>
      <p role="status" className="rounded-md border border-border bg-card px-4 py-3 text-sm">
        {STATUS_TEXT[status]}
      </p>
    </main>
  )
}
