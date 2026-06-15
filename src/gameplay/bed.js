import { camera } from '../core/renderer.js';
import { bedState } from '../state/index.js';
import { ui } from '../utils/dom.js';
import { getNearbyDoor } from './doors.js';

let bedPrompt = null;
let addMessageCb = null;
let sleepToNextDayCb = null;

function isNearBed() {
  const distance = Math.hypot(
    camera.position.x - bedState.position.x,
    camera.position.z - bedState.position.z
  );
  return distance < 1.8;
}

export function initBed({ bedPrompt: prompt, addMessage, sleepToNextDay }) {
  bedPrompt = prompt;
  addMessageCb = addMessage;
  sleepToNextDayCb = sleepToNextDay;
}

export function handleSleepKey() {
  if (!isNearBed()) return false;
  if (typeof sleepToNextDayCb === 'function') {
    sleepToNextDayCb();
  }
  return true;
}

export function updateBedPrompt() {
  if (!bedPrompt) return;
  if (isNearBed() && !getNearbyDoor()) {
    bedPrompt.textContent = 'E Dormir';
    bedPrompt.classList.add('is-visible');
  } else {
    bedPrompt.classList.remove('is-visible');
  }
}

export function showCamiloBedMessage() {
  if (typeof addMessageCb !== 'function') return;
  addMessageCb(
    'camilo',
    'incoming',
    `Mamá, me alegra que te haya gustado el celular. ¿Ves que no era tan difícil? 😄<br><br>Ah, y una cosa importante: la cama es para descansar entre día y día. Si no dormís bien, el tiempo no avanza. Es tu manera de recuperarte y empezar un nuevo día.<br><br>Bueno, ya te dejo descansar. Mañana seguimos hablando. Te quiere, Camilo. ❤️<br><br><em>PD: Cuando quieras terminar la noche, andá a la cama.</em>`
  );

  const replyBox = ui.phoneChatReplyBox;
  if (replyBox) {
    replyBox.classList.remove('is-hidden');
    replyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-tutorial-accept="true">Aceptar</button>`;
  }
}
