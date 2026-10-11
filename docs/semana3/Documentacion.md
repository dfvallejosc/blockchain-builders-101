# Entregable 3: Functional Proof

**Proyecto:** HabilitApp
**Repositorio:** [blockchain-builders-101](https://github.com/dfvallejosc/blockchain-builders-101)

Esta semana construimos el front de HabilitApp con datos de ejemplo. Todavía no hay API conectada ni contratos: eso viene en la siguiente etapa.

---

## 1. Front construido

**Front hospedado:** <https://habilitapp-web.onrender.com>. Para probar el recorrido del emisor, entra en `/emisor/ingresar` con el correo `consultorio@lomasdelsur.co` y cualquier contraseña que no esté vacía. La consulta pública (`/c/:id`) no necesita cuenta.

El front vive en `apps/web` (React 19, Vite, Tailwind 4 y shadcn/ui). Se corre con `pnpm dev:web` y se abre en <http://localhost:5173>. Los datos son de ejemplo: salen de `apps/web/src/data/`, se guardan en `localStorage` y más adelante se cambian por la API. Por eso la sesión de demostración no comprueba la contraseña (basta con que no esté vacía) y solo exige que el correo sea el de una entidad de ejemplo, por ejemplo `consultorio@lomasdelsur.co`: el repositorio es público y no guarda credenciales.

El front sigue el [sistema de diseño](../DESIGN.md) del proyecto: colores, tipografía y radios salen de `tokens.css`, el estado de un certificado siempre se dice con ícono y palabra (Habilitado, Vencido, No válido, Anulado) y la interfaz está en español de Colombia, sin jerga de cadena de bloques. Los componentes compartidos están en `apps/web/src/components/ui/` y, en desarrollo, la ruta `/dev/components` los muestra con sus estados.

### Pantallas implementadas

| Ruta | Pantalla | Paso del flujo del Blueprint | Historia |
| --- | --- | --- | --- |
| `/` | Página de inicio con acceso a los dos ingresos | Entrada al producto | Apoyo |
| `/emisor/emitir` | Emisión en cuatro pasos: trabajador, datos del certificado, revisión y certificado emitido con su QR | Pasos 3, 4, 5 y 6: elegir o registrar al trabajador, escribir tipo, emisión y vigencia, revisar y confirmar | HU-01, HU-06 y HU-07 |
| `/emisor/certificados/:id/hoja` | Hoja imprimible del certificado, con el QR | Paso 7: entregar el certificado impreso | HU-01 |
| `/emisor/ingresar` | Ingreso del emisor con la cuenta de su entidad | Paso 2: el emisor entra con la cuenta de su entidad | HU-08 |
| `/emisor/trabajadores/nuevo` | Registro de un trabajador, con su autorización | Paso 3: registrar al trabajador | HU-06 |
| `/emisor/trabajadores` | Lista de trabajadores registrados por el emisor | Fuera del MVP (HU-17), adelantada | HU-17 |
| `/emisor/certificados` | Historial de certificados del emisor, con búsqueda, filtros y estado | Fuera del MVP (HU-11), adelantada | HU-11 |
| `/c/:id` | Consulta pública por QR, sin cuenta | Paso 9: el coordinador comprueba el certificado | HU-02 a HU-05 |

**Emisión (`/emisor/emitir`).** El emisor elige a un trabajador de su lista o lo registra con su autorización. Después escribe el tipo de certificado, la fecha de emisión y la vigencia, con validación de los campos y un resumen de errores. En el tercer paso revisa todo antes de confirmar, para no tener que anular por un error de digitación. Al confirmar ve una vista previa del certificado y su código QR. Si el trabajador ya tiene un certificado vigente del mismo tipo, la pantalla lo detecta.

**Ingreso y trabajadores.** El emisor entra con el correo y la contraseña de su entidad (en la demostración, con el correo de una entidad de ejemplo y cualquier contraseña no vacía). Al entrar llega directo a la emisión de certificados. Puede registrar un trabajador con su nombre, documento y autorización desde una pantalla propia, y ver la lista de los que ha registrado para encontrarlos rápido al emitir.

**Hoja del certificado.** Es una página pensada para papel, con el QR y los datos del certificado, lista para imprimir y entregar al trabajador.

**Consulta pública (`/c/:id`).** Es la pantalla del coordinador de SST, pensada para el celular. Al abrir el QR muestra un veredicto grande (Habilitado, Vencido, No válido o Anulado) y, debajo, el nombre y el documento del trabajador, la fecha hasta la que está vigente y la entidad que lo emitió con su estado de autorización. Nunca muestra resultados médicos, restricciones ni diagnósticos.

**Historial del emisor.** Lista los certificados emitidos con su estado, con búsqueda por texto y filtros por estado. Es una historia del grupo "debería" (HU-11) que quedó adelantada porque la base ya estaba. Lo mismo pasó con la lista de trabajadores (HU-17).

### Cómo se conectan con el MVP

Las pantallas cubren el recorrido principal del MVP: un consultorio emite un certificado con QR y un coordinador lo comprueba en el celular. El panel del emisor usa un menú lateral y una sesión por rol (`RequireSession`), y la consulta pública no necesita cuenta.

### Capturas

> **Pendiente:** agregar aquí las capturas de pantalla (escritorio y 390 px) de la emisión, la hoja, el historial y la consulta pública, o el enlace al front hospedado si lo hay.

---

## 2. Decisión técnica

**Opción elegida: A. Contrato propio.**

Vamos a escribir un contrato de Soroban para la lógica de HabilitApp. Esta semana no se escribe ni se despliega nada: solo dejamos decidido qué haría y por qué.

### Qué haría el contrato

Según el uso de Stellar del [Product Blueprint](../semana2/ProductBlueprint.md), el contrato registra tres cosas, siempre sin datos personales:

1. **La huella con sal de cada certificado** y su estado (vigente o anulado). Se escribe cuando el emisor confirma la emisión y cambia cuando anula.
2. **El estado de cada emisor** (autorizado o revocado). Lo cambia solo el administrador de HabilitApp.
3. **Las reglas de quién puede escribir:** solo una cuenta de emisor autorizado registra o anula certificados, y solo la cuenta de administración registra o revoca emisores.

La consulta pública lee ese estado para responder si el certificado es auténtico, está vigente y viene de una entidad autorizada. Los datos del trabajador siguen en PostgreSQL.

### Por qué hace falta uno propio

- **Las reglas las impone la red.** Que solo un emisor autorizado pueda registrar certificados, y que revocarlo cambie el estado de todos los suyos a la vez, es lo que sostiene el criterio de pertinencia del Problem Brief: ningún dueño único del registro. Si esas reglas viven solo en nuestro servidor, la confianza vuelve a quedar en nosotros.
- **El estado de un emisor y el de un certificado se relacionan.** Una herramienta que solo guarde un dato (como un memo) no sabe que el emisor fue revocado. Con un contrato, un certificado de un emisor revocado se lee como no válido sin tocar cada certificado.
- **Es lo que se vio en el programa** (Soroban en testnet), y es la ruta que definimos en el Blueprint.

### Qué descartamos

- **Opción B, solución existente del ecosistema.** No encontramos una herramienta que resuelva el registro curado de emisores con revocación. Usar solo transacciones normales con la huella en el memo prueba que un dato existió, pero no impone quién puede escribir ni refleja la revocación.
- **Plan de respaldo.** Si el contrato no llega a tiempo, el Blueprint ya prevé transacciones normales con la huella en el memo. Sigue siendo el respaldo, no la decisión.
- **Solo base de datos.** No cumple el Problem Brief: dejaría la confianza en un solo dueño.

Todo en testnet. Cómo se conecta la API con Stellar y cómo se custodian las llaves de los emisores siguen siendo decisiones abiertas del equipo.

---

## 3. Participación del equipo

| Integrante | Usuario de GitHub | Aporte en este entregable |
| --- | --- | --- |
| Diego Vallejos | [dfvallejosc](https://github.com/dfvallejosc) | Sistema de diseño y componentes compartidos, rutas y datos de ejemplo, pantalla de emisión, hoja imprimible, historial del emisor, consulta pública y página de inicio. |
| Andres Aguirre | [andres9602](https://github.com/andres9602) | Ingreso del emisor (#57), pantalla de registro de trabajador (#56) y lista de trabajadores del emisor (#58). Además, fusión de los pull requests #48, #49, #52, #54 y #55. |
| Luis Patino | [patinoaluise](https://github.com/patinoaluise) | No pudo aportar commits en este entregable por una causa de fuerza mayor. En la semana anterior fusionó los pull requests #32 y #33 (estructura base del proyecto y despliegue). |

---

## 4. Bloqueos y siguiente paso

**Qué quedó pendiente**

- El ingreso del administrador (`/admin/ingresar`) y todo el panel de administración (lista de emisores, registro y detalle) son marcadores de posición.
- Los datos son de ejemplo en el navegador: no hay API, base de datos ni sesión real. Falta decidir el proveedor de autenticación (Clerk o Better Auth).
- La red de Stellar no está conectada: el QR y la consulta funcionan con datos locales.
- Capturas de pantalla y, si se hospeda, el enlace al front.

**Siguiente paso hacia el MVP**

1. Escribir y desplegar el contrato de Soroban en testnet (opción A).
2. Definir cómo se conecta la API con Stellar y cómo se custodian las llaves de los emisores.
3. Construir la API en NestJS y cambiar los datos de ejemplo por llamadas reales.
4. Terminar el ingreso del administrador y el panel de administración para registrar emisores (o hacerlo con un script, como prevé el Blueprint).
