interface PlaceholderPageProps {
  title: string
}

export const PlaceholderPage = ({ title }: PlaceholderPageProps) => (
  <section className="mx-auto max-w-3xl p-6">
    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    <p className="mt-2 text-muted-foreground">Esta pantalla se construye en su tarea.</p>
  </section>
)
