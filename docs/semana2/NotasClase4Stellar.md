# Notas de clase 4 — Stellar

## Stellar: Red, Propósito y Fundación

- Stellar nació en 2014, fundada por Jed McCaleb (cofundador de Ripple) y Joyce Kim
  - Pregunta central: ¿por qué mover valor entre países requiere tantos intermediarios?
  - Arrancó desde el código de Ripple; relanzada en 2015 con el Stellar Consensus Protocol (SCP)
- Misión: mover valor rápido y barato, tanto para personas como para instituciones
- Organización detrás: Stellar Development Foundation (SDF), sin fines de lucro, sin accionistas
  - Mantiene el software, herramientas (SDK, CLI, Stellar Lab) y la testnet
  - No dirige la red: los validadores operan y votan las decisiones
- Ejemplo histórico: en 2019 los validadores votaron eliminar la emisión anual del 1% de Lumens, y se detuvo

---

## Stellar vs. Bitcoin y Ethereum: Tiempos, Costos y Capacidad

- Tiempo de confirmación y finalidad ocurren juntos en Stellar: ~5 segundos por bloque
  - Bitcoin: bloque cada 10 min, pago grande firme tras ~6 bloques (~1 hora)
  - Ethereum: turno cada 12 segundos
- Costo por transacción: 100 stroops (una cienmilésima de Lumen, ~$0.00001)
  - Mediana real al 28 de septiembre de 2026: 300 stroops, fracción de centavo
  - Hacen falta cientos de miles de pagos para gastar $1 en comisiones
- Capacidad: 1000 operaciones por bloque / 5 segundos = ~200 operaciones por segundo
  - Contratos inteligentes: límite propio de 2000 transacciones por bloque
  - Uso real al 28 de septiembre de 2026: mediana de ~41 TPS; bloques al 20% de ocupación
  - Para un MVP con decenas o cientos de usuarios, la red nunca será el límite

---

## Stellar Consensus Protocol: Votación Federada y Quórum

- Mecanismo diseñado por David Mazières (Stanford): Federated Byzantine Agreement (FBA)
  - Cada participante elige en quién confía (conjunto de quórum), sin lista cerrada global
  - Proceso: votar → aceptar → confirmar; sin resolver acertijo ni dejar depósito
- Ejemplo de los 5 vecinos (Ana, Beto, Carla, Diego, Elena)
  - Cada uno lista 3 personas de confianza; regla: creer cuando ≥2 de su lista confirman
  - Nadie coordina; el acuerdo emerge de las listas superpuestas
- Riesgo de diseño: si dos grupos no se cruzan, pueden confirmar versiones contradictorias
  - La red prefiere frenarse antes que dividirse en dos registros distintos
- Propiedades resultantes:
  - Rápida: solo toma tiempo el intercambio de mensajes entre validadores
  - Sostenible: sin competencia energética ni depósito de 32 ETH; validador corre en servidor común
  - La comisión no va a los validadores: se acumula en un fondo de la red

---

## Usos de Stellar y el Rol de los Anchors

- Cuatro usos principales hoy:
  1. Pagos y remesas (ej. MoneyGram integrado con Stellar)
  2. Ayuda humanitaria (UNHCR, IRC envían USDC directo a billeteras)
  3. Activos del mundo real: bonos tokenizados (ej. Etherfuse con CETES en México); DTCC anunció interés en tokenizar activos sobre Stellar
  4. Cuentas en dólares/euros con stablecoins (USDC, EURC) sin cuenta bancaria
- Patrón común: partes que no comparten registro, intermediario que cobra y demora
- Cómo entra y sale el dinero real (caso Doña Rosa):
  - Comprador transfiere pesos a un anchor → anchor entrega USDC en la red (on-ramp)
  - Doña Rosa devuelve USDC al anchor → anchor transfiere pesos a su banco (off-ramp)
- Anchor: empresa con cuenta bancaria y cuenta en la red; hace de puente entre mundos
- Riesgo del anchor: si el respaldo falla (ej. Silicon Valley Bank 2023), el token pierde valor aunque la red funcione perfectamente
- Protocolos de comunicación estandarizados (SEP):
  - SEP-10: verifica que quien escribe es dueño de la cuenta
  - SEP-12: verifica identidad de la persona (KYC)
  - SEP-24: billetera abre ventana del anchor para completar la operación

---

## Stellar Stack: Las 5 Capas Técnicas

- Capa 1: Aplicaciones nativas (billeteras, exploradores, anchors) — lo que el usuario ve
- Capa 2: Herramientas de desarrollo
  - SDK: paquete JavaScript/TypeScript para armar y enviar transacciones
  - Stellar CLI: terminal para crear cuentas, publicar contratos, hacer pruebas
  - Stellar Lab: interfaz web para explorar la red y armar transacciones sin código
- Capa 3: Acceso a datos (la “ventanilla”)
  - Hoy: Stellar RPC (recomendado para nuevos proyectos)
  - Antes: Horizon (aún funciona pero sin nuevas funciones)
- Capa 4: Stellar Core — programa de cada nodo; guarda copia del registro, revisa y valida
- Capa 5: Redes
  - Mainnet: red real, dinero real; no se usa en este programa
  - Testnet: gratuita, reiniciable, nada es permanente; aquí se construye todo el bootcamp
  - Futurenet: pruebas de funciones nuevas antes de llegar a mainnet
- Paso a mainnet: el servidor de acceso (RPC) es gratis en testnet pero de pago en mainnet; requiere contratar servicio o montar servidor propio

---

## El Lumen: Suministro, Distribución y Usos

- Creados en 2014: 100,000 millones de Lumens
  - 2014–2019: emisión anual del 1% (~5,400 millones adicionales)
  - Octubre 2019: validadores votan eliminar la emisión
  - Noviembre 2019: SDF quema 55,400 millones enviándolos a cuenta sin llave
  - Total actual fijo: 50,000 millones; no se pueden crear más
- Distribución (datos julio 2026):
  - ~34,200 millones (~68%): en circulación, manos independientes
  - ~15,600 millones (~31%): bajo mandato del SDF para operar y financiar el ecosistema
  - ~260 millones: reserva del relanzamiento 2015
  - ~10 millones: fondo de comisiones acumuladas
- Usos del Lumen en la red:
  - Comisión de transacción (100 stroops mínimo)
  - Reserva mínima de cuenta (ver sección siguiente)
  - Renta por datos en contratos inteligentes
- El Lumen no tiene emisor: lo crearon las reglas de la red, no una empresa

---

## Cuentas en Stellar: Creación, Reservas y Firmantes

- Dirección ≠ cuenta
  - Dirección: cadena que empieza con G, generada por el celular (256 bits, colisión despreciable)
  - Cuenta: existe solo cuando alguien la financia con un primer depósito en la red
  - En testnet: FriendBot crea la cuenta con saldo de prueba
- Reserva mínima: saldo en Lumens que no se puede gastar (como depósito de arriendo)
  - Reserva base actual: 0.5 Lumens
  - Toda cuenta necesita mínimo 2 reservas base = 1 Lumen
  - Cada elemento adicional suma 0.5 Lumens: Trustlines, ofertas, firmantes adicionales, datos
  - Ejemplo cooperativa: 2 base + 3 firmantes + 1 Trustline USDC = 3 Lumens (~2,200 COP)
- Trustline: paso explícito en que una cuenta acepta recibir un activo específico
  - Necesaria para cualquier activo que no sea Lumen
- Reserva patrocinada: la aplicación puede cubrir la reserva del usuario → Doña Rosa usa el producto sin tocar un Lumen
- Llaves y frase de recuperación:
  - Llave privada (empieza con S): nunca se comparte, autoriza todo
  - Llave pública (empieza con G): se comparte libremente
  - Frase de 12–24 palabras: otra forma de la llave privada; permite recuperar la cuenta en otro dispositivo
- Multifirma con pesos y umbrales (ejemplo cooperativa):
  - Gerente: peso 2 / Tesorera: peso 1 / Contadora: peso 1
  - Umbral para pagos: 3 (nadie puede mover dinero solo, ni el gerente)
  - Umbral para cambiar firmantes: 4 (los 3 deben firmar)
- Cuenta G vs. cuenta C:
  - Cuenta G: reglas fijas en el protocolo, firmantes con pesos
  - Cuenta C: contrato inteligente, reglas programables (huella, límite de monto, recuperación)

---

## Entregables, Mentorías y Próximos Pasos

- Entregable 1: pendiente de feedback; se entrega inicio de la semana próxima
- Entregable 2: disponible; link enviado en el chat
- Mentorías disponibles mañana de 8:00 a 13:00 (algunos espacios ya tomados)
- Puntos de red: se vencen mañana, no olvidar registrarlos
- Próxima sesión: habrá invitados especiales para sesión de código en vivo
  - Necesario tener computador disponible
  - Se verá el SDK y la CLI en funcionamiento
- Recomendación para el blueprint: documentar quién financiará el primer Lumen de cada cuenta y cómo se gestionará el paso de testnet a mainnet
- Opciones de custodia a considerar en el producto:
  1. Autocustodia con frase de recuperación
  2. App como guardián (custodia delegada)
  3. Multifirma con pesos y umbrales
  4. Cuenta C con autenticación biométrica
- Límites de la red a respetar en diagramas: todo lo que se escribe es público, permanente e inmutable; no incluir datos personales (foto, nombre, teléfono) en la red
