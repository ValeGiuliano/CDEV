# Guía del Motor de Cinemáticas y Diálogos

El motor de **Cinemáticas y Diálogos** es un sistema secuencial, basado en pasos (*steps*) y completamente impulsado por eventos y tiempo (*delta time*). Permite crear escenas animadas, bloquear controles del jugador, reproducir audio sintetizado y mostrar diálogos con barras negras estilo película (*letterbox*).

---

## 1. Estructura de Datos de una Cinemática

Una cinemática se define como un *array* de objetos de paso (`step`). Cada paso tiene una duración fija y puede contener diálogos, efectos de sonido y devoluciones de llamada (*callbacks*) para animar elementos 3D en tiempo real.

### Plantilla de Secuencia (`cinematicSequence`)

```javascript
const ejemploCinematica = [
  {
    duration: 2.5, // Duración del paso en segundos
    dialogue: { speaker: "Personaje 1", text: "Texto que dice el personaje en este paso." },
    sound: { freq: 440, type: 'triangle', duration: 0.2 }, // Tono sintetizado (Web Audio API)
    onStart: () => {
      // Se ejecuta una sola vez al iniciar este paso
      meshPersonaje.visible = true;
      meshPersonaje.position.set(0, 1.5, -5);
    },
    action: (progress, dt) => {
      // Se ejecuta en cada frame durante la duración del paso
      // progress va de 0.0 a 1.0
      meshPersonaje.position.x = THREE.MathUtils.lerp(0, 3, progress);
    }
  },
  {
    duration: 3.0,
    dialogue: { speaker: "Personaje 2", text: "Respuesta del segundo personaje." },
    sound: { freq: 320, type: 'sine', duration: 0.3 },
    action: (progress) => {
      // Animación de cámara o rotación
      meshPersonaje.rotation.y += 0.05;
    }
  }
];
```

---

## 2. Cómo Disparar una Cinemática en el Juego

El motor expone la función global `startCinematic(sequence)`. Al invocarse, el motor realiza automáticamente lo siguiente:

1. Activa la bandera `cinematicState.active = true`.
2. Muestra la interfaz de barras negras y subtítulos (`#cinematicOverlay`).
3. Bloquea el movimiento del jugador y la interacción del teléfono.
4. Comienza a reproducir la secuencia paso a paso en el bucle principal `animate()`.

### Ejemplo de Uso (al abrir una puerta o entrar a un área)

```javascript
// En la función que maneja la apertura de puertas:
if (puerta.id === 'puertaJefe' && puerta.abierta && !cinematicState.playedBossCutscene) {
  cinematicState.playedBossCutscene = true; // Evitar que se repita
  startCinematic(ejemploCinematica);
}
```

---

## 3. Funcionamiento Interno del Motor

- **Bloqueo de Controles**: En `handleMoveKey` y `updateFirstPerson`, se verifica `if (cinematicState.active) return;`. Esto asegura que la cámara del jugador quede fija o controlada por la cinemática sin que el usuario pueda interrumpir.
- **Interpolación (`action`)**: El parámetro `progress` (de `0` a `1`) es perfecto para usar con `Vector3.lerpVectors` o `THREE.MathUtils.lerp`, permitiendo movimientos fluidos y predecibles independientemente de los FPS del navegador.
- **Audio sin Dependencias**: La función `playCinematicSound` genera ondas de sonido sintéticas utilizando la API de Audio Web nativa del navegador, eliminando la necesidad de cargar archivos MP3 externos y garantizando una sincronización perfecta.

---

## 4. Reemplazo Futuro por Modelos 3D (Assets)

Actualmente, los personajes de prueba son geometrías básicas (esferas de colores `sonMesh` y `oldWomanMesh`). Cuando desees reemplazarlos por modelos GLTF/GLB importados, sigue estos pasos:

1. Carga el modelo usando `GLTFLoader`.
2. Asigna el objeto raíz del modelo cargado a la variable global correspondiente (ej. `sonMesh = gltf.scene;`).
3. Asegúrate de ocultarlo inicialmente (`sonMesh.visible = false;`).
4. La lógica de la cinemática (`onStart` y `action`) seguirá funcionando exactamente igual, moviendo y rotando el modelo 3D profesional en lugar de la esfera.
