# Guía del Sistema de Dilemas y Decisiones

El sistema de **Dilemas y Decisiones** es un motor genérico, modular y altamente reutilizable diseñado para presentar al jugador situaciones complejas de elección (Opción A vs Opción B) con impacto directo y dinámico sobre las métricas del juego (Dinero, Felicidad, Calma, etc.).

---

## 1. Estructura de Datos de un Dilema

Cada dilema se configura mediante un objeto JavaScript plano (`config`). Esto permite definir de forma declarativa el título, la descripción general y el detalle completo de cada opción, incluyendo sus probabilidades de éxito y los efectos de cada posible escenario (positivo o negativo).

### Plantilla de Configuración (`dilemmaConfig`)

```javascript
const ejemploDilema = {
  title: "Título del Dilema",
  description: "Descripción detallada de la situación o conflicto que el jugador debe resolver.",
  
  optionA: {
    label: "Nombre de la Acción A (ej. Invertir)",
    successRate: 0.6, // Probabilidad de que ocurra el escenario positivo (0.0 a 1.0)
    
    positive: {
      description: "Lo que sucede si la acción sale bien.",
      effects: { money: 100, happiness: 20, calm: 10 } // Valores a sumar/restar
    },
    negative: {
      description: "Lo que sucede si la acción sale mal.",
      effects: { money: -100, happiness: -15, calm: -25 }
    }
  },
  
  optionB: {
    label: "Nombre de la Acción B (ej. Rechazar)",
    successRate: 0.85,
    
    positive: {
      description: "Lo que sucede si esta alternativa sale bien.",
      effects: { money: 0, happiness: 5, calm: 20 }
    },
    negative: {
      description: "Lo que sucede si esta alternativa sale mal.",
      effects: { money: 0, happiness: -20, calm: -10 }
    }
  }
};
```

---

## 2. Cómo Invocar un Dilema en el Juego

El motor expone la función global `showDilemma(config, onResolve)`. 

- **`config`**: El objeto de configuración del dilema mostrado arriba.
- **`onResolve`**: Una función de *callback* que se ejecuta automáticamente cuando el jugador ha tomado su decisión, ha visto la pantalla de resultado y ha hecho clic en "Continuar".

### Ejemplo de Uso (al interactuar con un botón o evento)

```javascript
// Al hacer clic en un botón del teléfono o al abrir una puerta especial:
boton.addEventListener('click', (e) => {
  e.stopPropagation();
  
  showDilemma(ejemploDilema, () => {
    // Código que se ejecuta tras completarse el dilema
    console.log("Dilema resuelto. Actualizando estado del juego...");
    boton.disabled = true;
    boton.textContent = "Decisión tomada";
  });
});
```

---

## 3. Flujo Interno y Motor de Resolución

1. **Apertura del Modal**: `showDilemma` inyecta los textos y genera dinámicamente las etiquetas visuales (*pills/badges*) para mostrar al jugador el impacto exacto que tendría cada escenario sobre sus métricas antes de elegir.
2. **Cálculo de Probabilidad**: Al hacer clic en "Elegir Opción", el sistema evalúa `Math.random() < option.successRate`. Si el valor aleatorio cae dentro del margen, se selecciona el escenario `positive`; de lo contrario, se selecciona el `negative`.
3. **Aplicación de Efectos**: Se invoca `applyEffects(outcome.effects)`, ajustando los valores en `statsState` y limitando automáticamente los porcentajes entre `0%` y `100%`, y el dinero a un mínimo de `$0`.
4. **Pantalla de Resultado**: Se abre `#outcomeModal` mostrando el desenlace de la historia y el impacto real que tuvo en las métricas. Al confirmar, se cierra el modal y se llama a `onResolve()`.

---

## 4. Cómo Añadir Nuevas Métricas al Sistema

Si en el futuro deseas agregar una nueva métrica (por ejemplo, **Energía** o **Salud**), sigue estos 4 sencillos pasos:

### Paso 1: Añadir la métrica a `statsState` (`src/main.js`)
```javascript
const statsState = {
  fatigue: 0,
  money: 500,
  happiness: 80,
  calm: 75,
  energy: 100, // <-- NUEVA MÉTRICA
};
```

### Paso 2: Añadir su elemento visual en `index.html`
Agrega una nueva tarjeta dentro de `.stat-grid`:
```html
<div class="stat-item">
  <div class="stat-header">
    <span class="stat-label">Energía</span>
    <span class="stat-value" id="energyValue">100%</span>
  </div>
  <div class="stat-bar"><div class="stat-fill bg-amber" id="energyFill" style="width: 100%;"></div></div>
</div>
```

### Paso 3: Actualizar el DOM en `updateStats` (`src/main.js`)
```javascript
if (ui.energyValue) ui.energyValue.textContent = Math.round(statsState.energy) + '%';
if (ui.energyFill) ui.energyFill.style.width = statsState.energy + '%';
```

### Paso 4: Incluir la métrica en `renderImpactBadges` y `applyEffects` (`src/main.js`)

**En `renderImpactBadges`:**
```javascript
if (effects.energy) {
  const b = document.createElement('span');
  b.className = `impact-badge ${effects.energy > 0 ? 'pos' : 'neg'}`;
  b.textContent = `Energía ${effects.energy > 0 ? '+' : ''}${effects.energy}%`;
  container.appendChild(b);
}
```

**En `applyEffects`:**
```javascript
if (effects.energy) {
  statsState.energy = Math.max(0, Math.min(100, statsState.energy + effects.energy));
}
```

¡Con esto, el sistema estará listo para manejar cualquier tipo de dilema y métrica futura de forma completamente escalable y profesional!
