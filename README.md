# Marta: Brecha Digital

Experiencia interactiva en 3D (Three.js) que pone al usuario en la piel de Marta, una mujer de 78 años que enfrenta la brecha digital. La narrativa se divide en días con misiones, dilemas, cinemáticas y posibles finales (buenos y malos).

> Grupo Pipón Pipón presenta. Versión de desarrollo.

---

## Requisitos

- **Node.js 18+**
- **npm 9+**

## Instalación y ejecución

```bash
npm install
npm run dev
```

Luego abrí el navegador en `http://localhost:5173` (o el puerto que indique Vite).

### Build de producción

```bash
npx vite build
```

El bundle queda en `dist/`.

### Verificaciones automáticas

```bash
npm run verify:3d     # Chequea geometrías 3D y shaders
npm run verify:input  # Chequea handlers de input
```

---

## Estructura del proyecto

```
src/
├── main.js                 # Entry point: setup 3D, escena, loop, listeners globales
├── styles.css              # Estilos de UI 3D, teléfono, cinemáticas, modales
│
├── config/                 # Constantes del juego
│   └── constants.js
│
├── data/                   # 📜 Guiones y datos editables
│   ├── dilemmas.js         # Definición de dilemas
│   ├── products.js         # Catálogo de productos (MercadoLibre / Mercad0Libre)
│   └── chats/              # Diálogos de conversaciones
│       ├── index.js
│       ├── camilo.js
│       └── clara.js
│
├── state/                  # Estado global compartido
│   └── index.js
│
├── utils/                  # Utilidades
│   ├── dom.js              # Cache de selectores del DOM
│   └── helpers.js          # Funciones comunes
│
├── audio/                  # Sonidos y efectos
│   └── sounds.js
│
├── core/                   # (reservado para futura refactorización)
│   ├── scene.js
│   ├── world.js
│   ├── player.js
│   └── animation.js
│
├── gameplay/               # (reservado para futura refactorización)
│   ├── missions.js
│   ├── cinematics.js
│   ├── dayCycle.js
│   └── interactions.js
│
└── phone/                  # (reservado para futura refactorización)
    ├── index.js
    ├── views.js
    ├── notifications.js
    └── apps/
        ├── messages.js
        ├── mercadolibre.js
        ├── mercad0libre.js
        ├── playstore.js
        └── settings.js
```

> Las carpetas `core/`, `gameplay/` y `phone/` están creadas como scaffold. La división completa se completará en futuras iteraciones; por ahora la lógica vive en `main.js` y los módulos que ya están extraídos (`data/`, `state/`, `utils/`, `audio/`, `config/`).

---

## Guías de diseño

- [`docs/cinematicas_guia.md`](./docs/cinematicas_guia.md): guía de cinemáticas.
- [`docs/dilemas_guia.md`](./docs/dilemas_guia.md): guía de dilemas.
- [`docs/misiones_guia.md`](./docs/misiones_guia.md): guía de misiones.
- [`docs/AGENTS.md`](./docs/AGENTS.md): guía para agentes de código.

---

## Stack técnico

- **Three.js 0.181** — render 3D
- **Vite 5** — bundler / dev server
- **Lucide** — íconos SVG
- **Playwright** — smoke tests (devDependency)

---

## Licencia

Proyecto privado / académico.
