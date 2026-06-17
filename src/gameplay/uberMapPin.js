import { ui } from '../utils/dom.js';
import { uberState, statsState } from '../state/index.js';
import { showToast } from '../utils/helpers.js';

let deps = null;
let active = false;
let gpsSearching = true;
let gpsSearchTimer = 0;
const GPS_SEARCH_DURATION = 2.0; // seconds

// Positions in canvas coordinates (320 x 240)
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

const startPin = { x: 50, y: 50 };
const targetHouse = { x: 250, y: 180 };
const suggestedPin = { x: 15, y: 15 }; // Move far away to the top-left corner
const SNAP_DISTANCE = 30; // Accept more margin (increased from 18)

let pin = { x: 50, y: 50 };
let visualPin = { x: 50, y: 50 };

let mapRotation = 0;
let timeElapsed = 0;

function getRotatedHousePos() {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const dx = targetHouse.x - cx;
  const dy = targetHouse.y - cy;
  const cos = Math.cos(mapRotation);
  const sin = Math.sin(mapRotation);
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

let popupActive = false;
let popupShown = false;
let popupTimer = 0;

let dpadInputs = { up: false, down: false, left: false, right: false };

export function initUberMapPin(dependencies) {
  deps = dependencies;
  attachListeners();
}

export function startUberMapPin(initialTime) {
  console.log('startUberMapPin called with initialTime:', initialTime);
  active = true;
  gpsSearching = true;
  gpsSearchTimer = 0;
  
  pin = { ...startPin };
  visualPin = { ...startPin };
  
  mapRotation = 0;
  timeElapsed = initialTime || 0;
  
  if (!uberState.startedAt || initialTime === 0) {
    uberState.startedAt = performance.now();
  }
  
  popupActive = false;
  popupShown = false;
  popupTimer = 0;
  
  dpadInputs = { up: false, down: false, left: false, right: false };

  const mazeContent = document.getElementById('uberMazeContent') || ui.uberMazeContent;
  const mapPinContent = document.getElementById('uberMapPinContent') || ui.uberMapPinContent;
  const gpsSearch = document.getElementById('uberMapGpsSearch') || ui.uberMapGpsSearch;
  const suggestedPopup = document.getElementById('uberSuggestedPopup') || ui.uberSuggestedPopup;

  if (mazeContent) mazeContent.classList.add('is-hidden');
  if (mapPinContent) mapPinContent.classList.remove('is-hidden');
  if (gpsSearch) gpsSearch.style.display = 'flex';
  if (suggestedPopup) suggestedPopup.classList.add('is-hidden');

  updateTimerHud();
  renderMap();
}

export function resetUberMapPin() {
  console.log('resetUberMapPin called');
  active = false;
  gpsSearching = false;
  dpadInputs = { up: false, down: false, left: false, right: false };
  const mapPinContent = document.getElementById('uberMapPinContent') || ui.uberMapPinContent;
  if (mapPinContent) mapPinContent.classList.add('is-hidden');
}

export function updateUberMapPin(dt) {
  if (!active) return;

  // Increment total elapsed time
  uberState.elapsed = (performance.now() - uberState.startedAt) / 1000;
  updateTimerHud();

  if (gpsSearching) {
    gpsSearchTimer += dt;
    if (gpsSearchTimer >= GPS_SEARCH_DURATION) {
      gpsSearching = false;
      if (ui.uberMapGpsSearch) ui.uberMapGpsSearch.style.display = 'none';
    }
    renderMap();
    return;
  }

  // Handle popup timer
  if (!popupShown) {
    popupTimer += dt;
    if (popupTimer >= 4.0) {
      popupActive = true;
      popupShown = true;
      if (ui.uberSuggestedPopup) ui.uberSuggestedPopup.classList.remove('is-hidden');
    }
  }

  // Handle D-pad input to move pin (Inverted / Scrambled Controls)
  // Right -> Up (-y)
  // Left -> Down (+y)
  // Up -> Right (+x)
  // Down -> Left (-x)
  const pinSpeed = 60; // pixels per second
  let dx = 0;
  let dy = 0;

  if (dpadInputs.up) dx += 1;
  if (dpadInputs.down) dx -= 1;
  if (dpadInputs.right) dy -= 1;
  if (dpadInputs.left) dy += 1;

  if (dx !== 0 || dy !== 0) {
    pin.x += dx * pinSpeed * dt;
    pin.y += dy * pinSpeed * dt;

    // Clamp pin position to canvas boundaries
    pin.x = Math.max(10, Math.min(CANVAS_WIDTH - 10, pin.x));
    pin.y = Math.max(10, Math.min(CANVAS_HEIGHT - 10, pin.y));
  }

  // GPS Slow Lag (visual position follows actual position with lerp)
  visualPin.x += (pin.x - visualPin.x) * 0.08;
  visualPin.y += (pin.y - visualPin.y) * 0.08;

  // Rotate map slowly back and forth
  mapRotation = Math.sin(performance.now() * 0.001) * 0.22;

  renderMap();
}

function updateTimerHud() {
  if (ui.uberMapTimer) {
    ui.uberMapTimer.textContent = uberState.elapsed.toFixed(1) + 's';
  }
}

function renderMap() {
  const canvas = document.getElementById('uberMapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  // Apply desorientation rotation around the center
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.rotate(mapRotation);
  ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

  // Draw street grid (blocks)
  ctx.fillStyle = '#1e293b';
  
  // Block 1 (Top-Left)
  drawRoundedRect(ctx, 15, 15, 120, 80, 8);
  // Block 2 (Top-Right)
  drawRoundedRect(ctx, 165, 15, 140, 80, 8);
  // Block 3 (Bottom-Left)
  drawRoundedRect(ctx, 15, 125, 120, 95, 8);
  // Block 4 (Bottom-Right)
  drawRoundedRect(ctx, 165, 125, 140, 95, 8);

  // Street names
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Horizontal street "Calle Cuba"
  ctx.fillText('Calle Cuba', CANVAS_WIDTH / 2, 110);
  
  // Horizontal street "Calle Echeverría"
  ctx.fillText('Calle Echeverría', CANVAS_WIDTH / 2, 5);

  // Vertical street "Av. Cabildo"
  ctx.save();
  ctx.translate(150, CANVAS_HEIGHT / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Av. Cabildo', 0, 0);
  ctx.restore();

  // Draw correct target house (green circle)
  const rotatedHouse = getRotatedHousePos();
  const isClose = Math.hypot(visualPin.x - rotatedHouse.x, visualPin.y - rotatedHouse.y) < SNAP_DISTANCE;
  
  ctx.beginPath();
  ctx.arc(targetHouse.x, targetHouse.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Target label
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('CASA', targetHouse.x, targetHouse.y - 2);
  ctx.font = '8px sans-serif';
  ctx.fillText('2342', targetHouse.x, targetHouse.y + 7);

  ctx.restore(); // Restore from rotation for drawing pins (keeping pins upright)

  // Draw visual pin (red pin)
  const pinX = visualPin.x;
  const pinY = visualPin.y;

  // Snapping aura
  if (isClose) {
    ctx.beginPath();
    ctx.arc(pinX, pinY - 4, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw Pin Icon (classic map teardrop)
  ctx.beginPath();
  ctx.arc(pinX, pinY - 12, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(pinX - 6, pinY - 12);
  ctx.lineTo(pinX, pinY);
  ctx.lineTo(pinX + 6, pinY - 12);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Center white dot on pin
  ctx.beginPath();
  ctx.arc(pinX, pinY - 12, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height - radius);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

export function isUberMapPinActive() {
  return active;
}

export function setMapPinInput(dir, activeState) {
  if (!active || gpsSearching) return;
  if (dir === 'up') dpadInputs.up = activeState;
  if (dir === 'down') dpadInputs.down = activeState;
  if (dir === 'left') dpadInputs.left = activeState;
  if (dir === 'right') dpadInputs.right = activeState;
}

function attachListeners() {
  // Map D-pad event listeners
  if (ui.uberMapDpad) {
    ui.uberMapDpad.querySelectorAll('.uber-dpad-btn').forEach((btn) => {
      const dir = btn.getAttribute('data-map-dir');
      
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMapPinInput(dir, true);
      };
      const release = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMapPinInput(dir, false);
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release);
    });
  }

  // Suggestion popup close (x)
  const closeBtn = document.getElementById('uberSuggestedClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popupActive = false;
      if (ui.uberSuggestedPopup) ui.uberSuggestedPopup.classList.add('is-hidden');
      showToast('Sugerencia rechazada');
    });
  }

  // Suggestion popup accept
  const acceptBtn = document.getElementById('uberSuggestedAccept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popupActive = false;
      if (ui.uberSuggestedPopup) ui.uberSuggestedPopup.classList.add('is-hidden');
      
      // Teleport pin far away!
      pin = { ...suggestedPin };
      showToast('Sugerencia aceptada. Pin movido al punto recomendado.');
    });
  }

  // Confusing Buttons
  // Confirm Location
  if (ui.uberConfirmLocationBtn) {
    ui.uberConfirmLocationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!active || gpsSearching) return;

      const rotatedHouse = getRotatedHousePos();
      const isClose = Math.hypot(visualPin.x - rotatedHouse.x, visualPin.y - rotatedHouse.y) < SNAP_DISTANCE;
      if (isClose) {
        // Successful confirmation!
        active = false;
        if (ui.uberMapPinContent) ui.uberMapPinContent.classList.add('is-hidden');
        
        // Calculate score
        const score = computeFinalScore(uberState.elapsed);
        
        if (deps && typeof deps.onWin === 'function') {
          deps.onWin(score, uberState.elapsed);
        }
      } else {
        // Warning
        showToast('Error: El pin debe estar en la puerta correcta (círculo verde CASA).');
        
        // Slight penalty
        statsState.calm = Math.max(0, statsState.calm - 3);
      }
    });
  }

  // Cancel Location (looks identical)
  if (ui.uberCancelLocationBtn) {
    ui.uberCancelLocationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!active || gpsSearching) return;

      // Resets the pin to the start and shows a disappointing message
      pin = { ...startPin };
      visualPin = { ...startPin };
      showToast('Viaje cancelado por el usuario. Ubique el pin nuevamente.');
      
      // Loss of calm!
      statsState.calm = Math.max(0, statsState.calm - 8);
    });
  }
}

function computeFinalScore(seconds) {
  // Map Pin game adds difficulty, so we give a slightly higher threshold
  if (seconds <= 120) return 100;
  if (seconds <= 180) return 75;
  if (seconds <= 240) return 50;
  return 25;
}
