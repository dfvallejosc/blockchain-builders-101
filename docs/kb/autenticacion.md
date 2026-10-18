# Autenticación y roles (TA-20)

Estado de las decisiones de autenticación. Es la base de TA-20 (issue #63). Revisado el 2026-10-17, con una prueba contra una instancia de desarrollo de Clerk (ver "Comprobado contra Clerk real").

## Decidido

Lo decidió Diego Vallejos, responsable de TA-20, en la sesión de brainstorming. El issue pide que el equipo elija el proveedor y que la razón quede en el PR, así que **Andres y Luis deben confirmarlo al revisar el PR**.

| Decisión | Elegido | Razón |
| --- | --- | --- |
| Proveedor | **Clerk** | Es lo más rápido de poner en marcha, el plan gratis cubre de sobra a nuestros usuarios y no custodiamos contraseñas. Clerk envía él mismo las invitaciones por correo. |
| Conexión con NestJS | **Guard propio** | Un módulo `auth/` con un guard global que verifica el token de Clerk con `@clerk/backend`, y decoradores propios `@Public()`, `@Roles()` y `@CurrentIssuer()`. Se descartó un paquete de la comunidad. |
| Alcance de TA-20 | **Solo la base** | El guard, los roles, los decoradores, el vínculo cuenta ↔ emisor y `GET /me` (rol y entidad de la sesión: `id`, `name`, `certificateTypes`, `nit` y `city`; nunca datos de contacto). Las rutas de administración de entidades son de TA-21. |

Se descartó Better Auth. Lo que se averiguó de él está al final, por si se vuelve a evaluar.

## Decidido en detalle

Diego aprobó estas seis el 2026-10-16. Las marcadas con "por verificar" dependen de algo que la documentación de Clerk no confirmó, y se comprueban en una instancia de desarrollo antes de contar con ellas.

1. **Primer acceso del emisor:** invitación por correo de Clerk, creada con `AccountsService.inviteIssuer`. Funcionó de punta a punta en una instancia de desarrollo (ver "Comprobado contra Clerk real"). Falta confirmar que el plan gratis la incluya en producción; si no, se crea la cuenta con una contraseña temporal.
2. **Vínculo cuenta ↔ emisor:** `role` e `issuerId` van en los metadatos públicos del usuario en Clerk, y la API los pone al invitar. El guard los lee del token como `metadata: { role, issuerId }`. En una instancia de desarrollo de Clerk el token real trae esa forma (ver "Comprobado contra Clerk real"). Falta confirmar que el plan gratis la incluya en producción; si no, hará falta una tarea nueva (por ejemplo, consultar a Clerk con una caché corta en memoria), y hoy eso no está implementado. No hay tabla de cuentas propia. Si el `issuerId` no existe en nuestra base, el guard responde 403.
3. **Entidad revocada: no se permite el acceso.** Como el plan gratis no incluye `banUser`, lo aplica el guard: si `issuer.revokedAt` está marcado, responde 403 en cualquier ruta, incluido `GET /me`, con un código que el front usa para mostrar el motivo. `issuer.revokedAt` es la única fuente de verdad. Clerk puede dejarla autenticarse, pero la API no le da nada.
4. **Sesión:** el front manda el token de Clerk en el encabezado `Authorization`. No hace falta cookie ni proxy en Render. `authorizedParties` usa `CORS_ORIGIN`.
5. **Primer administrador:** se crea a mano en el panel de Clerk con `role: admin` en sus metadatos. No hay código ni contraseña en variables de entorno.
6. **Registro libre:** se cierra en el panel de Clerk con el modo solo por invitación (por verificar que el plan gratis lo permita). Además, el guard rechaza con 403 a cualquier usuario sin rol en sus metadatos. Solo correo y contraseña por ahora. Entrar con Google se puede activar después en el panel, sin cambiar la API.

**Pruebas:** unitarias del guard con un verificador falso, y e2e con tokens firmados en local usando `jwtKey` (verificación sin red), para que el CI no necesite llaves de Clerk. Las suites unitaria y e2e ya demuestran que la verificación sin red funciona con tokens firmados en local. Lo que no prueban es el comportamiento de una instancia real de Clerk; eso se comprobó a mano el 2026-10-17 (ver "Comprobado contra Clerk real").

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
- Se pueden añadir datos al token de sesión (por ejemplo el rol) desde el panel, en *Configure → Sessions → Customize session token*. El límite es 1,2 KB. Para los metadatos públicos del usuario, el claim es `{ "metadata": "{{user.public_metadata}}" }`. Funcionó en la instancia de desarrollo y el editor no lleva la etiqueta *Pro*; no se confirmó que el plan gratis lo incluya en producción.

**Invitaciones**
- `POST /v1/invitations` (límite de 100 por hora) acepta `emailAddress`, `redirectUrl` y `publicMetadata`. Clerk envía el correo con un enlace único. El correo del invitado queda verificado y la invitación vence al mes. Se pueden revocar.
- En la instancia de desarrollo, el `publicMetadata` de la invitación pasa al usuario cuando la acepta. No se confirmó que el plan gratis incluya las invitaciones en producción.
- El correo de la invitación llega **en inglés** ("Your invitation", plantilla por defecto de Clerk). El plan gratis no deja personalizar las plantillas de correo, así que los emisores lo recibirían así.
- `inviteIssuer` pasa `redirectUrl` a `/emisor/aceptar-invitacion` cuando está configurada `WEB_APP_URL`. En producción esta variable debe ser una URL válida del front; en otros entornos, si falta, la invitación se crea sin `redirectUrl`. `WEB_APP_URL` es el origen del front y es independiente de `CORS_ORIGIN`, que la API usa para validar el origen de la sesión.
- `createInvitation` sin `ignoreExisting` falla si el correo ya tiene una invitación o una cuenta; hoy se vería como un 500. TA-21 debe decidir qué hacer.
- Una invitación **no impide** que alguien se registre por su cuenta. Para eso hace falta el modo "solo por invitación" en el panel. No se confirmó que esté en el plan gratis.

**Bloqueo**
- `banUser()` revoca sus sesiones y le impide volver a entrar, pero el plan gratis lo excluye. `lockUser()` bloquea solo hasta que pasa un tiempo (por defecto 1 hora). No se confirmó si está en el plan gratis.

## Comprobado contra Clerk real

Prueba manual del 2026-10-17 en una instancia de **desarrollo** de Clerk (tipo de aplicación *Consumer*, solo la API local en `localhost:3001` y una página desechable en `http://localhost:5173`, fuera del repositorio, que inicia sesión con Clerk y llama a `GET /me` con el token). Se pusieron `CLERK_SECRET_KEY` y `CLERK_PUBLISHABLE_KEY`, y `CORS_ORIGIN=http://localhost:5173`. Según las instrucciones dadas, no se puso `CLERK_JWT_KEY`, así que la verificación fue con la llave secreta (no se comprobó el `.env`).

| Comprobación | Resultado |
| --- | --- |
| Claim `metadata` con los metadatos públicos del usuario, en el token | Funciona. El token real trae `metadata.role` |
| Verificar un token real con `CLERK_SECRET_KEY` | Funciona |
| `azp` del token contra `CORS_ORIGIN`, y la petición con `Authorization` desde el navegador | Funciona, sin problemas de CORS |
| Usuario con `{ "role": "admin" }` | `200 { "role": "admin", "issuer": null }` |
| Usuario con `{ "role": "issuer", "issuerId": "<uuid de una entidad>" }` | `200` con `id`, `name`, `certificateTypes`, `nit` y `city` de la entidad, sin correo, teléfono, contacto ni registro del Ministerio |
| Entidad con `revoked_at` marcado y la misma sesión de Clerk | `403` con `code: "issuer-revoked"` |
| Token inválido con llaves configuradas | `401` |
| Invitación creada con `AccountsService.inviteIssuer(issuerId, correo)` | Funciona: Clerk envía el correo (en inglés) |
| Aceptar esa invitación y entrar con el usuario nuevo | El usuario queda con `role` e `issuerId` de la invitación y `GET /me` responde `200` con la entidad |

Una rareza de la prueba: la primera vez que se pulsó *Accept invitation*, el portal mostró "You are signed in" y **no se creó el usuario**; ingresar con ese correo daba "Couldn't find your account". Después se completó la aceptación y funcionó. La causa probable, sin confirmar, es que ya había una sesión abierta en el portal de Clerk. Conviene decirles a los emisores que abran el enlace sin otra sesión de Clerk iniciada.

Quedó **sin comprobar**:
- Que el plan gratis incluya las invitaciones en producción (la prueba fue en desarrollo).
- El modo solo por invitación, para cerrar el registro libre. En la instancia de prueba el registro sigue abierto.
- Entrar con Google: viene encendido por defecto en la instancia y hay que apagarlo en *Configure → User & authentication → SSO connections*. Si alguien entra con Google, Clerk puede crear un usuario sin rol y la API le responde 403.
- Un token real con `CLERK_JWT_KEY` (verificación sin red).
- Un fallo real de Clerk (503): solo lo cubren las pruebas unitarias.
- Que el plan gratis incluya el claim personalizado en producción (la prueba fue en desarrollo).

## Cómo responde la API hoy

Lo que hace el código, comprobado con las pruebas unitarias y e2e, y en parte con la prueba contra Clerk real de arriba.

- **401:** no hay token, o el token es malo (vencido, mal firmado, de un origen no autorizado o sin usuario).
- **503:** la verificación no puede hacerse. Es el caso de una llave mal configurada, de Clerk inalcanzable o de que Clerk rechace la llave secreta. Responde `El servicio no está disponible.` y no expone detalles.
- **Sin llaves configuradas** (ni `CLERK_JWT_KEY` ni `CLERK_SECRET_KEY`): una petición sin token recibe 401 y una petición con token recibe 503. Solo se permite fuera de producción.
- **Producción:** `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` y `CORS_ORIGIN` son obligatorias, pero solo cuando `NODE_ENV=production`. Si falta alguna, la API no arranca. `CLERK_JWT_KEY` sigue siendo opcional.
- `CLERK_PUBLISHABLE_KEY` se exige en producción, pero la API todavía no la lee. La van a necesitar el front y TA-21.
- Con `CLERK_SECRET_KEY` y sin `CLERK_JWT_KEY`, si Clerk se cae, cada petición espera unos segundos (el reintento con espera de Clerk) antes de responder 503.

## Ingreso del emisor en el front (TA-26)

Lo que hace el código, comprobado con pruebas de Vitest que simulan `@clerk/react` y la API. **No se comprobó contra una instancia real de Clerk**: falta (1) que `signIn.status` ya sea `complete` justo después de `signIn.password(...)`, y (2) que el motivo del cierre de sesión sobreviva a un `signOut()` real.

- **SDK:** `@clerk/react` 6.17.8. `ClerkProvider` se monta bajo `/emisor/*` y `/admin/*` (`AuthLayout`); la consulta pública no depende de Clerk. Sin `VITE_CLERK_PUBLISHABLE_KEY` (pública, se fija al construir el front), `/emisor/*` y `/admin/*` muestran "El ingreso no está configurado".
- **Ingreso:** formulario propio con `useSignIn` (la API de señales: `signIn.password` y `signIn.finalize`). Credenciales rechazadas solo se reconocen por los códigos `form_identifier_not_found` y `form_password_incorrect`; cualquier otro fallo muestra un mensaje genérico, nunca el texto de Clerk.
- **Sesión:** el rol y la entidad salen de `GET /me`, no de los metadatos de Clerk. El token se envía con `Authorization: Bearer` por el cliente de TA-25 (`setTokenProvider`). El front ya no tiene modo de demostración para el emisor.
- **Cierre de sesión por la API:** `unauthorized` (sesión vencida) y `entity-revoked` en cualquier consulta o mutación cierran la sesión de Clerk, vacían la caché y llevan a `/emisor/ingresar` con el motivo (`expired`, `revoked`, `no-role` o `not-issuer`). Que la API esté dormida o sin red (`unavailable`) no cierra la sesión.
- **`forbidden`:** `mapApiError` convierte un 403 sin `code` en `forbidden`; `unauthorized` queda solo para el 401. Emitir convierte `forbidden` en "tipo no permitido".
- **Origen del token:** el `azp` del token es el origen del front, y la API lo compara con `CORS_ORIGIN`, que debe incluir `http://localhost:5173` y `https://habilitapp-web.onrender.com`.

## Aceptar la invitación del emisor (TA-30)

El emisor abre el enlace del correo de Clerk en `/emisor/aceptar-invitacion`, crea y confirma su contraseña en una pantalla propia de HabilitApp, y al completar el registro llega al panel `/emisor` (que abre el listado `/emisor/certificados`) con la sesión de Clerk ya iniciada. No pasa por `/emisor/ingresar`. Si ya hay una sesión de Clerk abierta en el navegador, la pantalla pide cerrarla antes de continuar con el mismo enlace. Los errores de Clerk no se muestran literalmente.

| Comprobación contra Clerk real (desarrollo, 2026-10-18) | Resultado |
| --- | --- |
| Redirección y enlace | Clerk acepta `redirectUrl` local a `/emisor/aceptar-invitacion`; el enlace incluye `__clerk_status=sign_up` y `__clerk_ticket`. |
| Creación de la cuenta | Confirmado: `signUp.create({ strategy: 'ticket', ticket, password })` en una llamada. Devuelve `status: "complete"`, sin campos pendientes; después `signUp.finalize()` abre la sesión. El correo viene del ticket; Clerk pidió correo y contraseña, sin nombre ni apellido. |
| Sesión existente y doble envío | Con sesión abierta, Clerk mostró `signedIn: true`; un segundo `create` devolvió `session_exists`. Dos envíos seguidos también dieron `session_exists`. La pantalla evita el envío si ya hay sesión y bloquea el botón mientras procesa. |
| Enlace usado | Confirmado: error `invitation_already_accepted`. |
| Ticket alterado | Confirmado: error `ticket_invalid_code`. |
| Lugar al terminar y acceso a la entidad | La prueba directa confirmó `GET /me` con `role: "issuer"` y la entidad de la invitación. La prueba completa desde la pantalla del front, el listado de certificados y el ingreso posterior siguen pendientes. |

Los errores se identifican en `error.errors[].code`; el `error.code` de nivel superior era `api_response_error`. La interfaz trata como enlace inválido la ausencia de ticket y los códigos observados `invitation_already_accepted` y `ticket_invalid_code`. Los códigos candidatos de rechazo de contraseña (`form_password_length_too_short`, `form_password_pwned`, `form_password_not_strong_enough`, `form_password_validation_failed`) se tomaron de memoria y **no se comprobaron** contra Clerk; vencimiento y revocación de invitaciones tampoco se probaron. Esos casos, el comportamiento en el plan gratis de producción y la prueba real completa con capturas de escritorio y 390 px siguen sin verificar.

**Pendiente para staging:** configurar `WEB_APP_URL` en Render con el origen del front y permitir ese origen en la configuración de Clerk. No se cambió ninguno de esos servicios como parte de TA-30.

## Ingreso del administrador en el front (TA-27)

**Administrador en el front.** `AdminSessionGate` (en `apps/web/src/features/admin/auth/`) usa la misma sesión de Clerk que el emisor: manda el token, lee `GET /me` y exige `role: 'admin'`. El nombre y el correo del panel salen del usuario de Clerk (el correo si no tiene nombre). Los motivos de cierre de sesión son `expired`, `no-role` y `not-admin`. Comparte con el emisor `features/auth/` (cierre de sesión, hooks y `AuthLayout`). Un emisor con sesión que abre `/admin/*` termina con `not-admin`, y un administrador que abre `/emisor/*` termina con `not-issuer`.

**Registrar un emisor** envía la invitación de Clerk dentro de la misma operación: si la invitación falla, la API deshace el registro (409 si el correo ya tiene cuenta o invitación, 503 si Clerk falla). Por eso el front dice que la entidad podrá emitir cuando acepte la invitación.

**Pendiente de comprobar contra Clerk real, para el administrador:** que `signIn.status` sea `complete` justo después de `signIn.password()`, que el motivo sobreviva a `signOut({ redirectUrl })`, y que el token de un administrador traiga el claim `metadata` con `role: "admin"` en la misma instancia.

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
