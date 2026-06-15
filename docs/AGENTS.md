# AGENTS.md

Guía técnica para agentes de código (humanos o IA) que trabajen sobre este proyecto. Si vas a editar código, leer el guion, agregar una app, o cambiar lógica de día: empezá por acá.

---

## Setup

```bash
npm install
npm run dev
```

Build: `npx vite build`. Verificaciones: `npm run verify:3d`, `npm run verify:input`.

---

## Convenciones

- **Entry point:** `src/main.js`. Es el único archivo cargado por `index.html`. NO renombrar a `index.js`.
- **Módulos ES:** todo se importa con `import/export`. No hay CommonJS.
- **Estado:** vive en `src/state/index.js` cuando es compartido entre módulos, o como `const`/`let` local en `main.js` cuando es privado a la escena 3D.
- **DOM:** todos los selectores están cacheados en `src/utils/dom.js` (objeto `ui`). No hacer `document.querySelector` en otra parte salvo que sea dinámico.
- **Audio:** todas las funciones de sonido viven en `src/audio/sounds.js`.
- **Datos editables:** los guiones, dilemas y productos están separados de la lógica.

---

## Dónde editar cosas

### Cambiar un mensaje de chat (Camilo, Clara)

👉 **`src/data/chats/camilo.js`** o **`src/data/chats/clara.js`**

Cada archivo exporta un objeto por día. Ejemplo:

```js
// src/data/chats/camilo.js
export const camiloDialogues = {
  day2: [
    { type: 'incoming', text: 'Hola mamá. ¿Cómo dormiste? 😊' },
    // ... más mensajes
  ],
};
```

Para agregar un día nuevo: `day3: [...]`. Para agregar un mensaje: agregar un objeto al array.

### Cambiar/agregar un dilema

👉 **`src/data/dilemmas.js`**

Cada dilema es un objeto con `title`, `description` y opciones (`optionA`, `optionB`, opcionalmente `optionC`). Cada opción tiene `label`, `successRate`, y dos outcomes (`positive` y `negative`) con `description` y `effects`.

Para agregar un dilema nuevo, exportarlo desde este archivo y disparar `showDilemma(dilemma, onResolve)` desde donde corresponda.

### Cambiar productos del catálogo

👉 **`src/data/products.js`**

```js
export const mlProducts = [
  { id: 'barbie', title: 'Barbie futbolista edición mundial 2026', price: 42999, gradient: '...' },
];
```

`gradient` es un string CSS para el thumbnail. `id` debe ser único.

### Cambiar el dinero inicial, precios, tiempos

👉 **`src/config/constants.js`**

Constantes como `MONEY_INITIAL`, `MONEY_BARBIE`, duraciones, posiciones de cámara, etc.

### Cambiar/agregar una app del teléfono

1. Crear el botón en `index.html` (dentro de `#phoneHomeView .phone-app-grid`) con `data-app="miApp"` y el ícono correspondiente.
2. Crear un módulo en `src/phone/apps/miApp.js` que exporte la lógica.
3. En el handler de `phoneAppBtns` (en `main.js`), agregar el case para `miApp`.
4. Crear la vista en `index.html` (un `<div class="phone-view" id="phoneMiAppView">`) y agregarla al `switchPhoneView`.

### Cambiar lógica de misión

👉 **`main.js` → función `setMission` / `completeMission`** (todavía no extraída a un módulo).

### Cambiar lógica de día (cinemática de despertar, transición, reinicio)

👉 **`main.js` → funciones `startDay2`, `startDay3`, `restartCurrentDay`, `day2WakeUpSequence`**.

### Cambiar el comportamiento de fatiga visual

👉 **`main.js` → función `updateStats(dt)`** y **`main.js` → listener de `#settingFatigue`**.

El flag `visualFatigueDisabled` (importado de `state/index.js`) controla si la fatiga se acumula/baja y si se aplica blur.

### Cambiar el final malo (Mercad0Libre fraudulento)

👉 **`main.js` → función `triggerBadEndingAppFraud`** y **`index.html` → `#gameOverModal`**.

El drain visual y sonoro de fraude se maneja con `fraudDrainState` y la función `updateFraudDrain(dt)` llamada en el `animate()` loop.

---

## Estructura mental de `main.js`

Aunque `main.js` es grande (~3700 líneas), está organizado en secciones comentadas:

1. **Imports y setup 3D** — canvas, renderer, scene, camera.
2. **Estado y UI** — `phoneState`, `mlAdState`, `statsState`, `missionsState`, `conversations`, `installedApps`, `ui`, `dayRestarted`.
3. **Audio** — funciones importadas de `audio/sounds.js`.
4. **Misiones** — `setMission`, `completeMission`, `updateMissions`.
5. **Mundo 3D** — texturas, materiales, modelos, casa, objetos.
6. **Jugador** — movimiento, pointer lock, colisiones.
7. **Puertas** — modelo interactivo, prompts.
8. **Cama** — dormir, transición de día.
9. **Cinemáticas** — `startCinematic`, `updateCinematic`, secuencias.
10. **Día 1, Día 2, Día 3** — `startDay2`, `startDay3`, `restartCurrentDay`, `day2WakeUpSequence`.
11. **Teléfono** — `updatePhoneAnimation`, `updatePhonePrompt`, vistas, mensajes.
12. **Apps** — handlers de `MercadoLibre`, `Mercad0Libre`, `PlayStore`, etc.
13. **Stats y dilemas** — `updateStats`, `showDilemma`, `renderImpactBadges`.
14. **Listeners globales** — teclado, mouse, clicks, resize.
15. **Game loop** — `animate(dt)`.

> Las secciones marcadas "**(reservado para futura refactorización)**" en el árbol de `src/` apuntan a una división futura más profunda. La refactorización actual se enfocó en extraer **datos editables** y **sistemas autocontenidos** (audio, ui, helpers, state) sin tocar el setup 3D.

---

## Reglas para PRs

- **No agregar comentarios** salvo que sean estrictamente necesarios.
- Respetar el estilo del código existente (sangría de 2 espacios, comillas simples).
- Verificar con `npx vite build` antes de commitear.
- Si agregás una app nueva al teléfono, documentar la vista en este archivo.

---

## Smoke tests

Los smoke tests se escriben con Playwright. Para correrlos manualmente:

```bash
node test-X.mjs   # con dev server en localhost:5173
```

Plantilla básica:

```js
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#startBtn');
  // ... tus chequeos
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
```
