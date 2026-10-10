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

### Notas de clase: cuál leer según la tarea

No las cargues todas. Lee solo la que corresponda, y solo la sección que necesites (cada archivo se divide en secciones `##`). Si una nota no existe en local, dilo en vez de suponer su contenido.

Índice de lo que cubre cada clase:

- **Clase 3, Diseñar** (`docs/semana2/NotasClase3Disenar.md`, módulo 2): Lean Canvas, Círculo de Oro y propuesta de valor, usuario y flujo de usuario, historias de usuario, MVP y priorización, backlog y Kanban en GitHub Projects, y una sesión práctica de wallets en Stellar. Base del entregable 2, el Product Blueprint.
- **Clase 4, Stellar** (`docs/semana2/NotasClase4Stellar.md`): qué es la red y la Stellar Development Foundation, comparación con Bitcoin y Ethereum (tiempos, costos, capacidad), consenso SCP, usos y anchors, las 5 capas técnicas, el Lumen, y cuentas (creación, reservas, firmantes). Cierra con entregables y opciones de custodia.
- **Clase 5, Soroban** (`docs/semana2/NotasClase5Soroban.md`, módulo 3): cómo guarda datos la red (ledger entries), cuentas y reserva mínima, activos y trustlines, tarifas y renta de almacenamiento (TTL), operaciones y ciclo de vida de una transacción, contratos Soroban y ambiente de desarrollo (Rust, Stellar CLI, testnet).

| Si la tarea trata de… | Lee |
| --- | --- |
| Lean Canvas, propuesta de valor, flujo de usuario, historias, MVP, backlog o tablero Kanban | `docs/semana2/NotasClase3Disenar.md` |
| Wallets en Stellar (sesión práctica) | `docs/semana2/NotasClase3Disenar.md`, sección "Wallets en Stellar" |
| Qué es Stellar, consenso (SCP), comparación con Bitcoin y Ethereum, anchors, capas técnicas, Lumen | `docs/semana2/NotasClase4Stellar.md` |
| Cuentas, firmantes, opciones de custodia de llaves, quién paga el primer Lumen, paso de testnet a mainnet | `docs/semana2/NotasClase4Stellar.md`, secciones "Cuentas en Stellar" y "Entregables, Mentorías y Próximos Pasos" |
| Qué se guarda en la red, ledger entries, trustlines, costos, renta y TTL de almacenamiento | `docs/semana2/NotasClase5Soroban.md` |
| Contratos Soroban, tipos de almacenamiento (persistente, temporal, instancia), ciclo de vida de una transacción, ambiente de desarrollo con Rust y Stellar CLI | `docs/semana2/NotasClase5Soroban.md` |
| Plazos y criterios de evaluación | `docs/Syllabus.md` |

Las notas son apuntes de clase, no decisiones del equipo. Si chocan con el Problem Brief o el Product Blueprint, mandan estos dos y las decisiones abiertas se siguen preguntando.

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

Del estándar global, Redux Toolkit y Axios todavía no están instalados. Se agregan cuando una historia los necesite. React Router, React Hook Form, Zod y qrcode.react ya están instalados (TA-04) para que las pantallas no toquen `package.json`.

El front vive en `apps/web/src/`: cada superficie tiene su carpeta en `features/` (`emisor`, `admin`, `verificar`) con su `routes.tsx`, y `src/routes.tsx` solo las junta. Los datos son de ejemplo y salen de `src/data/` (se importan desde `@/data`); guardan en `localStorage` y se cambian por la API más adelante.

Los componentes compartidos están en `apps/web/src/components/ui/` (Button, Field/Input, StatusChip, Alert, Toast, Skeleton, Checkbox, Select, MultiSelect, EmptyState, DataTable, ConfirmDialog, Steps). Úsalos en vez de crear otros; los colores salen de `tokens.css` por las utilidades `ha-*` (por ejemplo `bg-ha-primary`). En desarrollo, `/dev/components` los muestra con sus estados.

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
- **Usa el flujo de superpowers** en toda tarea de código: `superpowers:brainstorming` antes de construir algo nuevo, `superpowers:writing-plans` para tareas de varios pasos, `superpowers:test-driven-development` al implementar, `superpowers:systematic-debugging` ante un fallo y `superpowers:verification-before-completion` antes de dar algo por terminado o abrir un PR. **Nunca se commitean** los specs, planes ni otros artefactos de superpowers (`docs/superpowers/`): se quedan en local y la carpeta está en `.gitignore`. Si un skill dice "commitea el spec o el plan", sáltate ese paso.

## Decisiones abiertas

No las decidas solas. Pregunta antes de tocarlas:

- Proveedor de autenticación (Clerk o Better Auth).
- Cómo se conecta la API con Stellar y cómo se custodian las llaves de los emisores.
- Entidades de la base de datos y cómo se organizan los módulos de la API.
- Staging: la propuesta es la API en Render y PostgreSQL en Neon.
