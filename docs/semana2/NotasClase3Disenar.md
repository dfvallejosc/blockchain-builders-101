# Notas de clase 3 — Diseñar

## Contexto General

- Sesión 3 del bootcamp, módulo 2: Diseñar
- Temas: Lean Canvas, propuesta de valor, usuario, flujo, historias de usuario, MVP, backlog, Kanban y wallets en Stellar
- Entregable de la semana: Product Blueprint (Lean Canvas + historias de usuario + MVP definido)

---

## Lean Canvas

- Herramienta de 9 casillas que resume el modelo de negocio completo en una sola vista
- Casillas:
  1. Problema
  2. Solución
  3. Métricas clave
  4. Propuesta de valor única
  5. Ventaja especial
  6. Canales
  7. Segmento de clientes
  8. Estructura de costos
  9. Flujo de ingresos
- Problema y segmento de clientes se pueden copiar directamente del Problem Brief
- No tiene que quedar perfecto hoy; hay toda la semana para completarlo
- Hoy se llena la parte de producto: propuesta de valor, solución y alcance del MVP; el jueves se cubre arquitectura

---

## Círculo de Oro y Propuesta de Valor

- Círculo de oro: orden correcto es de adentro hacia afuera: porqué → cómo → qué
  - Porqué: el problema real que le importa a una persona concreta
  - Cómo: la manera particular en que se resuelve (tecnología, proceso)
  - Qué: el producto concreto (app, contrato, etc.)
- Error más común: empezar por el qué (“vamos a hacer una plataforma con blockchain para trazabilidad”)
- Prueba: quitarle la tecnología a la frase; si queda una persona con un problema real, van bien
- Propuesta de valor responde 3 preguntas:
  - ¿Qué resultado obtiene la persona? (logro de la persona, no función de la app)
  - ¿Por qué elegiría este producto sobre lo que ya hace hoy?
  - ¿En qué punto exacto del recorrido cambia algo?
- Plantilla sugerida: “Para [usuario] que tiene [problema], nuestro producto es [solución] que logra [resultado], a diferencia de [arreglo actual]”

---

## Usuario y Flujo de Usuario

- El usuario es el mismo del Problem Brief; cambiarlo a esta altura complica las cosas
- Lo nuevo que se agrega: la tarea puntual que esa persona intenta resolver al usar el producto
  - Ejemplo: Doña Rosa no piensa en trazabilidad, piensa en cobrar lo que vale su café
  - Si la tarea solo la entiende otro desarrollador, falta simplificarla
- Plantilla de tarea: “Cuando [situación], [usuario] necesita [tarea] para poder [resultado]”
- Flujo de usuario: cómo recorre la persona el producto de principio a fin
  - Tiene 3 partes: entrada, pasos intermedios y salida
  - Entrada: dónde está la persona, qué tiene en la mano, qué sabe hacer
  - Pasos intermedios: secuencia numerada con verbo + rol en cada paso
  - Salida: debe coincidir con el resultado prometido en la propuesta de valor
- 4 pruebas para validar el flujo:
  1. Alguien externo puede seguirlo sin preguntar
  2. Cada paso tiene verbo y rol claro
  3. No aparecen palabras técnicas
  4. Solo describe el camino principal (los casos de fallo se anotan aparte)

---

## Historias de Usuario

- Formato: “Como [rol], quiero [acción], para [beneficio]”
- Rol: nunca escribir “usuario”; cada rol quiere cosas distintas
- Acción: concreta y verificable (no “quiero que sea rápido”; sí “quiero ver la fecha y lugar del registro”)
- Beneficio: conecta con la propuesta de valor; sin él la historia es una funcionalidad sin justificación
- Errores comunes:
  - Usar “usuario” como rol
  - Acción que describe cómo se construye, no lo que la persona quiere hacer
  - Mezclar varias acciones en una sola historia (prueba: buscar la palabra “y”)
  - Beneficio que repite la acción en lugar de justificarla
- Entregable individual: escribir entre 5 y 7 historias de usuario, ordenadas de más a menos relevante, con justificación del orden

---

## MVP y Priorización de Funcionalidades

- MVP: lo más pequeño que sí resuelve el problema de principio a fin
  - Mínimo: pocas cosas, pero bien hechas; una que funcione completa vale más que 5 a medias
  - Viable: entrega el resultado prometido en la propuesta de valor; una persona real podría usarlo
- Prueba: ¿Doña Rosa podría lograr lo que quiere con este MVP mañana?
- Clasificación de funcionalidades con método MoSCoW simplificado:
  - Imprescindible: sin esto no hay MVP
  - Debería: importante, pero se puede sacrificar si el tiempo aprieta
  - Podría: deseable, entra solo si sobra tiempo
  - Queda afuera: buena idea, pero no abarcable en estas semanas
- Estos niveles miden cuándo, no qué tan buena es la idea

---

## Backlog y Tablero Kanban en GitHub Projects

- Backlog: lista completa de todo lo que el producto necesita, ordenada por prioridad (imprescindible arriba, queda afuera abajo)
  - Se actualiza semana a semana
  - Cada ítem debe justificarse (de dónde salió, por qué es central o secundario)
- Kanban: tablero de 4 columnas en GitHub Projects dentro del mismo repositorio
  - Columnas: Por hacer → En curso → En revisión → Hecho
  - Cada historia se asigna a un miembro del equipo
  - La revisión de pares antes de marcar “done” es obligatoria
- Cómo crearlo: en el repositorio, pestaña Projects → New Project → plantilla de tablero

---

## Wallets en Stellar (Sesión Práctica)

- Repaso de conceptos: hash, bloques encadenados, métodos de consenso (proof of work vs. proof of stake vs. proof of agreement de Stellar)
- Llave privada (empieza con S): nunca compartir; da acceso total a los fondos
- Llave pública (empieza con G): se comparte libremente; es como el número de cuenta
- La wallet no guarda activos, solo la llave privada; los activos viven en la blockchain
- Wallet recomendada: Freighter (extensión de navegador)
  - Requiere contraseña local (no relacionada con blockchain) y frase de recuperación de 12 palabras
  - La cuenta necesita al menos 1 XLM para activarse en la red
- Trustline: firma necesaria para poder recibir tokens que no son XLM (ej. USDC)
  - Sin Trustline no se pueden recibir stablecoins
- Faucet de Circle (Stellar Testnet): permite recibir USDC de prueba
- Wallets con abstracción para Latinoamérica: Decaf y Meru (tarjetas Mastercard, PSE, sin necesidad de frase de recuperación manual)

---

## Recordatorios y Próximos Pasos

- Registrarse en Apex e invitar a todos los miembros del equipo al proyecto
- Linkear el repositorio de GitHub en Apex (poner la ruta, no la URL completa)
- Equipos ideales: 3 a 5 personas; quienes no tienen equipo deben coordinarse por WhatsApp
- Reto de redes de la semana ya fue enviado por Discord y WhatsApp (hora de entrega ajustada)
- Entregable 1 aún tiene tiempo para correcciones esta semana junto al entregable 2
- Aproximadamente 30 proyectos aprobados; número exacto se confirma el jueves
- Palabra clave de asistencia de hoy: “Doña Rosa” (también válido: “Rosa”, “Canvas”)
