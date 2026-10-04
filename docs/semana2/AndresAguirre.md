# Historias de usuario individuales — Andrés Aguirre

## Mis historias de usuario

1. Como **emisor**, quiero entrar a HabilitApp con la cuenta de mi entidad, para emitir certificados a nombre de mi centro y que nadie más pueda hacerlo por mí.

   **Criterios de aceptación:**
   - [ ] El emisor puede iniciar sesión con las credenciales de su entidad.
   - [ ] Un emisor no puede acceder con credenciales de otra entidad.
   - [ ] Si las credenciales son incorrectas, se muestra un mensaje de error claro.
   - [ ] La sesión identifica al emisor y a su entidad en todas las acciones que realice.
   - [ ] Un emisor no registrado no puede acceder al sistema.

2. Como **emisor**, quiero revisar los datos del certificado antes de confirmar su emisión, para no tener que anularlo por un error de digitación.

   **Criterios de aceptación:**
   - [ ] Antes de emitir, se muestra una pantalla de resumen con todos los datos: nombre del trabajador, número de documento, tipo de certificado, fecha de emisión y fecha de vencimiento.
   - [ ] El emisor puede volver a editar los datos desde la pantalla de resumen.
   - [ ] La emisión solo ocurre cuando el emisor confirma explícitamente.
   - [ ] Los datos mostrados en el resumen coinciden exactamente con los que se registran en la red.

3. Como **coordinador de SST**, quiero ver si la entidad que emitió el certificado está autorizada, para estar seguro de que lo emitió alguien en quien puedo confiar.

   **Criterios de aceptación:**
   - [ ] Al escanear un QR, la página muestra si la entidad emisora está autorizada o revocada.
   - [ ] Si el emisor fue revocado, el estado se indica claramente y diferenciado de otros motivos de invalidez.
   - [ ] La información del emisor incluye el nombre de la entidad.
   - [ ] El estado del emisor se consulta en tiempo real desde la red.

4. Como **administrador de HabilitApp**, quiero ver la lista de emisores registrados con su estado, para saber cuáles están activos y cuáles fueron revocados.

   **Criterios de aceptación:**
   - [ ] El panel de administración muestra la lista de todos los emisores registrados.
   - [ ] Cada fila muestra el nombre de la entidad y su estado (activo o revocado).
   - [ ] El administrador puede acceder a las acciones de registrar y revocar emisores desde esta lista.
   - [ ] La lista refleja los cambios de estado inmediatamente después de registrar o revocar un emisor.

5. Como **emisor**, quiero ver los certificados de un trabajador registrado, para saber cuáles tiene vigentes y cuáles debo renovarle.

   **Criterios de aceptación:**
   - [ ] El emisor puede seleccionar un trabajador de su lista y ver los certificados que él le ha emitido.
   - [ ] Cada certificado muestra el tipo, la fecha de emisión, la fecha de vencimiento y el estado (vigente, vencido o anulado).
   - [ ] El emisor solo ve los certificados que él mismo emitió; no ve los de otros emisores.
   - [ ] Los certificados están ordenados de más reciente a más antiguo.

6. Como **trabajador**, quiero recibir mi certificado por mensaje o correo apenas el emisor lo emite, para llevarlo a la obra sin volver al consultorio.

   **Criterios de aceptación:**
   - [ ] Al confirmar la emisión, el sistema envía automáticamente el certificado al trabajador por correo o mensaje.
   - [ ] El envío incluye el QR del certificado.
   - [ ] El trabajador puede acceder al certificado desde el enlace recibido sin necesidad de crear una cuenta.
   - [ ] El emisor puede ver si el envío fue exitoso.

## La más importante y por qué

Las historias están ordenadas de mayor a menor importancia.

**1. Inicio de sesión del emisor con la cuenta de su entidad**
Es la base de toda la plataforma. Sin autenticación, no existe emisor, y sin emisor no se puede emitir ni consultar ningún certificado. Habilita todas las demás historias del rol emisor. Es el primer paso que desbloquea el flujo completo.

**2. Revisar los datos antes de confirmar la emisión**
Un certificado registrado en Stellar no se puede editar, solo anular. Un error de digitación obliga a anular el certificado ya emitido y volver a empezar. Una pantalla de resumen antes de confirmar evita ese trabajo y protege la integridad del registro desde el origen.

**3. Ver si el emisor está autorizado al escanear el QR**
Sin este dato, la verificación queda incompleta. Un certificado puede ser auténtico e irrespirable, pero si el coordinador no sabe si quien lo emitió está autorizado, no puede respaldar su decisión de ingreso. Es la columna vertebral de la confianza que le da sentido al sistema.

**4. Lista de emisores con su estado en el panel de administración**
Es la base del panel de administración: sin esta vista, el administrador no puede saber cuáles emisores están activos ni gestionar el registro curado. Desde aquí se registran y se revocan emisores, así que habilita todo el ciclo de control del sistema.

**5. Ver los certificados de un trabajador registrado**
Permite al emisor gestionar renovaciones por persona antes de que venzan. A diferencia del historial general, aquí la vista es por trabajador, lo que hace posible ofrecer la renovación de forma proactiva y mantener a los trabajadores al día sin esperar a que lleguen con el papel vencido.

**6. Recibir el certificado por mensaje o correo**
Mejora la experiencia del trabajador eliminando la vuelta al consultorio, pero el MVP funciona sin esto: el emisor puede enviarlo manualmente. Es deseable y reduce fricciones, pero no bloquea ningún paso del flujo principal.
