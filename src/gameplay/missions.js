import { missionsState, conversations, currentContact } from '../state/index.js';
import { ui } from '../utils/dom.js';

let deps = null;

let arpeggioAudioCtx = null;
function playSuccessArpeggio() {
  try {
    if (!arpeggioAudioCtx) {
      arpeggioAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (arpeggioAudioCtx.state === 'suspended') arpeggioAudioCtx.resume();
    const t0 = arpeggioAudioCtx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      const osc = arpeggioAudioCtx.createOscillator();
      const gain = arpeggioAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0 + i * 0.1);
      gain.gain.setValueAtTime(0.12, t0 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(arpeggioAudioCtx.destination);
      osc.start(t0 + i * 0.1);
      osc.stop(t0 + i * 0.1 + 0.3);
    });
  } catch (e) {
    // Audio playback not available
  }
}

export function initMissions(dependencies) {
  deps = dependencies;
}

function addMessageSafe(contact, type, html) {
  if (typeof deps.addMessage === 'function') {
    deps.addMessage(contact, type, html);
  }
}

export function setMission(id, title, text) {
  missionsState.currentMissionId = id;
  missionsState.active = true;
  missionsState.completed = false;
  missionsState.doorbellTimer = 0;

  if (ui.missionsContainer) {
    ui.missionsContainer.setAttribute('aria-hidden', 'false');
    if (ui.missionTitle) ui.missionTitle.textContent = title;
    if (ui.missionText) ui.missionText.textContent = text;
    if (ui.missionCard) ui.missionCard.classList.remove('is-completed');
  }

  if (id === 'doorbell' && typeof deps.playDoorbell === 'function') {
    deps.playDoorbell();
  }
  if (id === 'tutorial') {
    if (typeof deps.playNotification === 'function') deps.playNotification();
    addTutorialMessage();
  }
}

export function completeMission(id) {
  if (missionsState.currentMissionId !== id || missionsState.completed) return;
  missionsState.completed = true;

  if (ui.missionCard) {
    ui.missionCard.classList.add('is-completed');
    playSuccessArpeggio();

    setTimeout(() => {
      if (missionsState.currentMissionId === id && ui.missionsContainer) {
        ui.missionsContainer.setAttribute('aria-hidden', 'true');
        missionsState.active = false;
      }
    }, 4000);
  }
}

export function updateMissions(dt) {
  if (
    missionsState.active &&
    !missionsState.completed &&
    missionsState.currentMissionId === 'doorbell' &&
    typeof deps.playDoorbell === 'function'
  ) {
    missionsState.doorbellTimer += dt;
    if (missionsState.doorbellTimer >= 6.0) {
      missionsState.doorbellTimer = 0;
      deps.playDoorbell();
    }
  }
}

export function addTutorialMessage() {
  const html = `<strong>📱 ¡Bienvenida, Mamá! 📱</strong><br><br>
Este celular es tuyo. Sé que al principio puede parecer complicado, pero vas a ver que no es tan difícil.<br><br>
Te explico rápido:<br><br>
😐 <strong>Fatiga:</strong> Usar el celular te cansa la vista y la cabeza. Si estás muy fatigada, la pantalla se pone borrosa. Descansá un rato y se te va a pasar.<br><br>
💰 <strong>Dinero:</strong> Es lo que tenés guardado. Te va a servir para lo que necesites.<br><br>
😊 <strong>Felicidad:</strong> Lo bien que te sentís. Cada decisión que tomes va a influir en cómo te sentís.<br><br>
😌 <strong>Calma:</strong> Tu tranquilidad interior. Las situaciones difíciles pueden alterarte.<br><br>
Las <strong>decisiones tienen consecuencias</strong>: cada cosa que elijas va a cambiar cómo te sentís y cómo le va a ir a la familia.<br><br>
Entrá a <strong>Mensajes</strong> para ver qué te escribí. ¡Ah! Y recordá: no importa cuánto tiempo te lleve entender todo, estoy acá para ayudarte. Te quiero, mamá. ❤️<br><br>
<em>PD: Presioná "Responder" cuando estés lista.</em>`;

  if (conversations.camilo) {
    conversations.camilo = conversations.camilo.filter((msg) => !msg.html.includes('¡Bienvenida, Mamá!'));
  }
  addMessageSafe('camilo', 'date-separator', 'Día 1');
  addMessageSafe('camilo', 'incoming', html);
}

export function showMartaReplyTutorial() {
  addMessageSafe(
    'camilo',
    'outgoing',
    `Camilito, gracias por el celular y por tu mensaje tan lindo. Con tu cariño me alcanza y sobra. Voy a tratar de aprender a usarlo, aunque me cueste. Te quiero mucho, hijo. ❤️`
  );
}

export function startClaraBirthdayMission() {
  setMission('readCamiloMessage', 'Mensaje de Camilo', 'Lee el mensaje de tu hijo Camilo en la aplicación de Mensajes.');
  addMessageSafe('camilo', 'date-separator', 'Día 2');
  addMessageSafe(
    'camilo',
    'incoming',
    `Hola mamá. ¿Cómo dormiste? 😊<br><br>Te escribo porque en 5 días es el cumpleaños de <strong>Clara</strong> 🎂 y quería recordarte que estás invitada a la casa para el festejo. ¿Ya sabés qué le regalarías?`
  );
}

export function startClaraBirthdayFlow() {
  const replyBox = ui.phoneChatReplyBox;
  if (!replyBox) return;

  replyBox.classList.remove('is-hidden');
  replyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-clara-reply="true">Responder</button>`;
}

export function triggerClaraGiftDialogue() {
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

  setTimeout(() => {
    addMessageSafe(
      'clara',
      'outgoing',
      `Hola Clara, ¿cómo estás? Tu papá me dijo que tu cumpleaños se acerca y quería saber qué te gustaría de regalo.`
    );

    setTimeout(() => {
      addMessageSafe(
        'clara',
        'incoming',
        `Hola abuela! 😊 Estoy re contenta. Sí, falta poquito. Me encantaría una <strong>Barbie futbolista edición mundial 2026</strong> ⚽💖`
      );

      setTimeout(() => {
        if (ui.phoneChatReplyBox && currentContact === 'clara' && missionsState.currentMissionId === 'claraGift') {
          ui.phoneChatReplyBox.classList.remove('is-hidden');
          ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-clara-how-to="true">Preguntar cómo conseguirla</button>`;
        }
      }, 1200);
    }, 1200);
  }, 500);
}

export function startDownloadMercadoLibreMission() {
  setMission('downloadMercadoLibre', 'Descargar MercadoLibre', 'Entrá a la Play Store y descargá la app oficial de MercadoLibre.');

  if (deps.installedAppsRef) {
    deps.installedAppsRef.playstore = true;
  }
  if (typeof deps.updateHome === 'function') {
    deps.updateHome();
  }
}

export function startDay4BuyMission() {
  setMission('buyGiftDay4', 'Comprar la muñeca', 'Entrá a MercadoLibre y comprá la muñeca para Clara.');

  if (deps.installedAppsRef) {
    deps.installedAppsRef.playstore = true;
    deps.installedAppsRef.mercadolibre = true;
  }
  if (typeof deps.updateHome === 'function') {
    deps.updateHome();
  }
}

export function startDownloadMarketplaceMission() {
  setMission('downloadMarketplace', 'Descargar Marketplace', 'MercadoLibre no tiene stock. Buscá la app oficial "Marketplace" en la Play Store y descargala.');
}

export function startBuyMarketplaceMission() {
  setMission('buyInMarketplace', 'Comprar la muñeca', 'Elegí una publicación confiable en Marketplace y comprá la muñeca para Clara.');
}

export function startUberMission() {
  setMission('orderUber', 'Pedir un Uber', 'Hoy es el cumpleaños de Clara. Abrí la app de Uber en tu teléfono y pedí un viaje para llegar a la fiesta.');
  addMessageSafe(
    'camilo',
    'incoming',
    '¡Mamá! Hoy es el cumpleaños de Clara 🎂 y la fiesta es dentro de un rato. Te instalé la app de <strong>Uber</strong> en el celular para que puedas ir. Abrila y pedí un viaje. ¡Te espero! ❤️'
  );
}
