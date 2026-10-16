# Infraestructura de staging

Dónde corre HabilitApp hoy y cómo consultarlo. Revisado el 2026-10-16 con el Render CLI y los archivos del repo. Si algo de aquí cambia, actualiza este archivo en el mismo PR.

No hay producción todavía. Todo lo que está desplegado es staging, en Render.

## Qué hay desplegado

| Pieza | Servicio en Render | Dirección | Plan |
| --- | --- | --- | --- |
| Front (React y Vite) | `habilitapp-web`, sitio estático | <https://habilitapp-web.onrender.com> | starter |
| API (NestJS) | `habilitapp-api`, servicio web con Node | <https://habilitapp-api.onrender.com> | free |
| Base de datos | `habilitapp-staging-db`, PostgreSQL 18, región Virginia | solo por el panel de Render o `render psql` | free |

- Los tres están en el mismo espacio de trabajo de Render, llamado "Habilitapp".
- La API responde `GET /health`, que Render usa como verificación de salud.
- La propuesta original de Neon para la base ya no aplica: la base de staging está en Render.

## Cómo se despliega

- `.github/workflows/deploy.yml` se dispara cuando el CI termina en verde sobre `main`. Llama a la API de Render para desplegar el commit que pasó el CI, en la API y en el front. Los datos (`RENDER_API_KEY`, `RENDER_API_SERVICE_ID` y `RENDER_WEB_SERVICE_ID`) están en los secretos y variables de GitHub, nunca en el repo.
- Además, los dos servicios tienen `autoDeploy` con disparador `commit` sobre la rama `main`. No se comprobó si eso causa un despliegue doble junto con el workflow.
- Nadie despliega a mano a staging.
- Comando de construcción de la API: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm --filter api build`.
- Comando de arranque de la API en Render: `node apps/api/dist/main`. No hay comando previo al despliegue (`preDeployCommand`).
- Comando de construcción del front: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm --filter web build`, publicando `apps/web/dist`.

## Cosas que hay que saber

- **Las migraciones no corren en staging.** El script `start:prod` de `apps/api/package.json` corre las migraciones y luego arranca, pero Render arranca con `node apps/api/dist/main` y se las salta. Cualquier migración nueva hay que correrla por otra vía o cambiar el comando de arranque. Está sin resolver.
- **La base de staging vence el 2026-11-07.** Es PostgreSQL en plan free y Render la borra a los 30 días si no se pasa a un plan de pago. Está sin resolver.
- **Front y API son sitios distintos para el navegador.** Los dos viven bajo `onrender.com`, que está en la Public Suffix List (línea 15568 de la lista, comprobada el 2026-10-16), así que `habilitapp-web.onrender.com` y `habilitapp-api.onrender.com` no comparten sitio. Una cookie de la API sería de terceros. Ver [autenticación](autenticacion.md).
- **La API en plan free se duerme** cuando no recibe tráfico, y la primera petición después tarda. Es el comportamiento del plan free de Render y no se midió aquí.
- El front en staging todavía usa datos de ejemplo en `localStorage` y no llama a la API.

## Render CLI

El Render CLI (`render`, versión 2.28.0) está instalado en la máquina de Diego y ya tiene sesión iniciada. Úsalo para consultar el estado real en vez de suponerlo. Solo lecturas, salvo que Diego pida otra cosa:

```bash
render whoami -o json --confirm        # con qué cuenta estás
render services -o json --confirm      # servicios y bases, con URLs, planes y comandos
render logs                            # registros de un servicio
render deploys                         # despliegues de un servicio
```

- El CLI no lista las reglas de reescritura del sitio estático. Esas se ven y se cambian en el panel de Render.
- No leas ni copies llaves, tokens ni cadenas de conexión de la salida. El repositorio es público.
- Si el CLI no tiene sesión en otra máquina, se inicia con `render login`.
