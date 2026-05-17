# Guía del Sistema de Misiones (Objetivos del Jugador)

El sistema de misiones gestiona los objetivos narrativos y tareas que el jugador debe completar durante la experiencia. Está diseñado para ser modular, reutilizable y contar con retroalimentación visual (estilo *glassmorphism*) y sonora de alta calidad.

## Arquitectura del Sistema

El sistema consta de tres partes principales:
1. **Estructura DOM (`index.html`)**: Contenedor `#missionsContainer` situado en la esquina superior izquierda.
2. **Estilos y Animaciones (`src/styles.css`)**: Clases CSS con soporte para transiciones de estado (`is-active`, `is-completed`) y ocultación automática durante cinemáticas (`body.cinematic-active`).
3. **Gestor de Estado (`src/main.js`)**: Objeto `missionsState` y funciones de control (`setMission`, `completeMission`, `updateMissions`).

---

## Cómo Crear y Gestionar Misiones

### 1. Iniciar una Nueva Misión

Para activar una misión en cualquier momento del juego (por ejemplo, al iniciar un nivel o tras un evento), utiliza la función `setMission`:

```javascript
setMission(
  'id_de_la_mision',     // Identificador único de la misión
  'Título del Objetivo', // Título corto (ej. "Objetivo", "Misión Actual")
  'Descripción detallada de la tarea que el jugador debe realizar.'
);
```

**Ejemplo de uso:**
```javascript
// Activar la misión de atender el timbre al inicio del juego
setMission('doorbell', 'Atiende la puerta', 'Alguien toca el timbre. Ve a abrir la puerta de entrada.');
```

*Nota: Si el ID es `'doorbell'`, el sistema activará automáticamente la reproducción periódica del sonido del timbre cada 6 segundos mediante el bucle `updateMissions`.*

---

### 2. Completar una Misión Existente

Cuando el jugador cumpla con la condición requerida (por ejemplo, interactuar con un objeto, llegar a una zona o abrir una puerta), llama a `completeMission`:

```javascript
completeMission('id_de_la_mision');
```

**¿Qué sucede al completar una misión?**
1. **Feedback Visual**: La tarjeta cambia su borde y fondo a verde (`is-completed`), el icono circular muestra un tick de verificación (`✓`) y el texto adquiere un efecto de tachado suave.
2. **Feedback Sonoro**: Se sintetiza y reproduce automáticamente un arpegio de éxito ascendente (4 tonos limpios).
3. **Limpieza Automática**: Tras 4 segundos, el contenedor se oculta de forma fluida con una transición CSS, quedando listo para la siguiente misión.

**Ejemplo de integración (Apertura de puerta en `toggleNearbyDoor`):**
```javascript
if (nearby.id === 'entry' && nearby.door.open && missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
  completeMission('doorbell');
  // Disparar la cinemática o evento correspondiente
  startCinematic(cutsceneEntry);
}
```

---

## Personalización y Escalabilidad

- **Sonidos Personalizados**: Puedes añadir nuevos efectos sonoros para misiones específicas modificando `setMission` o creando nuevas funciones de síntesis con la Web Audio API (similar a `playDoorbellSound`).
- **Nuevas Condiciones de Bucle**: Si una misión requiere temporizadores o eventos continuos (como el timbre), añade la lógica dentro de la función `updateMissions(dt)` en `src/main.js`.
