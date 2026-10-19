# Entregable 4: MVP funcional

**Proyecto:** HabilitApp
**Repositorio:** [blockchain-builders-101](https://github.com/dfvallejosc/blockchain-builders-101)

---

## 1. Aprendizajes y ajustes priorizados

Lecciones de las cuatro semanas, del Problem Brief al MVP, ordenadas por impacto y esfuerzo.

**Aprendizajes**

- Elegir al emisor pequeño nos dio un producto acotado y de bajo riesgo legal, porque en la red solo van huellas.
- Construir el front con datos de ejemplo permitió validar el recorrido antes de tener API, pero obligó a reemplazarlos después.
- La arquitectura del Blueprint cambió al construir: la base quedó en Render y no en Neon, la autenticación en Clerk, y como front y API son sitios distintos para el navegador no usamos cookies.
- Elegimos contrato propio. Conectarlo reveló fallas que solo aparecen en testnet: el cliente no decodificaba el veredicto, y lo que nadie renueva se archiva. Ahora cada escritura renueva su tiempo de vida.
- Si la red falla, se rechaza la operación y se aceptan dos desfases menores con PostgreSQL, sin proceso de limpieza.
- La consulta pública depende de PostgreSQL, porque la sal vive ahí. Choca con la promesa del Problem Brief de verificar sin depender de un tercero.

Los ajustes que teníamos previstos antes del cierre ya están hechos. Esto es lo que queda pendiente.

**Pendiente (alto impacto, más esfuerzo)**

- Custodia: módulo de seguridad, administrador multifirma, rotación de la llave maestra y firma directa del emisor.
- Una verificación que no dependa de PostgreSQL.

**Pendiente (menor impacto)**

- Historias que no alcanzamos: el motivo por el que un certificado no es válido (HU-13), los certificados emitidos por entidad cada mes (HU-16), los certificados de un trabajador registrado (HU-18), la vista del trabajador con todos sus certificados (HU-19) y el envío del certificado por mensaje o correo (HU-20).
- Renovación programada del tiempo de vida de los registros en la red.

---

## 2. Riesgos y pendientes

**Riesgos que aceptamos para el cierre**

- **Custodia delegada de llaves.** HabilitApp firma por cada emisor con una cuenta derivada de un secreto maestro. Seguimos siendo un intermediario de confianza y ese secreto es un punto único de falla. No hay rotación: cambiarlo rompería la asociación con lo ya emitido.
- **La consulta pública depende de PostgreSQL.** Sin la sal no se puede recalcular la huella, así que si la base cae, no se puede verificar. Contradice la promesa del Problem Brief de verificar sin depender de un tercero.
- **Desfases entre la red y la base.** Pueden quedar huellas huérfanas en la red o estados que difieren por un momento. No hay proceso de limpieza.
- **Contrato en testnet.** El administrador no se puede rotar, testnet se reinicia y no hay renovación programada del tiempo de vida de los registros. Volver a autorizar a un emisor revocado hace que sus certificados vigentes se vean válidos otra vez.
- **Errores de red poco precisos.** Algunos fallos del contrato llegan como errores genéricos, y las llamadas a la red corren dentro de la transacción de la base.
- **Datos de los trabajadores.** Viven en PostgreSQL y son sensibles (Ley 1581 de 2012). En la red solo van huellas.
- **Mercado de dos lados.** Sin constructoras que exijan la verificación, los emisores no tienen razón para sumarse.

**Pendientes de infraestructura**

- La API gratuita se duerme y la primera petición tarda.

**Pendientes del producto**

- Historias sin construir: el motivo por el que un certificado no es válido (HU-13), los conteos mensuales por entidad (HU-16), los certificados de un trabajador (HU-18), la vista del trabajador (HU-19) y el envío por mensaje o correo (HU-20).

---

## 3. Plan de validación con usuarios

Por ahora no vamos a probar con emisores ni coordinadores reales. Validaremos con personas ajenas al rubro, a quienes les explicaremos en pocas palabras qué es la plataforma, y con un recorrido interno del equipo. Esto comprueba si el producto se entiende y se puede usar, no si el mercado lo adoptará.

**Hipótesis críticas**

| Creemos que | Porque | Lo sabremos si |
| --- | --- | --- |
| Quien hace de emisor puede entrar a su cuenta desde la invitación | Sin cuenta propia no se sabe quién emitió cada certificado | 4 de 5 personas abren el correo de invitación, crean su contraseña e inician sesión sin ayuda |
| Quien hace de emisor puede registrar a un trabajador y emitirle un certificado con QR | Sin emisión no hay nada que consultar | 4 de 5 personas registran un trabajador y completan los cuatro pasos de la emisión sin ayuda |
| Quien hace de coordinador entiende el estado del certificado al escanear el QR | Decide el ingreso según ese veredicto | 4 de 5 personas dicen qué harían con cada estado: Habilitado, Vencido, No válido y Anulado |
| La verificación es rápida | La meta del MVP es menos de 10 segundos | 4 de 5 personas dan el veredicto en menos de 10 segundos desde que abren el QR |

Fijamos los umbrales antes de las pruebas. Con 4 o 5 de 5, la hipótesis es cierta. Con 3, no es concluyente: ajustamos y repetimos con otras 5 personas. Con 2 o menos, hace falta un cambio importante.

**Prueba de usabilidad con 5 personas**

Cada sesión tiene cuatro momentos: una bienvenida breve con el contexto de la plataforma, un escenario en vez de instrucciones ("eres un consultorio al que HabilitApp acaba de invitar y un trabajador acaba de aprobar su curso", "eres coordinador y un trabajador te muestra este QR"), pensar en voz alta, y tres preguntas finales (qué fue lo más fácil, lo más confuso y qué esperaban). Observamos sin guiar. Anotamos cada fricción (no lo encontró, se equivocó, dudó, no entendió un mensaje o abandonó) con qué hizo, qué dijo, en qué paso y qué significa. Medimos si completó el flujo, en qué paso se detuvo y cuánto tardó, además de las transacciones confirmadas y fallidas.

**Recorrido interno**

El equipo recorre el flujo como si fuera el usuario. En cada paso se pregunta si sabe qué quiere lograr, si sabe cómo hacerlo, si entiende la acción y si ve que avanzó. Un "no" es una fricción por revisar.

**Qué haremos con los resultados**

Agrupamos las fricciones parecidas y las ordenamos por impacto y esfuerzo: lo de alto impacto y poco esfuerzo se arregla de inmediato.

**Límite**

Personas ajenas al rubro no viven el problema real. No comprobamos que los emisores usarían HabilitApp ni que las constructoras exigirían la verificación. Esas hipótesis las probaremos más adelante con emisores y coordinadores reales.

---

## Evidencia verificable

| Qué | Enlace |
| --- | --- |
| Producto en línea (front) | <https://habilitapp-web.onrender.com> |
| API en línea | <https://habilitapp-api.onrender.com/health> |
| Repositorio | <https://github.com/dfvallejosc/blockchain-builders-101> |
| Contrato `certificate-registry` en testnet | [CAPRNQ7L…D3GPD en Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAPRNQ7LVZWH47D4ZBDKY2OUICZ5FULE223IRWTOJR3HLR6ZEBAD3GPD) |
| Video (máximo 3 minutos) | <https://youtu.be/Fxi_GvJxtgw> |
| Transacciones del flujo final (emitir y anular por la API) | Pendiente: enlaces de Stellar Expert |

**Acceso para probar el producto.** La consulta pública (`/c/:id`) no necesita cuenta. Para entrar como administrador o como emisor, podemos darles acceso: escríbannos por WhatsApp o por correo y les enviamos una cuenta de prueba. Los datos de contacto están en la página del proyecto en Apex.

**Transacciones de prueba del contrato** (certificado de prueba, huella de un texto inventado):

| Paso | Transacción |
| --- | --- |
| Subir el código del contrato | [c7970c92…8772e](https://stellar.expert/explorer/testnet/tx/c7970c92732d2d4e4ba6c87422f98e331d4e55430441ca0ae5ab0f6332e8772e) |
| Crear el contrato con su administrador | [24b8cdd1…e2dd](https://stellar.expert/explorer/testnet/tx/24b8cdd1c81eb792a12a8eaf39ae73d024635b5553b013954aef4b720d80e2dd) |
| `authorize_issuer` | [e2c555c3…faf2](https://stellar.expert/explorer/testnet/tx/e2c555c3ade7cc918c24f85b23daae2a00e331357c33ea88855fc26f7b29faf2) |
| `register` | [ff971746…cf78](https://stellar.expert/explorer/testnet/tx/ff9717464363be834322be9f2f21df1319c6abfaea2f5a1f981f72b3fa3dcf78) |
| `annul` | [ace8a7c4…7d31](https://stellar.expert/explorer/testnet/tx/ace8a7c41227edd93e098646b41fde5ef9c9f81a3cde5f5645c0297d44fe7d31) |
| `revoke_issuer` | Pendiente: enlace de Stellar Expert |
