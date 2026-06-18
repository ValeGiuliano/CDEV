import { camera } from '../core/renderer.js';
import { doorState, missionsState } from '../state/index.js';

let doorPrompt = null;
let onOpenLivingDoor = null;

export function getNearbyDoor() {
  let nearest = null;
  let nearestDistance = Infinity;
  Object.entries(doorState).forEach(([id, door]) => {
    const distance = Math.hypot(
      camera.position.x - door.position.x,
      camera.position.z - door.position.z
    );
    if (distance < 1.35 && distance < nearestDistance) {
      nearest = { id, door };
      nearestDistance = distance;
    }
  });
  return nearest;
}

function toggleNearbyDoor() {
  const nearby = getNearbyDoor();
  if (!nearby) return;
  nearby.door.open = !nearby.door.open;

  const currentMission = missionsState.currentMissionId;
  const isDay4Delivery = currentMission === 'attendDelivery' && !missionsState.completed;
  const isDay1Doorbell = currentMission === 'doorbell' && !missionsState.completed;

  if (
    nearby.id === 'living' &&
    nearby.door.open &&
    (isDay1Doorbell || isDay4Delivery) &&
    typeof onOpenLivingDoor === 'function'
  ) {
    onOpenLivingDoor();
  }
}

export function initDoors({ doorPrompt: prompt, onOpenLivingDoor: cb }) {
  doorPrompt = prompt;
  onOpenLivingDoor = cb;
}

export function handleDoorKey() {
  if (!getNearbyDoor()) return false;
  toggleNearbyDoor();
  return true;
}

export function updateDoors(dt) {
  if (!doorPrompt) return;
  const livingTarget = doorState.living.open ? -Math.PI * 0.52 : 0;
  doorState.living.group.rotation.y +=
    (livingTarget - doorState.living.group.rotation.y) * Math.min(1, dt * 7);

  const nearby = getNearbyDoor();
  if (nearby) {
    doorPrompt.textContent = `E ${nearby.door.open ? 'Cerrar' : 'Abrir'} ${nearby.door.label}`;
    doorPrompt.classList.add('is-visible');
  } else {
    doorPrompt.classList.remove('is-visible');
  }
}
