# Autenticación y roles (TA-20)

Estado de las decisiones de autenticación. Es la base de TA-20 (issue #63). Revisado el 2026-10-16.

## Decidido

Las tomó Diego Vallejos, responsable de TA-20, en la sesión de brainstorming. El issue pide que el equipo elija el proveedor y que la razón quede en el PR, así que **Andres y Luis deben confirmarlas al revisar el PR**.

| Decisión | Elegido | Razón |
| --- | --- | --- |
| Proveedor | **Better Auth** | Los usuarios viven en nuestro PostgreSQL, así que ligar la cuenta con el emisor y revisar si está revocado se resuelve con una consulta a la misma base. Las pruebas de 401 y 403 corren en local contra PostgreSQL, sin servicios externos ni llaves compartidas en un repositorio público. Costo cero. |
| Primera contraseña de un emisor | **Contraseña temporal** | El administrador crea la cuenta, la API genera una contraseña aleatoria y la devuelve una sola vez, y el emisor debe cambiarla al entrar. No se guarda en claro ni se escribe en logs. No hace falta un servicio de correo. |
| Sesión entre front y API | **Cookie `httpOnly` con proxy** (plan B de la sesión, ver abajo) | El sitio del front en Render reenvía `/api/*` a la API con una regla de reescritura, y el navegador ve un solo origen. La alternativa de respaldo es un token Bearer. |

Por qué no Clerk: es más rápido de poner en marcha, pero habría que mantener sincronizado el vínculo cuenta ↔ emisor entre su servicio y nuestra base, y las pruebas necesitarían simular la verificación del token o repartir llaves. Clerk sigue siendo una elección razonable si el plazo aprieta más que lo anterior. Su gratuidad hasta 10k usuarios activos al mes sale del skill del equipo y no se verificó en su página de precios.

## Sin probar todavía

La regla de reescritura `/api/*` no existe ni se ha probado. La documentación de Render dice que una regla de reescritura sirve el contenido de la URL de destino sin cambiar la dirección del navegador, y que el destino puede ser una URL pública. No dice nada sobre cookies, encabezados ni tiempos de espera. Hay que crear la regla y probarla contra el front desplegado antes de contar con ella. Si no pasa bien las cookies, se cambia a Bearer.

## Lo que se sabe de Better Auth

Comprobado en su documentación el 2026-10-16:

- No trae adaptador de TypeORM. Se conecta con Kysely sobre un `Pool` de `pg` (también hay Prisma, Drizzle y MongoDB).
- Su CLI `generate` produce un archivo SQL con sus tablas. Ese SQL se pasaría a una migración de TypeORM generada con la CLI, no escrita a mano. Su comando `migrate` solo sirve con Kysely y no se usa aquí, porque las migraciones son de TypeORM.
- Los nombres de tablas y columnas se mapean uno por uno con `modelName` y `fields`. No hay conversión automática a snake_case.
- Se pueden agregar campos propios al usuario con `user.additionalFields`. Los campos del servidor, como `role`, van con `input: false`.
- El plugin `admin` trae roles (`admin` y `user`, ampliables), `createUser` (un administrador crea la cuenta de otro, con correo obligatorio), `setUserPassword` y bloqueo de usuarios.
- Para NestJS no hay paquete oficial. Existe `@thallesp/nestjs-better-auth`, mantenido por la comunidad: guard global (todo privado por defecto), `@AllowAnonymous()` para rutas públicas y `@Session()`. Exige `bodyParser: false` al crear la aplicación. La documentación no dice nada sobre ESM, y la API de este repo usa ES modules, así que hay que comprobarlo al instalar.

## Abierto

No las decidas solas. Pregunta antes:

- Usar el paquete de la comunidad para NestJS o escribir un guard propio sobre la API de sesión de Better Auth.
- Cómo queda ligada la cuenta con el emisor (campo en el usuario, tabla aparte).
- Si un emisor revocado puede entrar, y dónde se bloquea que emita o anule.
- Cómo se crea el primer administrador.
- Cómo corren en staging las migraciones de las tablas de Better Auth (ver [infraestructura](infraestructura.md)).

## Reglas que ya fijan el criterio de aceptación

- Una ruta privada sin sesión responde 401, y con el rol equivocado 403.
- Todo es privado por defecto. Las rutas públicas, como la verificación por QR, se marcan de forma explícita.
- Un emisor solo actúa en nombre de su entidad.
- Ninguna llave ni credencial se versiona. Todo sale de variables de entorno y `apps/api/.env.example` se mantiene al día.
- No se registran contraseñas, tokens ni datos personales en logs, y los errores no exponen trazas, consultas ni nombres de tablas.
