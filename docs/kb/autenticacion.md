# Autenticación y roles (TA-20)

Estado de las decisiones de autenticación. Es la base de TA-20 (issue #63). Revisado el 2026-10-16.

## Decidido

Lo decidió Diego Vallejos, responsable de TA-20, en la sesión de brainstorming. El issue pide que el equipo elija el proveedor y que la razón quede en el PR, así que **Andres y Luis deben confirmarlo al revisar el PR**.

| Decisión | Elegido | Razón |
| --- | --- | --- |
| Proveedor | **Clerk** | Es lo más rápido de poner en marcha, el plan gratis cubre de sobra a nuestros usuarios y no custodiamos contraseñas. Clerk envía él mismo las invitaciones por correo. |
| Conexión con NestJS | **Guard propio** | Un módulo `auth/` con un guard global que verifica el token de Clerk con `@clerk/backend`, y decoradores propios `@Public()`, `@Roles()` y `@CurrentIssuer()`. Se descartó un paquete de la comunidad. |
| Alcance de TA-20 | **Solo la base** | El guard, los roles, los decoradores, el vínculo cuenta ↔ emisor y `GET /me` (rol y entidad de la sesión). Las rutas de administración de entidades son de TA-21. |

Se descartó Better Auth. Lo que se averiguó de él está al final, por si se vuelve a evaluar.

## Decidido en detalle

Diego aprobó estas seis el 2026-10-16. Las marcadas con "por verificar" dependen de algo que la documentación de Clerk no confirmó, y se comprueban en una instancia de desarrollo antes de contar con ellas.

1. **Primer acceso del emisor:** invitación por correo de Clerk. Por verificar que el plan gratis la permita. Si no, se crea la cuenta con una contraseña temporal.
2. **Vínculo cuenta ↔ emisor:** `role` e `issuerId` van en los metadatos públicos del usuario en Clerk, y la API los pone al invitar. El guard los lee del token como `metadata: { role, issuerId }`. Que el plan gratis deje añadir esos datos al token y que lleguen con esa forma está por verificar en una instancia real de Clerk. Si no se puede, hará falta una tarea nueva (por ejemplo, consultar a Clerk con una caché corta en memoria); hoy eso no está implementado. No hay tabla de cuentas propia. Si el `issuerId` no existe en nuestra base, el guard responde 403.
3. **Entidad revocada: no se permite el acceso.** Como el plan gratis no incluye `banUser`, lo aplica el guard: si `issuer.revokedAt` está marcado, responde 403 en cualquier ruta, incluido `GET /me`, con un código que el front usa para mostrar el motivo. `issuer.revokedAt` es la única fuente de verdad. Clerk puede dejarla autenticarse, pero la API no le da nada.
4. **Sesión:** el front manda el token de Clerk en el encabezado `Authorization`. No hace falta cookie ni proxy en Render. `authorizedParties` usa `CORS_ORIGIN`.
5. **Primer administrador:** se crea a mano en el panel de Clerk con `role: admin` en sus metadatos. No hay código ni contraseña en variables de entorno.
6. **Registro libre:** se cierra en el panel de Clerk con el modo solo por invitación (por verificar que el plan gratis lo permita). Además, el guard rechaza con 403 a cualquier usuario sin rol en sus metadatos. Solo correo y contraseña por ahora. Entrar con Google se puede activar después en el panel, sin cambiar la API.

**Pruebas:** unitarias del guard con un verificador falso, y e2e con tokens firmados en local usando `jwtKey` (verificación sin red), para que el CI no necesite llaves de Clerk. Las suites unitaria y e2e ya demuestran que la verificación sin red funciona con tokens firmados en local. Lo que no prueban es el comportamiento de una instancia real de Clerk.

## Lo que se sabe de Clerk

Comprobado en su documentación el 2026-10-16. Lo que la documentación no confirmó está marcado.

**Plan gratis (Hobby)**
- Hasta 50.000 usuarios retenidos al mes por aplicación. Un usuario cuenta solo si vuelve al menos 24 horas después de registrarse. El skill de backend del equipo decía 10k y estaba desactualizado. Pasado ese límite hay un mes de gracia para pagar.
- **No incluye:** bloqueo de usuarios (`ban`), requisitos de contraseña personalizados, plantillas de correo personalizadas, MFA, quitar la marca de Clerk, passkeys ni códigos por SMS.
- Las sesiones duran 7 días y no se pueden cambiar.
- Los roles personalizados de organización exigen un complemento de pago. No se usarían organizaciones.
- Hasta 3 puestos en el panel de Clerk.

**Verificar el token en nuestra API**
- La API usa `verifyToken(token, { jwtKey, secretKey, authorizedParties })` de `@clerk/backend`. Esa firma ya está confirmada y en uso. `publishableKey` no se pasa en ninguna parte. `authorizedParties` sale de `CORS_ORIGIN`; sin ese valor se omite, y debe estar fijado para no quedar abierto a CSRF.
- Con `jwtKey` el token se verifica sin red. Con solo `secretKey`, Clerk descarga sus llaves por red.
- `CLERK_JWT_KEY` debe ser la llave pública en PEM (SPKI, `BEGIN PUBLIC KEY`, RSA de 2048 bits). Se acepta en varias líneas (entre comillas en el `.env`) o en una sola. Una llave en formato PKCS#1 (`BEGIN RSA PUBLIC KEY`) o de otro tipo se rechaza al usarla por primera vez y se responde 503.
- Entre orígenes distintos, el token llega por el encabezado `Authorization`. En el mismo origen llega por la cookie `__session`.
- Se pueden añadir datos al token de sesión (por ejemplo el rol) desde el panel, en Sessions. El límite es 1,2 KB. No se confirmó que esté en el plan gratis ni la sintaxis para metadatos públicos. La forma `metadata: { role, issuerId }` que lee el verificador sigue sin confirmarse contra un token real de Clerk.

**Invitaciones**
- `POST /v1/invitations` (límite de 100 por hora) acepta `emailAddress`, `redirectUrl` y `publicMetadata`. Clerk envía el correo con un enlace único. El correo del invitado queda verificado y la invitación vence al mes. Se pueden revocar.
- No se confirmó que las invitaciones estén en el plan gratis, ni que el `publicMetadata` de la invitación pase al usuario.
- Una invitación **no impide** que alguien se registre por su cuenta. Para eso hace falta el modo "solo por invitación" en el panel. No se confirmó que esté en el plan gratis.

**Bloqueo**
- `banUser()` revoca sus sesiones y le impide volver a entrar, pero el plan gratis lo excluye. `lockUser()` bloquea solo hasta que pasa un tiempo (por defecto 1 hora). No se confirmó si está en el plan gratis.

## Cómo responde la API hoy

Lo que hace el código, comprobado con las pruebas unitarias y e2e. Nada de esto se ha probado contra una instancia real de Clerk.

- **401:** no hay token, o el token es malo (vencido, mal firmado, de un origen no autorizado o sin usuario).
- **503:** la verificación no puede hacerse. Es el caso de una llave mal configurada, de Clerk inalcanzable o de que Clerk rechace la llave secreta. Responde `El servicio no está disponible.` y no expone detalles.
- **Sin llaves configuradas** (ni `CLERK_JWT_KEY` ni `CLERK_SECRET_KEY`): una petición sin token recibe 401 y una petición con token recibe 503. Solo se permite fuera de producción.
- **Producción:** `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` y `CORS_ORIGIN` son obligatorias, pero solo cuando `NODE_ENV=production`. Si falta alguna, la API no arranca. `CLERK_JWT_KEY` sigue siendo opcional.
- `CLERK_PUBLISHABLE_KEY` se exige en producción, pero la API todavía no la lee. La van a necesitar el front y TA-21.
- Con `CLERK_SECRET_KEY` y sin `CLERK_JWT_KEY`, si Clerk se cae, cada petición espera unos segundos (el reintento con espera de Clerk) antes de responder 503.

## Reglas que ya fijan el criterio de aceptación

- Una ruta privada sin sesión responde 401, y con el rol equivocado 403.
- Todo es privado por defecto. Las rutas públicas, como la verificación por QR, se marcan de forma explícita.
- Un emisor solo actúa en nombre de su entidad.
- Ninguna llave ni credencial se versiona. Todo sale de variables de entorno y `apps/api/.env.example` se mantiene al día.
- No se registran contraseñas, tokens ni datos personales en logs, y los errores no exponen trazas, consultas ni nombres de tablas.

## Better Auth (descartado)

Comprobado en su documentación el 2026-10-16:

- No trae adaptador de TypeORM. Se conecta con Kysely sobre un `Pool` de `pg`. Su CLI `generate` produce SQL con sus tablas, que habría que pasar a una migración de TypeORM.
- Los usuarios viven en nuestro PostgreSQL y se pueden añadir campos propios al usuario. El plugin `admin` trae roles, `createUser` y bloqueo de usuarios.
- Para NestJS solo hay un paquete de la comunidad, `@thallesp/nestjs-better-auth`. No documenta ESM, y exige `bodyParser: false`.
- Se descartó porque el equipo prefirió Clerk por velocidad y por no custodiar contraseñas. Habría dado pruebas e2e locales y un vínculo cuenta ↔ emisor dentro de nuestra base.
