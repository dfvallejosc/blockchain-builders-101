import { Button } from '@/components/ui/button'

export const App = () => {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-4">
      <p className="font-mono text-sm text-muted-foreground">HabilitApp</p>
      <h1 className="text-3xl font-bold text-primary">
        Un certificado vigente se reconoce en un segundo.
      </h1>
      <p className="text-muted-foreground">
        Estructura base del proyecto. Las pantallas de los paneles y la verificación se construyen sobre esta base.
      </p>
      <div>
        <Button>Registrar emisor</Button>
      </div>
    </main>
  )
}
