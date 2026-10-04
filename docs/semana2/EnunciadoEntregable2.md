# Entregable 2: Product Blueprint

> Transcripción del documento "Entregable 2 Product Blueprint (CO)" del programa Blockchain Builders 101, Blockchain Acceleration Foundation.

## Descripción del entregable

El Product Blueprint se construye y se entrega dentro del mismo repositorio de GitHub del equipo, en la carpeta `docs/semana2/`. Todo vive en el repositorio en formato markdown, salvo el backlog, que se maneja como tablero Kanban en GitHub Projects y se enlaza desde el documento. El historial de commits queda como evidencia de autoría y de evolución del trabajo. El entregable se construye en dos fases.

**Fecha límite: Domingo 4 de octubre, 6:00 p.m. hora Colombia, mediante la carga del repositorio a la plataforma Apex.**

## Fase 1: Historias de usuario individuales

Cada integrante crea su propio archivo en `docs/semana2/` (por ejemplo, `MariaPaula.md`) y lo sube con su propio commit, de modo que quede un commit por persona en el historial. Cada quien escribe entre cinco y siete historias de usuario del producto que el equipo está diseñando, pensadas desde distintos roles o necesidades.

| Sección | Qué se pide |
|---|---|
| Mis historias de usuario | Entre 5 y 7 historias en formato "como [rol] quiero [acción] para [beneficio]". |
| La más importante y por qué | Organizar las historias de mayor a menor orden de importancia y explicar por qué. |

Con las historias de todos sobre la mesa, el equipo las reúne, prioriza las más relevantes y las convierte en el backlog del tablero Kanban en GitHub Projects. Ese backlog es el punto de partida de la Fase 2.

## Fase 2: Product blueprint

El equipo desarrolla el blueprint completo en `docs/semana2/ProductBlueprint.md`, organizado en las siguientes secciones y en este orden:

### Product Blueprint

| Sección | Contenido mínimo | Extensión |
|---|---|---|
| Priorización de historias | Historias elegidas entre las que propuso el equipo y criterio con que se priorizaron. Son las que pasan al backlog. | Breve |
| Propuesta de valor | Qué resultado obtiene el usuario y por qué elegiría esta solución. En qué se diferencia de cómo resuelve hoy. Conecta con el usuario del Problem Brief. | 150–300 palabras |
| Flujo de usuario | Recorrido de la persona por la solución de principio a fin, roles y puntos de interacción. Diagrama o secuencia numerada. | 150–300 palabras |
| Alcance del MVP | Funcionalidad central separada de la deseable que queda fuera. Justificación de por qué el recorte sigue entregando valor. | 150–300 palabras |
| Lean Canvas | Lienzo de una página con el modelo del producto: problema, segmento de usuarios, propuesta de valor única, solución, canales, métricas clave, ventaja diferencial y estructura de costos e ingresos. | Imagen o enlace |
| Backlog priorizado (Kanban) | Enlace al tablero en GitHub Projects, construido con las historias priorizadas, en columnas y con criterios de aceptación por tarjeta. | Enlace al tablero |
| Arquitectura inicial | Cómo se conectan las partes (interfaz, lógica, Stellar) y en qué punto entra la red. Diagrama simple. | 150–300 palabras |
| Uso de Stellar y justificación | Qué componentes de Stellar usaría y por qué cada uno. Apoyado en el criterio de pertinencia del Problem Brief. | 150–300 palabras |

## Árbol de estructura

```
nombre-del-repo/
└── docs/
    ├── semana1/
    │   ├── MariaPaula.md         ← propuesta individual (semana 1)
    │   ├── ...
    │   └── ProblemBrief.md       ← entregable grupal (semana 1)
    └── semana2/
        ├── MariaPaula.md         ← historias de usuario individuales
        ├── ...
        └── ProductBlueprint.md   ← entregable grupal (semana 2)
                                    + tablero Kanban en GitHub Projects (enlazado)
```

**Importante:** acá podrás ver una estructura base de los archivos correspondientes a la semana 2: <https://github.com/mestupinanm/ProyectoBase/tree/main/docs/semana2>

## Aclaraciones

1. El Product Blueprint se agrega al mismo repositorio de la semana 1, en `docs/semana2/`, respetando la estructura y el orden establecido. No se crea un repositorio nuevo ni se usa ningún documento externo.
2. El backlog no va en un archivo, se maneja como tablero Kanban en GitHub Projects y se enlaza desde `ProductBlueprint.md`, con criterios por tarjeta.
