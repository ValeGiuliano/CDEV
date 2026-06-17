import * as THREE from 'three';
import { MONEY_INITIAL } from '../config/constants.js';

export const gameState = {
  currentDay: 1,
};

export const moveState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

export const player = {
  velocity: new THREE.Vector3(),
  walkBob: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

export const phoneState = {
  active: false,
  progress: 0,
  wakeTimer: 0,
  sleepTimer: 0,
  wifiEnabled: true,
};

export const mlAdState = {
  phase: 0,
  adsCompleted: false,
  ad2TrueIndex: -1,
  ad3Clicks: 0,
  ad3MaxClicks: 5,
  ad3XPos: { top: '50%', left: '50%' },
};

export const statsState = {
  fatigue: 0,
  money: MONEY_INITIAL,
  happiness: 80,
  calm: 75,
};

export const missionsState = {
  currentMissionId: null,
  active: false,
  completed: false,
  doorbellTimer: 0,
};

export const conversations = {
  camilo: [],
  clara: [],
  soporteBna: [],
  bancoNacion: [],
};

export const installedApps = {
  messages: true,
  map: true,
  settings: true,
  playstore: false,
  mercadolibre: false,
  mercad0libre: false,
  browser: false,
  marketplace: false,
  marketpl4ce: false,
};

export const day3Scammed = { value: false };

export const day4State = {
  purchasedProduct: null,
  wasHacked: false,
  awaitingDelivery: false,
  deliveryResolved: false,
};

export const day4InitialMoney = { value: 100000 };

export const playstoreApps = [
  { id: 'mercad0libre', name: 'Mercad0Libre', dev: 'Mercado Libre', color: '#FFF600', label: 'M0' },
  { id: 'whatsapp', name: 'WhatsApp', dev: 'Meta Platforms', color: '#25D366', label: 'WA' },
  { id: 'instagram', name: 'Instagram', dev: 'Meta Platforms', color: '#E4405F', label: 'IG' },
  { id: 'spotify', name: 'Spotify', dev: 'Spotify AB', color: '#1DB954', label: 'Sp' },
  { id: 'netflix', name: 'Netflix', dev: 'Netflix, Inc.', color: '#E50914', label: 'N' },
  { id: 'mercadolibre', name: 'MercadoLibre', dev: 'Mercado Libre', color: '#FFF600', label: 'ML' },
  { id: 'marketplace', name: 'Marketplace', dev: 'Meta Platforms', color: '#1877F2', label: 'Mk' },
  { id: 'marketpl4ce', name: 'Marketpl4ce', dev: 'Marktplaace Inc.', color: '#7c3aed', label: 'M4' },
];

export const fraudDrainState = {
  active: false,
  startMoney: 0,
  elapsed: 0,
  duration: 5,
  lastAlert: 0,
};

export const cinematicState = {
  active: false,
  currentStep: 0,
  timer: 0,
  sequence: null,
  playedLivingCutscene: false,
  savedCamPos: new THREE.Vector3(),
  savedCamQuat: new THREE.Quaternion(),
  waitingForSpace: false,
};

export const dayTransitionState = {
  active: false,
  progress: 0,
  phase: 'fade-in',
  onEnd: null,
};

export let visualFatigueDisabled = false;
export function setVisualFatigueDisabled(v) {
  visualFatigueDisabled = v;
}

export let currentContact = null;
export function setCurrentContact(v) {
  currentContact = v;
}

export const dayRestarted = { value: false };
export function setDayRestarted(v) {
  dayRestarted.value = v;
}

export const doorState = {
  living: {
    open: false,
    group: { rotation: { y: 0 } },
    position: new THREE.Vector3(0.72, 0, -6.03),
    label: 'puerta exterior',
  },
};

export const bedState = {
  position: new THREE.Vector3(4.2, 0, 4.2),
  label: 'cama',
};
