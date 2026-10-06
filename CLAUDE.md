# CLAUDE.md

Guía para Claude Code en este repositorio. Complementa las reglas globales de `~/.claude/CLAUDE.md`. Donde se contradicen, manda este archivo.

## Qué es HabilitApp

Certificados verificables de seguridad laboral sobre Stellar. Las entidades emisoras pequeñas (consultorios de salud ocupacional y centros de entrenamiento) emiten certificados con un código QR, y el coordinador de SST los comprueba escaneándolo. Es el proyecto del equipo para Blockchain Builders 101, y el repositorio es **público** con licencia MIT.

El producto está definido en estos dos documentos, que son la fuente de verdad:

@docs/semana1/ProblemBrief.md
@docs/semana2/ProductBlueprint.md

## Dónde está el resto

- `docs/semana2/EnunciadoEntregable2.md`: enunciado del entregable de la semana 2.
- `docs/semana1/` y `docs/semana2/`: además, un archivo por integrante con sus entregables individuales.
- Tablero de historias y tareas: <https://github.com/users/dfvallejosc/projects/2>
- Las notas de clase y `docs/Syllabus.md` no están versionados. Si existen en local, léelos para plazos y criterios de evaluación.

## Stack y comandos

Monorepo con pnpm y Node 24 (`.nvmrc`). Dos aplicaciones en `apps/`:

- `apps/api`: NestJS 12 (ES modules), TypeORM, PostgreSQL. Pruebas con Vitest, lint con Oxlint.
- `apps/web`: React 19, Vite, Tailwind 4 y shadcn/ui. Pruebas con Vitest y Testing Library.

```bash
nvm use                  # Node 24
pnpm install
docker compose up -d     # PostgreSQL; proyecto y contenedor "habilitapp"
pnpm dev:api             # http://localhost:3001  (GET /health)
pnpm dev:web             # http://localhost:5173  (abrir con localhost, no 127.0.0.1)
pnpm check               # lint, pruebas y build: lo mismo que corre el CI
pnpm test:e2e            # e2e de la API; necesita PostgreSQL arriba
```

Variables de entorno: `.env` en la raíz (PostgreSQL), `apps/api/.env` y `apps/web/.env`. Se copian desde sus `.env.example`. Nunca se versionan.

Del estándar global, Redux Toolkit, React Hook Form, Zod y Axios todavía no están instalados. Se agregan cuando una historia los necesite.

## En qué se aparta de las reglas globales

- GitHub y GitHub Actions, no Bitbucket. La rama base es `main`.
- Vitest y Oxlint, no Jest y ESLint, porque es lo que genera NestJS 12.
- **No se usa registro diario.** Ignora la regla global de `.claude/daily-update.md`.
- **Sin atribución de IA.** No agregues `Co-Authored-By`, ni "Generated with Claude Code", ni nada parecido en commits, PRs o código.
- Para abrir PRs usa los skills `habilitapp-submit-pr` y `habilitapp-pull-request`. Ignora el `submit-pr` global: es de otro proyecto y crea las ramas desde `dev`.

## Código y commits

- Todo el código va en **inglés**: identificadores, comentarios, nombres de ramas, mensajes de commit y títulos de PR. El texto de la interfaz y la documentación van en español.
- Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`. En imperativo, con un cuerpo opcional que explica el porqué.
- Ramas: `feature/`, `fix/`, `chore/` y `hotfix/`, con un nombre corto en inglés.
- Un commit por tema. Agrega los archivos por nombre, nunca con `git add -A`.
- Antes de abrir un PR, `pnpm check` en verde.

## Reglas del producto

- En Stellar solo va la huella con sal de cada certificado. **Nunca datos personales.**
- La consulta pública nunca muestra resultados médicos, restricciones ni diagnósticos.
- La interfaz va en español de Colombia, sin jerga de blockchain, y usa estas palabras para el estado de un certificado: Habilitado, Vencido, No válido y Anulado.
- Los colores, la tipografía y los radios salen de `apps/web/src/styles/tokens.css`. No introduzcas colores nuevos.
- El repositorio es público: ningún secreto, llave ni credencial, ni siquiera de pruebas.

## Flujo de trabajo

- Trabaja en una rama y llega a `main` solo por pull request. Puedes hacer `git push` de ramas de trabajo, nunca a `main`.
- Cada PR necesita el CI en verde y la revisión de **otro** integrante. Nadie aprueba su propio PR.
- Las historias de usuario son `HU-nn` y las tareas técnicas `TA-nn`. Cada una es un issue en el tablero, con criterios de aceptación.
- Estados del tablero: `ToDo`, `In Progress`, `Review` y `Done`. Una tarjeta pasa a `Review` cuando hay un PR abierto y se cumplen sus criterios, y a `Done` cuando otro integrante la revisó, se fusionó a `main` y se comprobó.
- Referencia el issue en el PR con `Refs #n`. Usa `Closes #n` solo si fusionar el PR termina el trabajo.

## Cómo trabajar

- **No tomes decisiones de producto ni de arquitectura sin confirmar.** Pregunta, de a una cosa por vez, y no te adelantes.
- Haz solo lo que se pidió. Si ves algo más, menciónalo sin arreglarlo.
- Di qué verificaste y qué no. No afirmes que algo funciona si no lo ejecutaste.

## Decisiones abiertas

No las decidas solas. Pregunta antes de tocarlas:

- Proveedor de autenticación (Clerk o Better Auth).
- Cómo se conecta la API con Stellar y cómo se custodian las llaves de los emisores.
- Entidades de la base de datos y cómo se organizan los módulos de la API.
- Staging: la propuesta es la API en Render y PostgreSQL en Neon.
