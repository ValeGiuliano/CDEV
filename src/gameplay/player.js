import * as THREE from 'three';
import { camera, lookEuler, canvas } from '../core/renderer.js';
import { moveState, doorState, player, cinematicState } from '../state/index.js';

const playerRadius = 0.28;

function inRect(x, z, rect) {
  return (
    x > rect.minX + playerRadius &&
    x < rect.maxX - playerRadius &&
    z > rect.minZ + playerRadius &&
    z < rect.maxZ - playerRadius
  );
}

function isPositionAllowed(x, z) {
  const living = { minX: -5.65, maxX: 5.65, minZ: -5.78, maxZ: 5.65 };
  const outside = { minX: -18.0, maxX: 18.0, minZ: -19.5, maxZ: -5.55 };

  // Doorway threshold bridge (allows crossing without collision gap blocks)
  if (doorState.living.open && x > -0.08 && x < 1.5 && z >= -6.2 && z <= -5.3) {
    return true;
  }

  if (inRect(x, z, living)) {
    if (z < -5.34 && x > -0.08 && x < 1.5) return doorState.living.open;
    if (z < -5.34 && (x <= -0.08 || x >= 1.5)) return false;
    return true;
  }

  if (doorState.living.open && inRect(x, z, outside)) return true;
  return false;
}

function resolveMovement(nextX, nextZ) {
  const currentX = camera.position.x;
  const currentZ = camera.position.z;
  if (isPositionAllowed(nextX, nextZ)) {
    camera.position.x = nextX;
    camera.position.z = nextZ;
    return;
  }
  if (isPositionAllowed(nextX, currentZ)) camera.position.x = nextX;
  if (isPositionAllowed(camera.position.x, nextZ)) camera.position.z = nextZ;
}

export function clampPlayerToBounds() {
  if (isPositionAllowed(camera.position.x, camera.position.z)) return;
  const fallback = new THREE.Vector3(-0.85, 1.58, 3.25);
  camera.position.x = fallback.x;
  camera.position.z = fallback.z;
}

export function setLookFromEuler() {
  camera.quaternion.setFromEuler(lookEuler);
}

export function updateFirstPerson(dt) {
  if (cinematicState.active) return;
  const movement = new THREE.Vector3();
  const forward = new THREE.Vector3(-Math.sin(lookEuler.y), 0, -Math.cos(lookEuler.y));
  const right = new THREE.Vector3(Math.cos(lookEuler.y), 0, -Math.sin(lookEuler.y));

  if (moveState.forward) movement.add(forward);
  if (moveState.back) movement.sub(forward);
  if (moveState.right) movement.add(right);
  if (moveState.left) movement.sub(right);

  const speed = 1.8;
  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed);
    player.velocity.lerp(movement, Math.min(1, dt * 8.0));
    player.walkBob += dt * 5.0;
  } else {
    player.velocity.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, dt * 10.0));
  }

  const nextX = camera.position.x + player.velocity.x * dt;
  const nextZ = camera.position.z + player.velocity.z * dt;
  resolveMovement(nextX, nextZ);

  const bob = Math.sin(player.walkBob) * Math.min(0.04, player.velocity.length() * 0.02);
  camera.position.y = 1.48 + bob;
  setLookFromEuler();
}

export function isDoorKey(event) {
  return event.code === 'KeyE' || event.key === 'e' || event.key === 'E';
}

const keyMap = {
  KeyW: 'forward',
  w: 'forward',
  W: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  s: 'back',
  S: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  a: 'left',
  A: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  d: 'right',
  D: 'right',
  ArrowRight: 'right',
};

export function getMoveDirection(event) {
  return keyMap[event.code] || keyMap[event.key];
}

export function updateLook(deltaX, deltaY) {
  const sensitivity = 0.0022;
  lookEuler.y -= deltaX * sensitivity;
  lookEuler.x -= deltaY * sensitivity;
  lookEuler.x = THREE.MathUtils.clamp(lookEuler.x, -Math.PI * 0.45, Math.PI * 0.32);
  setLookFromEuler();
}

function attachWalkButton(button, direction) {
  const setActive = (active) => {
    moveState[direction] = active;
    button.classList.toggle('is-active', active);
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setActive(true);
  });
  button.addEventListener('pointerup', () => setActive(false));
  button.addEventListener('pointercancel', () => setActive(false));
  button.addEventListener('lostpointercapture', () => setActive(false));
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    setActive(true);
  });
  button.addEventListener('mouseup', () => setActive(false));
  button.addEventListener('mouseleave', () => setActive(false));
  button.addEventListener('touchstart', (event) => {
    event.preventDefault();
    setActive(true);
  });
  button.addEventListener('touchend', () => setActive(false));
  button.addEventListener('touchcancel', () => setActive(false));
}

function releaseAllMoveState() {
  Object.keys(moveState).forEach((key) => {
    moveState[key] = false;
  });
}

export function initPlayer() {
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) {
      releaseAllMoveState();
    }
    if (document.pointerLockElement === canvas) {
      player.dragging = false;
    }
  });

  window.addEventListener('pointermove', (event) => {
    if (document.pointerLockElement === canvas) {
      updateLook(event.movementX, event.movementY);
    } else if (player.dragging) {
      updateLook(event.clientX - player.lastX, event.clientY - player.lastY);
      player.lastX = event.clientX;
      player.lastY = event.clientY;
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    canvas.focus();
    if (document.pointerLockElement !== canvas) {
      player.dragging = true;
      player.lastX = event.clientX;
      player.lastY = event.clientY;
    }
  });

  window.addEventListener('blur', () => {
    releaseAllMoveState();
  });

  ['moveForward', 'moveBack', 'moveLeft', 'moveRight'].forEach((id) => {
    const btn = document.querySelector(`#${id}`);
    if (btn) attachWalkButton(btn, id.replace('move', '').toLowerCase());
  });
}
