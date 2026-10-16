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

## Qué falta decidir

Varias decisiones de la sesión se tomaron pensando en Better Auth y **ya no valen**. Hay que volver a decidirlas con Clerk, de una en una. No las decidas solas:

- Cómo recibe el emisor su primer acceso (invitación por correo de Clerk o cuenta creada con contraseña).
- Dónde vive el vínculo cuenta ↔ emisor, ya que la tabla de usuarios es de Clerk.
- Qué puede hacer una entidad revocada. Bloquear usuarios (`banUser`) no está incluido en el plan gratis.
- Cómo viaja la sesión entre el front y la API. Con Clerk el token puede ir en el encabezado `Authorization`, y puede que el proxy de Render deje de hacer falta (por verificar).
- Cómo se crea el primer administrador.
- Cómo se cierra el registro libre, para que nadie se cree una cuenta por su cuenta.

## Lo que se sabe de Clerk

Comprobado en su documentación el 2026-10-16. Lo que la documentación no confirmó está marcado.

**Plan gratis (Hobby)**
- Hasta 50.000 usuarios retenidos al mes por aplicación. Un usuario cuenta solo si vuelve al menos 24 horas después de registrarse. El skill de backend del equipo decía 10k y estaba desactualizado. Pasado ese límite hay un mes de gracia para pagar.
- **No incluye:** bloqueo de usuarios (`ban`), requisitos de contraseña personalizados, plantillas de correo personalizadas, MFA, quitar la marca de Clerk, passkeys ni códigos por SMS.
- Las sesiones duran 7 días y no se pueden cambiar.
- Los roles personalizados de organización exigen un complemento de pago. No se usarían organizaciones.
- Hasta 3 puestos en el panel de Clerk.

**Verificar el token en nuestra API**
- `@clerk/backend` ofrece `authenticateRequest()`, que puede verificar sin red si se le pasa `jwtKey` (la clave pública) junto con `publishableKey`. `authorizedParties` debe listar los orígenes permitidos, o queda abierto a CSRF.
- Entre orígenes distintos, el token llega por el encabezado `Authorization`. En el mismo origen llega por la cookie `__session`.
- La documentación no confirmó la firma de `verifyToken`. Se comprueba al instalar.
- Se pueden añadir datos al token de sesión (por ejemplo el rol) desde el panel, en Sessions. El límite es 1,2 KB. No se confirmó que esté en el plan gratis ni la sintaxis para metadatos públicos.

**Invitaciones**
- `POST /v1/invitations` (límite de 100 por hora) acepta `emailAddress`, `redirectUrl` y `publicMetadata`. Clerk envía el correo con un enlace único. El correo del invitado queda verificado y la invitación vence al mes. Se pueden revocar.
- No se confirmó que las invitaciones estén en el plan gratis, ni que el `publicMetadata` de la invitación pase al usuario.
- Una invitación **no impide** que alguien se registre por su cuenta. Para eso hace falta el modo "solo por invitación" en el panel. No se confirmó que esté en el plan gratis.

**Bloqueo**
- `banUser()` revoca sus sesiones y le impide volver a entrar, pero el plan gratis lo excluye. `lockUser()` bloquea solo hasta que pasa un tiempo (por defecto 1 hora). No se confirmó si está en el plan gratis.

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
