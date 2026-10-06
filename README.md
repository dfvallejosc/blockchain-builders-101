# HabilitApp

Certificados verificables de seguridad laboral sobre Stellar. Proyecto del equipo para Blockchain Builders 101 (Blockchain Acceleration Foundation).

Los entregables de documentación están en [`docs/`](docs/). El diseño del producto está en [`docs/semana2/ProductBlueprint.md`](docs/semana2/ProductBlueprint.md) y el backlog en el [tablero de GitHub Projects](https://github.com/users/dfvallejosc/projects/2).

## Integrantes

- Diego Vallejos
- Andres Aguirre
- Luis Patino

## Estructura

```
apps/
├── api/   API en NestJS con TypeORM y PostgreSQL
└── web/   Interfaz en React con Vite, Tailwind y shadcn/ui
docs/      Documentación por semana
```

## Requisitos

- Node.js 24 o superior (`nvm use` lee la versión de `.nvmrc`)
- pnpm 10
- Docker, para la base de datos local

## Cómo correrlo en local

```bash
pnpm install

# 1. Base de datos
cp .env.example .env            # elige tu usuario, contraseña y nombre de base de datos
docker compose up -d

# 2. API
cp apps/api/.env.example apps/api/.env
# completa DATABASE_URL con los mismos valores del .env de la raíz
pnpm dev:api                    # http://localhost:3001/health

# 3. Interfaz
cp apps/web/.env.example apps/web/.env
pnpm dev:web                    # http://localhost:5173
```

La ruta `GET /health` responde `200` cuando la API alcanza la base de datos y `503` si no.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm check` | Lo mismo que corre la integración continua: lint, pruebas y compilación |
| `pnpm lint` | Lint de la API y de la interfaz |
| `pnpm test` | Pruebas unitarias de la API y de la interfaz |
| `pnpm test:e2e` | Pruebas de la API contra PostgreSQL (necesita la base de datos local arriba) |
| `pnpm build` | Compila la API y la interfaz |

## Integración continua

En cada pull request y en cada cambio a `main`, GitHub Actions corre `lint`, `test` y `build`, y las pruebas e2e de la API contra una base de datos temporal. El flujo está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Para que bloquee los merges, hay que activar la regla de la rama en la configuración del repositorio (Settings > Branches > Require status checks).

## Variables de entorno

Los archivos `.env` no se versionan. Cada aplicación tiene su `.env.example` con las variables que necesita y sin valores secretos. La API valida las variables al arrancar y se detiene con un mensaje claro si falta alguna.

## Sistema de diseño

Los colores, la tipografía y los radios están en [`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css). Para cambiar la marca se editan esos valores, no los componentes.

## Convenciones

- TypeScript en modo estricto, sin `any`.
- Commits convencionales (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Ramas `feature/`, `fix/` y `chore/`, y cambios a `main` solo por pull request con revisión de otro integrante.

## Licencia

Pendiente de definir. El programa pide una licencia de código abierto.
