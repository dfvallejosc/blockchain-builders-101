# HabilitApp — Sistema de diseño (v1.1)

> **En este repositorio.** Este documento viene del paquete de diseño (mockup) y es la guía visual de todo el front. Las variables viven en `apps/web/src/styles/tokens.css` (se exponen a Tailwind como utilidades `ha-*`, por ejemplo `bg-ha-primary`) y los componentes, ya hechos en React, están en `apps/web/src/components/ui/`. En desarrollo, `/dev/components` los muestra con sus estados. Las menciones a `components.html`, `components.css` y sus clases (`.btn`, `.dt`, ...) se refieren al kit del mockup, que no está versionado: la referencia viva es el código de `components/ui/`. Cualquier valor nuevo se agrega primero a `tokens.css` y a este documento.


Paquete: `DESIGN.md` (este documento) · `tokens.css` (variables, claro y oscuro) · `components.css` (estilos de todos los componentes, fuente única) · `components.html` (kit con pestañas Claro / Oscuro, todos los componentes y sus estados) · `fonts/` (Public Sans e IBM Plex Mono, autoalojadas).

**v1.1:** chip **Revocado** para entidades; texto de confirmación configurable en el diálogo destructivo; estilos de componentes extraídos a `components.css` (sin cambios visuales). Primera aplicación: panel de administración (`index.html`).

---

## 1. Contexto y tono

HabilitApp emite y verifica certificados de seguridad laboral: alturas, espacios confinados, operación de grúa y concepto médico ocupacional. Se usa de dos maneras muy distintas:

| Quién | Dónde | Qué necesita |
|---|---|---|
| Coordinador de SST, guardia, interventor | Celular, en obra, con sol y con prisa | Saber en un segundo si la persona está **habilitada** |
| Consultorio o centro de entrenamiento (pequeño) | Computador, oficina | Emitir y gestionar certificados sin errores |
| Administrador interno | Computador | Tablas densas, filtros, acciones masivas y destructivas con cuidado |

**Marca:** sobria, clara y confiable, con aire de seguridad en obra y de clínica. El nombre alude a “habilitado”: la tarjeta verde y roja que cuelga de un andamio. **Nunca** cripto, infraestructura de redes ni estética de cadena de bloques.

---

## 2. Principios

1. **Un segundo, a pleno sol.** El veredicto es lo primero y lo más grande: bloque sólido, ícono y una palabra de 40 px. Alto contraste siempre; nada de grises delicados sobre blanco.
2. **El color dice el estado; la forma y la palabra lo confirman.** Ningún estado depende solo del color: siempre ícono + palabra. Un daltónico, una pantalla con reflejos o un lector de pantalla deben llegar al mismo veredicto.
3. **La tarjeta del andamio.** Verde = puede trabajar. Ámbar = venció, hay que renovar. Rojo = no puede trabajar (no válido o anulado). Gris = aún sin veredicto. Esos colores se **reservan** para estados y nunca se usan para la marca.
4. **Bordes antes que sombras.** Elevación mínima: un borde de 1 px separa; la sombra existe solo en diálogos y menús, que flotan de verdad.
5. **Una acción principal por vista.** Un único botón primario (azul petróleo). Lo destructivo es rojo y pide confirmación con esfuerzo proporcional al daño.
6. **Dedos grandes, texto claro.** Objetivos táctiles de al menos 44 px; 16 px de base (también evita el zoom automático de iOS); 14 px solo en tablas densas.
7. **Hablar como la gente.** Español de Colombia, directo, sin jerga. Botones con verbo en infinitivo. Se dice “certificado”, nunca “token”.

---

## 3. Marca

- **Logotipo:** una tarjeta (el certificado colgado) en azul petróleo con una marca de verificación. El orificio superior es amarillo seguridad.
- **Amarillo seguridad `#F5B700`** (`--ha-brand-yellow`): **solo** gráficos de marca (logotipo, ilustraciones, material impreso). **Nunca** en la interfaz: no es fondo, borde, ícono ni texto (1,8:1 sobre blanco, no es legible).
- **Prohibido:** degradados, neón, morados, redes de nodos, hexágonos, cadenas, escudos “digitales”, cualquier estética blockchain.

---

## 4. Color

Los valores viven en `tokens.css` (`:root` = claro; `[data-theme="dark"]` = oscuro, sobre `<html>` o cualquier contenedor). Todas las razones de contraste de esta sección se verificaron con el cálculo WCAG 2.x y la página `components.html` las recalcula en vivo.

### 4.1 Modo claro

| Token | Valor | Uso |
|---|---|---|
| `--ha-bg` | `#F4F6F8` | Fondo de página |
| `--ha-surface` | `#FFFFFF` | Tarjetas, tablas, diálogos, barra lateral |
| `--ha-surface-2` | `#EBEFF3` | Encabezado de tabla, campos deshabilitados, hover de ítems |
| `--ha-hover` | `#F4F6F8` | Hover de fila |
| `--ha-border` | `#C9D1DA` | Divisores y borde de tarjeta (**decorativo**, 1,5:1) |
| `--ha-border-strong` | `#7A8794` | **Borde de todo control** (3,67:1 sobre superficie) |
| `--ha-text` | `#14202B` | Texto |
| `--ha-text-muted` | `#586573` | Texto atenuado, ayudas |
| `--ha-primary` | `#0F4C5C` | Azul petróleo: marca, acción principal, enlaces, selección |
| `--ha-primary-hover` | `#0B3D4B` | Hover del primario (oscurece) |
| `--ha-primary-active` | `#082F3A` | Active del primario (oscurece más) |
| `--ha-primary-soft` | `#E1EEF2` | Fila seleccionada, ítem actual, hover de fantasma |
| `--ha-primary-soft-active` | `#D3E7ED` | Active de fantasma, selección + hover |
| `--ha-on-primary` | `#FFFFFF` | Texto sobre primario |
| `--ha-success` / `-bg` | `#197A47` / `#E3F4EA` | Habilitado |
| `--ha-warning` / `-bg` | `#8A5200` / `#FBEBCB` | Vencido |
| `--ha-danger` / `-bg` | `#B3261E` / `#FBE4E2` | No válido, Anulado, error, acción destructiva |
| `--ha-neutral` / `-bg` | `#586573` / `#EBEFF3` | En revisión, sin veredicto |
| `--ha-on-success`, `-warning`, `-danger` | `#FFFFFF` | Texto sobre el bloque sólido del veredicto y el botón destructivo |
| `--ha-danger-hover` / `-active` | `#9A1F18` / `#82190F` | Estados del botón destructivo |
| `--ha-brand-yellow` | `#F5B700` | Solo gráficos de marca |

### 4.2 Modo oscuro

Mismos roles; el primario se aclara a un petróleo claro y los estados pasan a tonos claros sobre fondos profundos. En oscuro el hover **aclara** (en claro, oscurece), porque así se mantiene el contraste con el texto oscuro `--ha-on-primary`.

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `--ha-bg` | `#0D1419` | | `--ha-primary` | `#5BB4C9` |
| `--ha-surface` | `#141D25` | | `--ha-primary-hover` | `#7CC6D8` |
| `--ha-surface-2` | `#1C2833` | | `--ha-primary-active` | `#479FB4` |
| `--ha-hover` | `#19232D` | | `--ha-primary-soft` | `#12343D` |
| `--ha-border` | `#2B3A47` | | `--ha-primary-soft-active` | `#174049` |
| `--ha-border-strong` | `#7B8B99` | | `--ha-on-primary` | `#06222A` |
| `--ha-text` | `#E6EDF3` | | `--ha-success` / `-bg` / `on-` | `#6FD4A0` / `#123624` / `#06210F` |
| `--ha-text-muted` | `#A3B2BF` | | `--ha-warning` / `-bg` / `on-` | `#F2C26B` / `#3A2A0A` / `#2A1A00` |
| `--ha-disabled-fg` | `#6B7B89` | | `--ha-danger` / `-bg` / `on-` | `#FF9C94` / `#3F1614` / `#3A0905` |
| `--ha-focus` | `#5BB4C9` | | `--ha-neutral` / `-bg` | `#A3B2BF` / `#1C2833` |

### 4.3 Contraste verificado (AA)

Mínimos: 4,5:1 en texto, 3:1 en componentes (WCAG 1.4.3 y 1.4.11). Todos los pares siguientes cumplen en ambos modos.

| Par | Claro | Oscuro |
|---|---|---|
| Texto / fondo | 15,25 | 15,71 |
| Texto / superficie | 16,52 | 14,42 |
| Texto atenuado / superficie | 5,96 | 7,85 |
| Texto atenuado / superficie secundaria | 5,16 | 6,91 |
| Texto atenuado / primario suave | 5,03 | 6,11 |
| Primario / superficie | 9,51 | 7,16 |
| Sobre primario / primario | 9,51 | 6,94 |
| Sobre primario / primario active | 14,21 | 5,42 |
| Éxito / éxito suave | 4,70 | 7,35 |
| Advertencia / advertencia suave | 5,43 | 8,38 |
| Peligro / peligro suave | 5,38 | 7,81 |
| Neutro / neutro suave | 5,16 | 6,91 |
| Sobre éxito / éxito (veredicto sólido) | 5,36 | 9,41 |
| Sobre advertencia / advertencia | 6,39 | 10,19 |
| Sobre peligro / peligro | 6,54 | 8,55 |
| **Borde de control** / superficie (3:1) | 3,67 | 4,87 |
| Borde de control / primario suave (3:1) | 3,10 | 3,78 |
| Anillo de foco / fondo (3:1) | 8,78 | 7,79 |

### 4.4 Ajustes respecto a los valores de partida

Se respetaron todos los valores salvo lo que no cumplía contraste o faltaba:

| Cambio | Motivo |
|---|---|
| Éxito `#1B7F4B` → `#197A47` | Sobre su fondo suave `#E3F4EA` daba 4,40:1 (< 4,5). Ahora 4,70:1. |
| Se añade `--ha-border-strong` | El borde de partida `#C9D1DA` da 1,5:1: sirve para separar, no para delimitar un control (WCAG 1.4.11 pide 3:1). Los controles usan `#7A8794`. |
| Hover / active / suave activo del primario | Derivados como se pidió (oscureciendo en claro). Se añadieron `primary-soft-active` y los estados del peligro. |
| Modo oscuro | Derivado de cero con los mismos roles; el primario en `#5BB4C9` como se pidió. |
| Texto atenuado `#586573` | Se conserva: cumple 5,16:1 incluso sobre superficie secundaria. |

### 4.5 Reglas de uso del color

- **Hacer:** azul petróleo para la acción principal, enlaces, selección y foco; estados con su ícono y palabra; borde de control con `--ha-border-strong`.
- **Evitar:** colorear la marca o un botón con verde/rojo “para que destaque”; usar un estado para decorar; texto atenuado sobre un fondo de color distinto al de la tabla; amarillo seguridad en cualquier parte de la interfaz.
- **Deshabilitado** es el único estado exento de contraste: fondo `--ha-surface-2`, texto `--ha-disabled-fg`, cursor `not-allowed`. Si el motivo importa, se explica con texto de ayuda visible (no solo con un tooltip).

---

## 5. Tipografía

| Rol | Fuente | Pesos |
|---|---|---|
| Interfaz y títulos | **Public Sans** (`--font-sans`) | 400, 500, 600, 700 |
| Identificadores y direcciones | **IBM Plex Mono** (`--font-mono`) | 400, 500 |

Escala (px / interlineado): `xs` 12/16 · `sm` 14/20 · `base` 16/24 · `lg` 18/26 · `xl` 20/28 · `2xl` 24/32 · `3xl` 30/36 · `4xl` 40/44.

- **Base 16 px**; **14 px (`sm`) en tablas densas**; 12 px solo para etiquetas pequeñas, nunca para texto que haya que leer en obra.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) en tablas, fechas y cifras.
- **Mono** para números de certificado (`HAB-2026-004718`), direcciones y cualquier identificador.
- El texto de estado del Resultado de verificación usa `4xl` (40 px, 700): cumple el mínimo de 32 px.
- Títulos en Public Sans 600–700; no se usan cursivas ni mayúsculas sostenidas.
- Las fuentes están autoalojadas en `fonts/` (subconjunto latino: cubre á é í ó ú ü ñ ¿ ¡). Si se publican en otra ruta, ajustar las `url()` de `tokens.css`.

---

## 6. Espaciado, forma y movimiento

| Tema | Regla |
|---|---|
| Espaciado | Base 4: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 |
| Radios | `--radius-sm` 6 (casillas, ítems de menú) · `--radius-md` 8 (botones, campos, alertas) · `--radius-lg` 12 (tarjetas, diálogos) · `--radius-pill` **solo chips de estado** |
| Elevación | Borde 1 px `--ha-border`. Sombra `--shadow-overlay` solo en diálogos, menús y avisos temporales |
| Controles | `--control-sm` 36 · `--control-md` **44 (por defecto)** · `--control-lg` 52. El pequeño sube a 44 en pantallas táctiles (`pointer: coarse`) |
| Foco | Anillo de 3 px `--ha-focus` con 2 px de separación, en todo elemento enfocable |
| Movimiento | 120 ms (cambios de color) y 200 ms (entrada de diálogos y avisos). Con `prefers-reduced-motion: reduce` las duraciones pasan a ~0 y se detienen giros y pulsos |
| Puntos de quiebre | 640 · 960 · 1280 px. En celular se diseña primero; sin desplazamiento horizontal de página |

---

## 7. Componentes

Todos están en `components.html` con sus estados reales (reposo, hover, foco, activo, deshabilitado, cargando, error). Los estados forzados se muestran con las clases `is-hover`, `is-focus`, `is-active`, `is-error` y los atributos `disabled` y `aria-busy`; en producción los provocan el puntero, el teclado y la aplicación.

### 7.1 Estados por componente

| Componente | Reposo | Hover | Foco | Activo | Desh. | Cargando | Error | Notas |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Botón | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Error = “Reintentar” con ícono |
| Campo de texto | ✓ | ✓ | ✓ | ✓ (escribiendo) | ✓ | ✓ (validando) | ✓ | Error trae ícono + mensaje |
| Selector / múltiple | ✓ | ✓ | ✓ | ✓ (abierto) | ✓ | ✓ | ✓ | Múltiple: lista de casillas con Escape |
| Casilla / radio | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | No cargan: responden al instante |
| Interruptor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (guardando) | ✓ | Posición de la perilla, no solo color |
| Campo de formulario | ✓ | — | ✓ | — | ✓ | — | ✓ | Etiqueta, ayuda y error enlazados |
| Tabla densa | ✓ | ✓ (fila) | ✓ | ✓ | — | ✓ (esqueleto) | ✓ | Orden, selección, vacío |
| Chip de estado | ✓ | — | — | — | — | — | — | No interactivo |
| Chip de filtro | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | `aria-pressed`, marca al activarse |
| Tarjeta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (esqueleto) | ✓ | También “seleccionada” |
| Diálogo | ✓ | — | ✓ | — | ✓ (botón) | ✓ (botón) | ✓ | Destructivo exige escribir texto |
| Alerta / aviso | ✓ | — | ✓ (cerrar) | — | — | ✓ (info) | ✓ (peligro) | Aviso se pausa con hover/foco |
| Barra lateral / ítem | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | Página actual: `aria-current="page"` |
| Pestañas | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | Flechas, Inicio y Fin |
| Búsqueda y filtros | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Botón de borrar con 44 px |
| Estado vacío | ✓ | — | — | — | — | — | ✓ | Tres casos: vacío, sin resultados, fallo |
| Resultado de verificación | ✓ ×4 | — | — | — | — | ✓ | ✓ (sin conexión) | Ver §8 |

“—” = el estado no aplica a ese componente; no se inventa.

### 7.2 Reglas por componente

**Botón.** Variantes: primario (petróleo), secundario (superficie + borde de control), fantasma (texto petróleo), destructivo (rojo). Un solo primario por vista. Verbo en infinitivo: “Emitir certificado”, “Registrar emisor”, “Anular certificado”. Al cargar, el botón conserva su ancho, muestra giro y el gerundio (“Emitiendo…”) y no se puede pulsar de nuevo. Solo ícono: requiere `aria-label` y 44 × 44 px.

**Campo y formulario.** Etiqueta visible arriba (nunca solo placeholder). Ayuda debajo de la etiqueta. Lo obligatorio se escribe “(obligatorio)”; lo opcional no se marca. El error va debajo del campo con ícono, `aria-invalid="true"` y `aria-describedby`; al enviar con errores aparece un resumen con enlaces a los campos y el foco se mueve a él. Texto de 16 px.

**Selector múltiple.** Botón que resume (“2 tipos seleccionados”) y lista de casillas; Escape cierra y devuelve el foco al botón.

**Casilla, radio, interruptor.** Control de 20 px (interruptor 44 × 24) dentro de un área de toque de 44 px. Marcado = forma (✓, punto, perilla desplazada). El interruptor es rectángulo redondeado, no píldora.

**Tabla densa.** Filas de 40 px (48 en táctil), 14 px, números tabulares, identificadores en mono. Encabezado `--ha-surface-2` con botones de orden y `aria-sort`. Hover `--ha-hover`; seleccionada `--ha-primary-soft`. Barra de acciones masivas cuando hay selección. En celular, la tabla se desplaza dentro de su contenedor (con `tabindex` y etiqueta), no la página.

**Chip de estado.** Píldora con ícono + palabra. Vocabulario cerrado: **Habilitado** (verde, círculo con ✓), **Vencido** (ámbar, reloj), **No válido** (rojo, círculo con ✕), **Anulado** (rojo, círculo tachado), **En revisión** (gris, información), **Revocado** (rojo, círculo tachado; se añadió en v1.1 y es el único estado de una **entidad emisora** junto con Habilitado). Para una entidad, los dos únicos estados son Habilitado (verde) y Revocado (rojo). Los chips de filtro son otro componente (radio 8 px, `aria-pressed`).

**Tarjeta.** Borde 1 px, radio 12 px, sin sombra. Si toda la tarjeta es un enlace, es un único objetivo de foco con el título como nombre accesible. Seleccionada: borde petróleo de 2 px + fondo suave.

**Diálogo.** `<dialog>` nativo con `showModal()`: atrapa el foco, Escape cierra, el foco vuelve al botón que lo abrió. Orden de botones: Cancelar (secundario) a la izquierda, acción a la derecha. **Variante destructiva:** ícono y título dicen qué se destruye, el texto nombra el objeto concreto, el usuario escribe un texto de confirmación (sin distinguir mayúsculas) y solo entonces se habilita el botón rojo. **El texto es configurable según el objeto:** `ANULAR` al anular un certificado; el **nombre de la entidad** al revocar un emisor (v1.1). El diálogo con campo de confirmación no se cierra al hacer clic en el fondo.

**Alerta y aviso temporal.** Alerta en línea: ícono + título + una frase + acción opcional; `role="status"` (o `alert` si es peligro). Aviso temporal: confirma una acción, se cierra solo a los 6 s, **excepto** los de error; se pausa con hover o foco; siempre tiene botón de cerrar de 44 px.

**Barra lateral y superior.** Escritorio: barra lateral de 240 px con íconos + texto (nunca solo íconos). Celular: botón de menú en la barra superior. Página actual con `aria-current="page"`, negrita, fondo suave e ícono petróleo.

**Pestañas.** Patrón `tablist` con una sola pestaña en el orden de tabulación; flechas, Inicio y Fin cambian de pestaña. Seleccionada: subrayado petróleo de 3 px + negrita. Los contadores son rectángulos, no píldoras.

**Búsqueda y filtros.** Campo de búsqueda de 44 px con ícono y botón para borrar. Filtros como botones de alternancia. “Limpiar filtros” siempre visible cuando hay filtros. El conteo de resultados se anuncia con `aria-live="polite"`.

**Estado vacío.** Ícono en un cuadro de 64 px, título, una frase y **una** acción. Tres casos distintos: nada creado, búsqueda sin resultados, fallo de carga (el único con ícono rojo).

### 7.3 Qué hacer y qué evitar (resumen)

| Hacer | Evitar |
|---|---|
| Un botón primario por vista | Dos primarios juntos |
| Verbo en infinitivo y objeto: “Registrar emisor” | “Aceptar”, “Enviar”, “OK” |
| Error con ícono, mensaje y cómo corregirlo | “Campo inválido”, “Error 422”, solo borde rojo |
| Estados con ícono + palabra | Un punto de color sin texto |
| Borde de 1 px para separar | Sombras en tarjetas y tablas |
| Esqueleto o giro dentro del componente que carga | Pantalla completa de carga que bloquea el contexto |
| Confirmar con texto lo irreversible | Diálogo “¿Seguro?” con “Sí / No” para borrar |
| Mostrar “Sin verificar” si falló la red | Mostrar “No válido” cuando solo falló la conexión |
| Documento parcialmente oculto en pantalla pública | Datos personales completos en el resultado |
| Marcar la página actual y el foco con claridad | Quitar el anillo de foco |

---

## 8. Resultado de verificación (componente especial)

Tarjeta grande, pensada primero para celular (390 px de ancho de referencia), a pleno sol.

**Estructura, de arriba abajo:**
1. **Bloque de veredicto** (sólido, color del estado): ícono de 56 px + palabra en **40 px / 700** + una frase de motivo en 18 px.
2. **Filas de datos** (etiqueta de 14 px arriba, valor de 18 px/600 abajo): Titular · Documento (parcialmente oculto, `C.C. ***.***.678`) · Certificado · Número (mono) · Emisor · Emitido · Vence (o “Venció” / “Anulado”).
3. **Pie** `--ha-surface-2`: ícono de escudo + **“Verificado por HabilitApp”** + fecha y hora de la verificación.
4. Debajo de la tarjeta: **un** botón primario grande (52 px) “Verificar otro certificado”.

| Veredicto | Bloque | Ícono | Frase de ejemplo |
|---|---|---|---|
| **Habilitado** | `--ha-success` | círculo con ✓ | “Vigente hasta el 14 de enero de 2027.” |
| **Vencido** | `--ha-warning` | reloj | “Venció el 21 de agosto de 2026. No está habilitado hasta renovarlo.” |
| **No válido** | `--ha-danger` | círculo con ✕ | “No encontramos este certificado. Revisa el número o pídelo de nuevo al emisor.” (solo muestra número consultado y resultado) |
| **Anulado** | `--ha-danger` | círculo tachado | “El emisor anuló este certificado el 3 de septiembre de 2026.” |

**Estados adicionales:** *Cargando* (“Verificando…”, bloque gris, esqueleto de filas) y *Sin verificar* (error de conexión: bloque gris con triángulo, “No pudimos consultar el certificado. Revisa tu conexión: esto no significa que sea inválido.” y botón “Reintentar”). **Un fallo de red nunca se muestra como “No válido”.**

**Reglas:** objetivos táctiles ≥ 44 px; texto de estado ≥ 32 px (se usa 40); solo los cuatro veredictos llevan el bloque sólido (el gris de cargando y error es suave para que no se confunda con un veredicto).

---

## 9. Accesibilidad

- **Contraste AA**: 4,5:1 en texto y 3:1 en componentes, verificado en claro y oscuro (§4.3). Los bordes de control usan `--ha-border-strong`.
- **Nada solo con color**: estados = ícono + palabra; “marcado” = forma; error = ícono + mensaje; orden de tabla = flecha + `aria-sort`.
- **Foco visible**: anillo de 3 px, separado 2 px, 7,8:1 o más contra el fondo. En pestañas el anillo va hacia adentro para no recortarse.
- **Teclado**: todo se puede operar sin ratón. Pestañas con flechas; selector múltiple con Escape; diálogo con trampa de foco y retorno al abridor.
- **Objetivos táctiles ≥ 44 px** (controles, íconos, casillas). El tamaño pequeño de 36 px solo existe con puntero fino.
- **Movimiento reducido**: `prefers-reduced-motion: reduce` anula transiciones, giros y pulsos. El estado “cargando” siempre tiene además texto (“Guardando…”).
- **Lectores de pantalla**: etiquetas visibles enlazadas, `aria-invalid` + `aria-describedby`, `aria-current`, `aria-sort`, `aria-pressed`, `aria-busy`; regiones desplazables con `role="region"`, nombre y `tabindex="0"`; el veredicto es un `role="status"`.
- **Idioma**: `<html lang="es">`.
- **Modo oscuro opcional**: el sistema arranca en claro. Para respetar la preferencia del dispositivo, aplicar `data-theme="dark"` desde un script según `prefers-color-scheme`.

---

## 10. Voz y contenido

**Español de Colombia**, tuteo, directo y sin jerga. Frases cortas. El problema primero, la solución después.

| Situación | Decir | No decir |
|---|---|---|
| Botón de alta | Registrar emisor | Registro de emisor · Enviar |
| Qué es el documento | **Certificado** | Token, NFT, registro en cadena |
| Error de red | No pudimos verificar. Revisa tu conexión. | Error 500 · Network error |
| Validación | Escribe un correo válido, por ejemplo nombre@empresa.co. | Campo inválido |
| Confirmación destructiva | Vas a anular el certificado HAB-2026-003981. No se puede deshacer. | ¿Está seguro? |
| Vacío | Aún no hay certificados | No data |
| Fechas | 5 de octubre de 2026 · en tablas, 14 ene 2027 | 10/05/26 · 2026-10-05 |
| Números | C.C. 1.020.345.678 (punto de miles) | 1,020,345,678 |
| Estados | Habilitado · Vencido · No válido · Anulado · En revisión · Revocado (solo entidades) | Activo/Inactivo, OK, Fallido |

- **Botones**: verbo en infinitivo + objeto cuando ayuda (“Emitir certificado”, “Descargar PDF”, “Cancelar”).
- **Sin términos de cadena de bloques** en ninguna cadena de la interfaz: nada de token, hash, wallet, nodo, minar ni “en la cadena”. Los identificadores se muestran como número de certificado.
- **Sin mayúsculas sostenidas**, salvo la palabra que se pide escribir para confirmar (ANULAR).

---

## 11. Mapa a shadcn/ui (React + Tailwind)

`tokens.css` ya define los alias de shadcn/ui en `:root`; apuntan a los tokens semánticos, por lo que cambian solos con `[data-theme="dark"]`. En Tailwind v4:

```css
@import "tailwindcss";
@import "./tokens.css";

@custom-variant dark (&:is([data-theme="dark"] *));

@theme inline {
  --ha-background: var(--background);
  --ha-foreground: var(--foreground);
  --ha-card: var(--card);
  --ha-card-foreground: var(--card-foreground);
  --ha-popover: var(--popover);
  --ha-popover-foreground: var(--popover-foreground);
  --ha-primary: var(--primary);
  --ha-primary-foreground: var(--primary-foreground);
  --ha-secondary: var(--secondary);
  --ha-secondary-foreground: var(--secondary-foreground);
  --ha-muted: var(--muted);
  --ha-muted-foreground: var(--muted-foreground);
  --ha-accent: var(--accent);
  --ha-accent-foreground: var(--accent-foreground);
  --ha-destructive: var(--destructive);
  --ha-destructive-foreground: var(--destructive-foreground);
  --ha-border: var(--border);
  --ha-input: var(--input);
  --ha-ring: var(--ring);
  --ha-success: var(--success);
  --ha-success-foreground: var(--success-foreground);
  --ha-warning: var(--warning);
  --ha-warning-foreground: var(--warning-foreground);
  --radius-sm: calc(var(--radius) - 2px);   /* 6 px */
  --radius-md: var(--radius);               /* 8 px */
  --radius-lg: calc(var(--radius) + 4px);   /* 12 px */
  --font-sans: "Public Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

> Nota: los tokens propios usan el prefijo `--ha-*` precisamente para no chocar con el espacio `--color-*` de Tailwind. Cadena de resolución: `--ha-primary` (token HabilitApp) → `--primary` (alias shadcn, en `tokens.css`) → `--color-primary` (utilidad Tailwind, en `@theme inline`). No hay referencias circulares y todo cambia con `[data-theme="dark"]`.

| Variable shadcn/ui | Token HabilitApp | Claro | Oscuro |
|---|---|---|---|
| `--background` | `--ha-bg` | `#F4F6F8` | `#0D1419` |
| `--foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--card` | `--ha-surface` | `#FFFFFF` | `#141D25` |
| `--card-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--popover` | `--ha-surface` | `#FFFFFF` | `#141D25` |
| `--popover-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--primary` | `--ha-primary` | `#0F4C5C` | `#5BB4C9` |
| `--primary-foreground` | `--ha-on-primary` | `#FFFFFF` | `#06222A` |
| `--secondary` | `--ha-surface-2` | `#EBEFF3` | `#1C2833` |
| `--secondary-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--muted` | `--ha-surface-2` | `#EBEFF3` | `#1C2833` |
| `--muted-foreground` | `--ha-text-muted` | `#586573` | `#A3B2BF` |
| `--accent` | `--ha-primary-soft` | `#E1EEF2` | `#12343D` |
| `--accent-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--destructive` | `--ha-danger` | `#B3261E` | `#FF9C94` |
| `--destructive-foreground` | `--ha-on-danger` | `#FFFFFF` | `#3A0905` |
| `--border` | `--ha-border` | `#C9D1DA` | `#2B3A47` |
| `--input` | `--ha-border-strong` | `#7A8794` | `#7B8B99` |
| `--ring` | `--ha-focus` | `#0F4C5C` | `#5BB4C9` |
| `--radius` | `--radius-md` | `0.5rem` (8 px) | igual |
| `--sidebar` | `--ha-surface` | `#FFFFFF` | `#141D25` |
| `--sidebar-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--sidebar-primary` | `--ha-primary` | `#0F4C5C` | `#5BB4C9` |
| `--sidebar-primary-foreground` | `--ha-on-primary` | `#FFFFFF` | `#06222A` |
| `--sidebar-accent` | `--ha-primary-soft` | `#E1EEF2` | `#12343D` |
| `--sidebar-accent-foreground` | `--ha-text` | `#14202B` | `#E6EDF3` |
| `--sidebar-border` | `--ha-border` | `#C9D1DA` | `#2B3A47` |
| `--sidebar-ring` | `--ha-focus` | `#0F4C5C` | `#5BB4C9` |
| `--success` (extensión) | `--ha-success` | `#197A47` | `#6FD4A0` |
| `--success-foreground` | `--ha-on-success` | `#FFFFFF` | `#06210F` |
| `--warning` (extensión) | `--ha-warning` | `#8A5200` | `#F2C26B` |
| `--warning-foreground` | `--ha-on-warning` | `#FFFFFF` | `#2A1A00` |

**Decisiones de mapeo**
- `--input` apunta a `--ha-border-strong`, no a `--ha-border`: en shadcn `--input` es el borde de los campos y debe cumplir 3:1.
- `--accent` (hover/selección de ítems de menú en shadcn) se asigna al **petróleo suave**, no al amarillo: el amarillo de marca nunca entra en la interfaz.
- `--chart-1…5` no se definen a propósito: los gráficos usan petróleo y neutros; los colores de estado solo si el gráfico representa estados (con etiqueta de texto).
- Radios en shadcn: `--radius` = 8 px; `sm` = 6 px (casillas, ítems), `lg` = 12 px (tarjetas, diálogos). Las píldoras (`rounded-full`) solo en el componente Badge de estado.
- Componentes shadcn a personalizar: `Button` (variante `destructive` ya mapeada; añadir tamaños 36/44/52), `Badge` → chip de estado con ícono obligatorio, `Dialog` + `Input` → diálogo destructivo con texto de confirmación, `Table` → tabla densa, `Tabs`, `Sidebar`, `Alert`, `Sonner/Toast`.

---

## 12. Cómo usarlo

```html
<link rel="stylesheet" href="tokens.css">
<html lang="es">                       <!-- claro por defecto -->
<html lang="es" data-theme="dark">  <!-- oscuro -->
```

```js
// Alternar modo
document.documentElement.dataset.theme = "dark"; // o "light"
```

- `components.html` es la **implementación de referencia**: sus estilos de componentes (`.btn`, `.field-control`, `.dt`, `.chip`, `.card`, `.dlg`, `.alert`, `.toast`, `.nav-item`, `.tab`, `.fchip`, `.empty`, `.result`) usan solo variables de `tokens.css`. Al llevarlos a React, portar estas reglas a variantes de los componentes de shadcn/ui (cva) sin introducir valores nuevos.
- Cualquier valor de color, radio, espaciado o tamaño nuevo se agrega primero a `tokens.css` y a este documento.
- **No** agregar colores sueltos en componentes. **No** usar `--ha-brand-yellow` en la interfaz. **No** usar los colores de estado para otra cosa que no sea un estado.
- Datos de ejemplo del kit (personas, números de certificado, emisores) son ficticios.
