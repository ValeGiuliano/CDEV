import * as THREE from 'three';
import { ui } from '../utils/dom.js';
import {
  phoneState,
  missionsState,
  conversations,
  currentContact,
  setCurrentContact,
  installedApps,
  statsState,
  gameState,
} from '../state/index.js';
import { phoneScreenCorners } from '../core/phone3d.js';
import { mlGiftsDilemma } from '../data/dilemmas.js';
import { hideKeyboard } from './keyboard.js';

let tablePhoneGroup = null;
let heldPhoneGroup = null;
let camera = null;
let canvas = null;
let callbacks = {};
let getUpdateStatsFn = null;
let activeDilemmaResolve = null;

const ANIM_START_POS = new THREE.Vector3(0, -0.6, -0.4);
const ANIM_START_ROT = new THREE.Euler(-Math.PI * 0.4, 0, 0);
const ANIM_END_POS = new THREE.Vector3(0, -0.02, -0.65);
const ANIM_END_ROT = new THREE.Euler(0, 0, 0);

export function initPhone(options) {
  tablePhoneGroup = options.tablePhoneGroup;
  heldPhoneGroup = options.heldPhoneGroup;
  camera = options.camera;
  canvas = options.canvas;
  callbacks = options.callbacks || {};
  getUpdateStatsFn = options.getUpdateStats || null;

  registerEventListeners();
}

function registerEventListeners() {
  if (ui.phoneAppBtns) {
    ui.phoneAppBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const app = btn.getAttribute('data-app');
        if (app === 'messages') {
          switchPhoneView('phoneMessagesView');
          renderContactList();
        }
        if (app === 'map') switchPhoneView('phoneMapView');
        if (app === 'settings') switchPhoneView('phoneSettingsView');
        if (app === 'playstore' && typeof callbacks.onOpenPlaystoreApp === 'function') {
          callbacks.onOpenPlaystoreApp();
        }
        if (app === 'mercadolibre' && typeof callbacks.onOpenMercadoLibreApp === 'function') {
          callbacks.onOpenMercadoLibreApp();
        }
        if (app === 'mercad0libre' && typeof callbacks.onOpenMercad0LibreApp === 'function') {
          callbacks.onOpenMercad0LibreApp();
        }
        if (app === 'browser' && typeof callbacks.onOpenBrowserApp === 'function') {
          callbacks.onOpenBrowserApp();
        }
      });
    });
  }

  if (ui.openMessagesBtn) {
    ui.openMessagesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPhoneView('phoneMessagesView');
      renderContactList();
    });
  }

  if (ui.phoneBackBtns) {
    ui.phoneBackBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const view = btn.closest('.phone-view');
        if (view && view.id === 'phoneMessagesView' && currentContact !== null) {
          renderContactList();
        } else {
          switchPhoneView('phoneHomeView');
          hideKeyboard();
        }
      });
    });
  }

  if (ui.phoneHomeBar) {
    ui.phoneHomeBar.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPhoneView('phoneHomeView');
      hideKeyboard();
    });
  }

  if (ui.phoneChatReplyBox) {
    ui.phoneChatReplyBox.addEventListener('click', (e) => {
      const btn = e.target.closest('#sendReplyBtn');
      if (!btn) return;
      e.stopPropagation();

      if (
        missionsState.currentMissionId === 'tutorial' &&
        !missionsState.completed &&
        typeof callbacks.onTutorialReply === 'function'
      ) {
        callbacks.onTutorialReply(btn);
        return;
      }

      if (btn.getAttribute('data-tutorial-accept') === 'true') {
        if (typeof callbacks.onTutorialAccept === 'function') callbacks.onTutorialAccept(btn);
        return;
      }
      if (btn.getAttribute('data-clara-reply') === 'true') {
        if (typeof callbacks.onClaraReply === 'function') callbacks.onClaraReply(btn);
        return;
      }
      if (btn.getAttribute('data-camilo-ok') === 'true') {
        if (typeof callbacks.onCamiloOk === 'function') callbacks.onCamiloOk(btn);
        return;
      }
      if (btn.getAttribute('data-clara-how-to') === 'true') {
        if (typeof callbacks.onClaraHowTo === 'function') callbacks.onClaraHowTo(btn);
        return;
      }
      if (
        btn.getAttribute('data-open-playstore') === 'true' &&
        typeof callbacks.onOpenPlaystoreFromReply === 'function'
      ) {
        callbacks.onOpenPlaystoreFromReply();
        return;
      }
      if (btn.getAttribute('data-soporte-bna-give-data') === 'true') {
        if (typeof callbacks.onSoporteBnaGiveData === 'function') callbacks.onSoporteBnaGiveData(btn);
        return;
      }
      if (btn.getAttribute('data-banco-nacion-verify') === 'true') {
        if (typeof callbacks.onBancoNacionVerify === 'function') callbacks.onBancoNacionVerify(btn);
        return;
      }
    });
  }

  if (ui.phoneUI) {
    ui.phoneUI.addEventListener('pointerdown', (e) => e.stopPropagation());
    ui.phoneUI.addEventListener('mousedown', (e) => e.stopPropagation());
    ui.phoneUI.addEventListener('touchstart', (e) => e.stopPropagation());
  }
}

export function togglePhone() {
  if (!canvas) return;
  if (missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
    return;
  }
  phoneState.active = !phoneState.active;
  if (phoneState.active) {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  } else {
    canvas.requestPointerLock();
  }
  if (ui.phonePrompt) {
    ui.phonePrompt.textContent = phoneState.active ? 'T Guardar teléfono' : 'T Coger teléfono';
    ui.phonePrompt.classList.toggle('is-active', phoneState.active);
  }
}

export function updatePhonePrompt() {
  const phoneAvailable =
    !missionsState.currentMissionId ||
    missionsState.currentMissionId !== 'doorbell' ||
    missionsState.completed;
  if (ui.phonePrompt) {
    if (phoneAvailable) {
      ui.phonePrompt.classList.add('is-visible');
    } else {
      ui.phonePrompt.classList.remove('is-visible');
    }
  }
}

export function updatePhoneAnimation(dt) {
  if (!tablePhoneGroup || !heldPhoneGroup) return;

  let target = 0;

  if (phoneState.active) {
    phoneState.sleepTimer = 0;
    target = 1;
    if (phoneState.progress > 0.95) {
      phoneState.wakeTimer += dt;
    }
  } else {
    phoneState.wakeTimer = 0;
    if (phoneState.progress > 0.05) {
      phoneState.sleepTimer += dt;
    }
    if (phoneState.sleepTimer < 0.2 && phoneState.progress > 0.9) {
      target = 1;
    } else {
      target = 0;
    }
  }

  const speed = 4.5;
  phoneState.progress += (target - phoneState.progress) * Math.min(1, dt * speed);

  if (phoneState.progress < 0.01 && !phoneState.active) {
    tablePhoneGroup.visible = true;
    heldPhoneGroup.visible = false;
    if (ui.phoneUI) {
      ui.phoneUI.classList.remove('is-visible');
      ui.phoneUI.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  tablePhoneGroup.visible = false;
  heldPhoneGroup.visible = true;

  const t = phoneState.progress;
  const ease = t * t * (3 - 2 * t);

  heldPhoneGroup.position.lerpVectors(ANIM_START_POS, ANIM_END_POS, ease);

  heldPhoneGroup.rotation.x = THREE.MathUtils.lerp(ANIM_START_ROT.x, ANIM_END_ROT.x, ease);
  heldPhoneGroup.rotation.y = THREE.MathUtils.lerp(ANIM_START_ROT.y, ANIM_END_ROT.y, ease);
  heldPhoneGroup.rotation.z = THREE.MathUtils.lerp(ANIM_START_ROT.z, ANIM_END_ROT.z, ease);

  if (ui.phoneUI) {
    const showUI = phoneState.active && phoneState.wakeTimer > 0.25;
    ui.phoneUI.classList.toggle('is-visible', showUI);
    ui.phoneUI.setAttribute('aria-hidden', !showUI);
  }
}

export function updatePhoneUISize() {
  if (!ui.phoneUI || !heldPhoneGroup || !heldPhoneGroup.visible || !camera) return;

  heldPhoneGroup.updateMatrixWorld(true);

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const tmp = new THREE.Vector3();

  phoneScreenCorners.forEach((corner) => {
    tmp.copy(corner).applyMatrix4(heldPhoneGroup.matrixWorld);
    tmp.project(camera);
    const px = ((tmp.x + 1) / 2) * window.innerWidth;
    const py = ((-tmp.y + 1) / 2) * window.innerHeight;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  });

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  ui.phoneUI.style.left = `${minX}px`;
  ui.phoneUI.style.top = `${minY}px`;
  ui.phoneUI.style.width = `${width}px`;
  ui.phoneUI.style.height = `${height}px`;
  ui.phoneUI.style.transform = 'none';
}

export function switchPhoneView(viewId) {
  if (!ui.phoneViews) return;
  ui.phoneViews.forEach((view) => {
    view.classList.toggle('is-active', view.id === viewId);
  });
}

export function updatePhoneHomeApps() {
  const psBtn = document.getElementById('playstoreAppBtn');
  const mlBtn = document.getElementById('mercadolibreAppBtn');
  const fakeBtn = document.getElementById('mercad0libreAppBtn');
  if (psBtn) psBtn.style.display = installedApps.playstore ? '' : 'none';
  if (mlBtn) mlBtn.style.display = installedApps.mercadolibre ? '' : 'none';
  if (fakeBtn) fakeBtn.style.display = installedApps.mercad0libre ? '' : 'none';
  const browserBtn = document.getElementById('browserAppBtn');
  if (browserBtn) browserBtn.style.display = installedApps.browser ? '' : 'none';
}

export function getLastPreview(contact) {
  if (!conversations[contact] || conversations[contact].length === 0) return '';
  const last = conversations[contact][conversations[contact].length - 1];
  const text = last.html.replace(/<[^>]*>/g, ' ').trim();
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

export function renderContactList() {
  const list = ui.phoneContactsList;
  if (!list) return;

  list.innerHTML = '';
  setCurrentContact(null);

  const contacts = [
    { id: 'camilo', name: 'Camilo', avatar: '👨', preview: getLastPreview('camilo'), bg: '#2563eb' },
    { id: 'clara', name: 'Clara', avatar: '👧', preview: getLastPreview('clara'), bg: '#ec4899' },
  ];

  if (gameState.currentDay === 3) {
    if (conversations.soporteBna && conversations.soporteBna.length > 0) {
      contacts.push({ id: 'soporteBna', name: 'Soporte BNA', avatar: '👤', preview: getLastPreview('soporteBna'), bg: '#ef4444' });
    }
    if (conversations.bancoNacion && conversations.bancoNacion.length > 0) {
      contacts.push({ id: 'bancoNacion', name: 'Banco Nación', avatar: '🏛️', preview: getLastPreview('bancoNacion'), bg: '#10b981' });
    }
  }

  contacts.forEach((contact) => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-avatar" style="background:${contact.bg}">${contact.avatar}</div>
      <div class="contact-info">
        <p class="contact-name">${contact.name}</p>
        <p class="contact-preview">${contact.preview}</p>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      openContactChat(contact.id);
    });
    list.appendChild(card);
  });

  if (ui.phoneChatContainer) ui.phoneChatContainer.style.display = 'none';
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.style.display = 'none';
  if (ui.phoneContactsList) ui.phoneContactsList.style.display = 'flex';
  if (ui.messagesTopbarTitle) ui.messagesTopbarTitle.textContent = 'Mensajes';
}

export function openContactChat(contact) {
  setCurrentContact(contact);

  if (ui.phoneContactsList) ui.phoneContactsList.style.display = 'none';
  if (ui.phoneChatContainer) ui.phoneChatContainer.style.display = 'flex';
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.style.display = 'block';

  const name = contact === 'camilo' ? 'Camilo' : 'Clara';
  if (ui.messagesTopbarTitle) ui.messagesTopbarTitle.textContent = name;

  renderConversation(contact);

  if (typeof callbacks.onOpenContactChat === 'function') {
    callbacks.onOpenContactChat(contact);
  }
}

export function addMessageToConversation(contact, type, html) {
  if (!conversations[contact]) conversations[contact] = [];
  conversations[contact].push({ type, html });

  if (currentContact === contact) {
    const container = ui.phoneChatContainer;
    if (!container) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = html;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  if (currentContact === null && ui.phoneContactsList && ui.phoneContactsList.style.display !== 'none') {
    renderContactList();
  }
}

export function renderConversation(contact) {
  const container = ui.phoneChatContainer;
  if (!container) return;
  container.innerHTML = '';
  if (!conversations[contact]) return;
  conversations[contact].forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.type}`;
    bubble.innerHTML = msg.html;
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

export function renderImpactBadges(container, effects) {
  if (!container) return;
  container.innerHTML = '';
  if (effects.money) {
    const b = document.createElement('span');
    b.className = `impact-badge ${effects.money > 0 ? 'pos' : 'neg'}`;
    b.textContent = `Dinero ${effects.money > 0 ? '+$' : '-$'}${Math.abs(effects.money)}`;
    container.appendChild(b);
  }
  if (effects.happiness) {
    const b = document.createElement('span');
    b.className = `impact-badge ${effects.happiness > 0 ? 'pos' : 'neg'}`;
    b.textContent = `Felicidad ${effects.happiness > 0 ? '+' : ''}${effects.happiness}%`;
    container.appendChild(b);
  }
  if (effects.calm) {
    const b = document.createElement('span');
    b.className = `impact-badge ${effects.calm > 0 ? 'pos' : 'neg'}`;
    b.textContent = `Calma ${effects.calm > 0 ? '+' : ''}${effects.calm}%`;
    container.appendChild(b);
  }
}

export function applyEffects(effects) {
  if (effects.money) statsState.money = Math.max(0, statsState.money + effects.money);
  if (effects.happiness) statsState.happiness = Math.max(0, Math.min(100, statsState.happiness + effects.happiness));
  if (effects.calm) statsState.calm = Math.max(0, Math.min(100, statsState.calm + effects.calm));
}

export function showDilemma(config, onResolve) {
  activeDilemmaResolve = onResolve;
  if (!ui.dilemmaModal) return;

  if (ui.dilemmaTitle) ui.dilemmaTitle.textContent = config.title;
  if (ui.dilemmaDesc) ui.dilemmaDesc.textContent = config.description;

  if (ui.optATitle) ui.optATitle.textContent = config.optionA.label;
  if (ui.optAPosDesc) ui.optAPosDesc.textContent = config.optionA.positive.description;
  renderImpactBadges(ui.optAPosImpact, config.optionA.positive.effects);
  if (ui.optANegDesc) ui.optANegDesc.textContent = config.optionA.negative.description;
  renderImpactBadges(ui.optANegImpact, config.optionA.negative.effects);

  if (ui.optBTitle) ui.optBTitle.textContent = config.optionB.label;
  if (ui.optBPosDesc) ui.optBPosDesc.textContent = config.optionB.positive.description;
  renderImpactBadges(ui.optBPosImpact, config.optionB.positive.effects);
  if (ui.optBNegDesc) ui.optBNegDesc.textContent = config.optionB.negative.description;
  renderImpactBadges(ui.optBNegImpact, config.optionB.negative.effects);

  if (config.optionC) {
    if (ui.optCTitle) ui.optCTitle.textContent = config.optionC.label;
    if (ui.optCPosDesc) ui.optCPosDesc.textContent = config.optionC.positive.description;
    renderImpactBadges(ui.optCPosImpact, config.optionC.positive.effects);
    if (ui.optCNegDesc) ui.optCNegDesc.textContent = config.optionC.negative.description;
    renderImpactBadges(ui.optCNegImpact, config.optionC.negative.effects);
    if (ui.optCContainer) ui.optCContainer.style.display = 'block';
    if (ui.btnSelectC) ui.btnSelectC.onclick = () => selectDilemmaOption(config.optionC);
  } else {
    if (ui.optCContainer) ui.optCContainer.style.display = 'none';
  }

  if (ui.btnSelectA) ui.btnSelectA.onclick = () => selectDilemmaOption(config.optionA);
  if (ui.btnSelectB) ui.btnSelectB.onclick = () => selectDilemmaOption(config.optionB);

  ui.dilemmaModal.setAttribute('aria-hidden', 'false');
}

export function selectDilemmaOption(option) {
  if (ui.dilemmaModal) ui.dilemmaModal.setAttribute('aria-hidden', 'true');

  const isSuccess = Math.random() < option.successRate;
  const outcome = isSuccess ? option.positive : option.negative;

  applyEffects(outcome.effects);

  if (!isSuccess && ui.damageOverlay) {
    ui.damageOverlay.classList.remove('is-active');
    void ui.damageOverlay.offsetWidth;
    ui.damageOverlay.classList.add('is-active');
  }

  if (ui.outcomeModal) {
    if (ui.outcomeDesc) ui.outcomeDesc.textContent = outcome.description;
    renderImpactBadges(ui.outcomeImpact, outcome.effects);
    if (ui.btnConfirmOutcome) {
      ui.btnConfirmOutcome.onclick = () => {
        ui.outcomeModal.setAttribute('aria-hidden', 'true');
        if (activeDilemmaResolve) activeDilemmaResolve();
      };
    }
    ui.outcomeModal.setAttribute('aria-hidden', 'false');
  } else {
    if (activeDilemmaResolve) activeDilemmaResolve();
  }
}

export function openMLGifts() {
  switchPhoneView('phoneHomeView');
  setTimeout(() => {
    showDilemma(mlGiftsDilemma, () => {
      if (typeof getUpdateStatsFn === 'function') getUpdateStatsFn(0);
      switchPhoneView('phoneMLHomeView');
    });
  }, 300);
}
