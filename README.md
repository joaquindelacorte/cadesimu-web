# CADESIMU Web

Simulador de lógica Ladder en el navegador — port web de CADESIMU para uso académico.

## Descripción

CADESIMU Web permite construir, simular y exportar programas en lenguaje Ladder directamente desde el navegador, sin instalación ni backend. Pensado para alumnos de automatización industrial.

## Características (Roadmap)

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Scaffold + motor de scan cycle + tests | 🔲 En progreso |
| 1 | MVP: contactos NA/NC, bobinas, lienzo interactivo | 🔲 Pendiente |
| 2 | Timers, Counters, panel de monitoreo | 🔲 Pendiente |
| 3 | Export/Import `.cadesimu.json` | 🔲 Pendiente |
| 4 | Function Blocks, operaciones matemáticas | 🔲 Pendiente |
| 5 | MCP Server (integración con LLMs) | 🔲 Pendiente |

## Stack Técnico

- **Frontend:** HTML + CSS + Vanilla JS (sin frameworks)
- **Renderizado:** Canvas / SVG
- **Motor:** Scan cycle puro JS (sin backend)
- **Export:** JSON client-side (Blob + createObjectURL)
- **MCP:** TypeScript + `@modelcontextprotocol/sdk` (Fase 5)

## Estructura del Proyecto

```
cadesimu-web/
├── index.html          # Entry point
├── css/
│   └── main.css        # Estilos globales
├── js/
│   ├── engine/         # Motor de scan cycle
│   │   ├── scan.js     # Loop principal
│   │   ├── variables.js # Tabla I/Q/M/T/C
│   │   └── components/ # Contactos, bobinas, timers...
│   ├── editor/         # UI del editor ladder
│   │   ├── canvas.js   # Renderizado del lienzo
│   │   ├── toolbar.js  # Toolbar Play/Pause/Step
│   │   └── grid.js     # Grid drag & drop
│   └── io/             # Export / Import
│       └── json.js     # Serialización .cadesimu.json
├── tests/              # Tests del motor (Vitest / vanilla)
└── mcp/                # MCP Server (Fase 5, TypeScript)
```

## Variables

| Tipo | Prefijo | Descripción |
|------|---------|-------------|
| Input  | `I` | Entradas digitales |
| Output | `Q` | Salidas digitales |
| Memory | `M` | Marcas internas |
| Timer  | `T` | Temporizadores |
| Counter| `C` | Contadores |

## Formato JSON

```json
{
  "version": "1",
  "meta": { "author": "", "description": "", "created": "" },
  "variables": { "I": {}, "Q": {}, "M": {}, "T": {}, "C": {} },
  "rungs": [],
  "simulationState": {}
}
```

## Uso

Abrir `index.html` en cualquier navegador moderno. No requiere servidor.

## Licencia

MIT
