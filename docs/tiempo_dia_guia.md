# Guía del Sistema de Tiempo del Día (Iluminación y Cielo Dinámicos)

El sistema de tiempo del día gestiona los cambios atmosféricos e iluminación de la escena en 3D para representar el transcurso de las horas (`dia`, `tarde`, `noche`). Permite transiciones suaves y fluidas entre estados de iluminación exterior, color de cielo y rangos de niebla.

---

## Estructura del Sistema

El sistema está integrado en el motor de renderizado y el bucle principal de animación:
1. **Configuración de Luces y Cielo (`src/core/renderer.js`)**: Encapsula las configuraciones de color, intensidad y posición de las luces físicas (luz ambiental `ambient`, luz solar `sun` y luz de ventana `windowLight`), junto con el color de fondo (`scene.background`) y la niebla (`scene.fog`).
2. **Controlador e Interpolador (`src/core/renderer.js`)**: Expone las funciones de control `setTimeOfDay` y `updateTimeOfDay`.
3. **Bucle de Animación (`src/main.js`)**: Ejecuta el actualizador en cada frame (`updateTimeOfDay(dt)`).

---

## Cómo Modificar el Tiempo del Día

### 1. Cambiar el Tiempo del Día (Transición)

Para iniciar una transición hacia una hora determinada, llama a la función `setTimeOfDay`:

```javascript
setTimeOfDay(
  'estado',      // 'dia' | 'tarde' | 'noche'
  duracion       // Duración de la transición en segundos (ej. 5.0). Por defecto es 3.0.
);
```

- Si especificas una duración de `0.0` o menor, la iluminación exterior, el cielo y la niebla se configurarán **instantáneamente** sin animación. Esto es ideal para reinicios de nivel o cambios directos tras dormir.

**Ejemplo de uso (Transición gradual al anochecer tras completar una misión):**
```javascript
// Cambiar a la noche suavemente en 5 segundos
setTimeOfDay('noche', 5.0);
```

**Ejemplo de uso (Reinicio instantáneo al amanecer):**
```javascript
// Cambiar al día de forma instantánea al despertar
setTimeOfDay('dia', 0.0);
```

---

## Detalles de los Estados Disponibles

El sistema cuenta con tres perfiles preconfigurados:

| Estado | Descripción Visual | Elementos Afectados |
| :--- | :--- | :--- |
| **`dia`** | Luz de sol brillante y cálida, cielo azul despejado y niebla diurna amplia. | Sol intenso ($5.0$, `0xfff0c4`), cielo celeste (`0xabe3f8`), niebla lejana ($45$). |
| **`tarde`** | Atardecer dorado/anaranjado. Luz solar baja y cálida. | Sol bajo ($2.5$, `0xff7a45`), cielo naranja cálido (`0xfa8d62`), niebla intermedia ($40$). |
| **`noche`** | Luz de luna azul fría de baja intensidad, cielo azul oscuro profundo. | Luna tenue ($0.3$, `0x7dd3fc`), cielo oscuro (`0x0c0f1d`), niebla cercana ($30$). |

---

## Integración en el Bucle Principal

Para que las transiciones graduales funcionen, el actualizador debe estar presente en el bucle principal de la aplicación (`animate` en `src/main.js`):

```javascript
import { updateTimeOfDay } from './core/renderer.js';

function animate() {
  const dt = clock.getDelta();
  
  // ... otras actualizaciones del juego
  updateTimeOfDay(dt); // Interpola suavemente las propiedades
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```
