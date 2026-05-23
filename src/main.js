import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createIcons, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, DollarSign, Smile, Wind, Eye } from 'lucide';

createIcons({
  icons: {
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    DollarSign,
    Smile,
    Wind,
    Eye,
  },
});

const canvas = document.querySelector('#experience');
document.body.tabIndex = 0;
document.body.focus();
canvas.tabIndex = 0;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xabe3f8);
scene.fog = new THREE.Fog(0xabe3f8, 12, 45);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(-0.85, 1.58, 3.25);
scene.add(camera);

const clock = new THREE.Clock();
const lookEuler = new THREE.Euler(-0.08, -0.28, 0, 'YXZ');
const gltfLoader = new GLTFLoader();
const moveState = {
  forward: false,
  back: false,
  left: false,
  right: false,
};
const player = {
  velocity: new THREE.Vector3(),
  walkBob: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
};
const phoneState = {
  active: false,
  progress: 0,
  wakeTimer: 0,
  sleepTimer: 0,
};

const statsState = {
  fatigue: 0,
  money: 500,
  happiness: 80,
  calm: 75,
};

const ui = {
  doorPrompt: document.querySelector('#doorPrompt'),
  phonePrompt: document.querySelector('#phonePrompt'),
  phoneUI: document.querySelector('#phoneUI'),
  phoneViews: document.querySelectorAll('.phone-view'),
  phoneAppBtns: document.querySelectorAll('.phone-app-btn'),
  phoneBackBtns: document.querySelectorAll('.phone-back-btn'),
  phoneHomeBar: document.querySelector('#phoneHomeBar'),
  openMessagesBtn: document.querySelector('#openMessagesBtn'),
  sendReplyBtn: document.querySelector('#sendReplyBtn'),
  replyBubble: document.querySelector('#replyBubble'),
  fatigueValue: document.querySelector('#fatigueValue'),
  fatigueFill: document.querySelector('#fatigueFill'),
  moneyValue: document.querySelector('#moneyValue'),
  happinessValue: document.querySelector('#happinessValue'),
  happinessFill: document.querySelector('#happinessFill'),
  calmValue: document.querySelector('#calmValue'),
  calmFill: document.querySelector('#calmFill'),
  dilemmaModal: document.querySelector('#dilemmaModal'),
  dilemmaTitle: document.querySelector('#dilemmaTitle'),
  dilemmaDesc: document.querySelector('#dilemmaDesc'),
  optATitle: document.querySelector('#optATitle'),
  optAPosDesc: document.querySelector('#optAPosDesc'),
  optAPosImpact: document.querySelector('#optAPosImpact'),
  optANegDesc: document.querySelector('#optANegDesc'),
  optANegImpact: document.querySelector('#optANegImpact'),
  btnSelectA: document.querySelector('#btnSelectA'),
  optBTitle: document.querySelector('#optBTitle'),
  optBPosDesc: document.querySelector('#optBPosDesc'),
  optBPosImpact: document.querySelector('#optBPosImpact'),
  optBNegDesc: document.querySelector('#optBNegDesc'),
  optBNegImpact: document.querySelector('#optBNegImpact'),
  btnSelectB: document.querySelector('#btnSelectB'),
  outcomeModal: document.querySelector('#outcomeModal'),
  outcomeDesc: document.querySelector('#outcomeDesc'),
  outcomeImpact: document.querySelector('#outcomeImpact'),
  btnConfirmOutcome: document.querySelector('#btnConfirmOutcome'),
  experienceCanvas: document.querySelector('#experience'),
  damageOverlay: document.querySelector('#damageOverlay'),
  cinematicOverlay: document.querySelector('#cinematicOverlay'),
  cinematicSpeaker: document.querySelector('#cinematicSpeaker'),
  cinematicText: document.querySelector('#cinematicText'),
  cinematicPrompt: document.querySelector('#cinematicPrompt'),
  missionsContainer: document.querySelector('#missionsContainer'),
  missionCard: document.querySelector('#missionCard'),
  missionTitle: document.querySelector('#missionTitle'),
  missionText: document.querySelector('#missionText'),
  introOverlay: document.querySelector('#introOverlay'),
  introFade: document.querySelector('#introFade'),
  startBtn: document.querySelector('#startBtn'),
};

const missionsState = {
  currentMissionId: null,
  active: false,
  completed: false,
  doorbellTimer: 0,
};

function playDoorbellSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t0 = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, t0);
    gain1.gain.setValueAtTime(0.25, t0);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc1.connect(gain1); gain1.connect(audioCtx.destination);
    osc1.start(t0); osc1.stop(t0 + 0.5);

    const t1 = t0 + 0.4;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(550, t1);
    gain2.gain.setValueAtTime(0.25, t1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t1 + 0.7);
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.start(t1); osc2.stop(t1 + 0.7);
  } catch (e) { }
}

function setMission(id, title, text) {
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

  if (id === 'doorbell') {
    playDoorbellSound();
  }
}

function completeMission(id) {
  if (missionsState.currentMissionId !== id || missionsState.completed) return;
  missionsState.completed = true;

  if (ui.missionCard) {
    ui.missionCard.classList.add('is-completed');
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      [440, 554, 659, 880].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t0 + i * 0.1);
        gain.gain.setValueAtTime(0.12, t0 + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.1 + 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t0 + i * 0.1); osc.stop(t0 + i * 0.1 + 0.3);
      });
    } catch (e) { }

    setTimeout(() => {
      if (missionsState.currentMissionId === id && ui.missionsContainer) {
        ui.missionsContainer.setAttribute('aria-hidden', 'true');
        missionsState.active = false;
      }
    }, 4000);
  }
}

function updateMissions(dt) {
  if (missionsState.active && !missionsState.completed && missionsState.currentMissionId === 'doorbell') {
    missionsState.doorbellTimer += dt;
    if (missionsState.doorbellTimer >= 6.0) {
      missionsState.doorbellTimer = 0;
      playDoorbellSound();
    }
  }
}

function makeCanvasTexture(draw, size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function noise(ctx, size, alpha = 0.08) {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const textures = {
  floor: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#625b4b';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 64) {
      ctx.fillStyle = y % 128 === 0 ? '#706650' : '#544936';
      ctx.fillRect(0, y, s, 60);
      ctx.strokeStyle = 'rgba(23,24,20,.38)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, y, s, 60);
      for (let x = 0; x < s; x += 98) {
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.bezierCurveTo(x + 28, y + 16, x + 56, y + 44, x + 95, y + 52);
        ctx.strokeStyle = 'rgba(219,214,185,.13)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    noise(ctx, s, 0.045);
  }),
  wall: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#cbd7d0';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#dde5df';
    ctx.fillRect(0, 0, s, s * 0.62);
    ctx.fillStyle = '#8ea59a';
    ctx.fillRect(0, s * 0.62, s, s * 0.38);
    ctx.strokeStyle = 'rgba(58,78,70,.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.62);
    ctx.lineTo(s, s * 0.62);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    for (let y = 42; y < s * 0.58; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(58,78,70,.12)';
    for (let x = 0; x < s; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, s * 0.64);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    noise(ctx, s, 0.025);
  }),
  fabric: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#3d746c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < s; i += 18) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s * 0.5, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i + s * 0.35);
      ctx.stroke();
    }
    noise(ctx, s, 0.055);
  }),
  rug: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#a63d40';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#f0c987';
    ctx.lineWidth = 16;
    ctx.strokeRect(28, 28, s - 56, s - 56);
    ctx.lineWidth = 5;
    for (let i = 58; i < s - 58; i += 38) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, i / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    noise(ctx, s, 0.06);
  }),
  paper: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#efe6d0';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#293438';
    for (let y = 58; y < s - 32; y += 28) ctx.fillRect(42, y, s - 84, 5);
    ctx.fillRect(42, 28, s * 0.54, 12);
    ctx.fillStyle = '#b94343';
    ctx.fillRect(s - 130, 26, 84, 84);
    noise(ctx, s, 0.045);
  }),
  phoneScreen: makeCanvasTexture((ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(1, '#1f2937');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('12:45', 40, 38);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(s - 65, 22, 32, 16);
    ctx.fillRect(s - 61, 25, 24, 10);
    ctx.fillRect(s - 32, 27, 4, 6);

    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Inter, sans-serif';
    ctx.fillText('12:45', s / 2, 160);
    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Sábado, 16 de Mayo', s / 2, 210);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawRoundRect(ctx, 32, 260, s - 64, 115, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('MENSAJE NUEVO', 56, 295);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('Hijo', 56, 328);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('Hola mamá, ¿cómo estás?', 56, 355);

    const iconColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'];
    const iconSpace = (s - 64 - 4 * 70) / 3;
    for (let i = 0; i < 4; i++) {
      const x = 32 + i * (70 + iconSpace);
      ctx.fillStyle = iconColors[i];
      drawRoundRect(ctx, x, s - 120, 70, 70, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 35, s - 85, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }),
  street: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#657177';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 4;
    for (let y = 0; y < s; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + 22);
      ctx.stroke();
    }
    noise(ctx, s, 0.07);
  }),
  exteriorWall: makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#ebdccb'; // Color arena beige cálido y premium
    ctx.fillRect(0, 0, s, s);
    // Sutil textura granulada de revoque fino en lugar de manchas circulares
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(Math.random() * s, Math.random() * s, Math.random() * 4 + 2, Math.random() * 4 + 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(Math.random() * s, Math.random() * s, Math.random() * 4 + 2, Math.random() * 4 + 2);
    }
    noise(ctx, s, 0.035); // Ruido sutil y elegante
  }),
};
textures.floor.repeat.set(5, 5);
textures.wall.repeat.set(3, 2);
textures.rug.repeat.set(1, 1);
textures.street.repeat.set(3, 6);
textures.exteriorWall.repeat.set(4, 2);

const materials = {
  floor: new THREE.MeshStandardMaterial({ map: textures.floor, roughness: 0.72 }),
  wall: new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 0.88 }),
  fabric: new THREE.MeshStandardMaterial({ map: textures.fabric, roughness: 0.92 }),
  rug: new THREE.MeshStandardMaterial({ map: textures.rug, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6f4a2e, roughness: 0.65 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15191a, roughness: 0.55 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa6a19b, metalness: 0.35, roughness: 0.32 }),
  paper: new THREE.MeshStandardMaterial({ map: textures.paper, roughness: 0.8 }),
  phoneScreen: new THREE.MeshBasicMaterial({ map: textures.phoneScreen, side: THREE.DoubleSide }),
  phoneScreenOff: new THREE.MeshStandardMaterial({ color: 0x080a0c, roughness: 0.18, metalness: 0.8 }),
  phoneCase: new THREE.MeshStandardMaterial({ color: 0x3a4248, metalness: 0.55, roughness: 0.45 }),
  warmLight: new THREE.MeshStandardMaterial({ color: 0xffc46e, emissive: 0xffa83d, emissiveIntensity: 1.1 }),
  street: new THREE.MeshStandardMaterial({ map: textures.street, roughness: 0.84 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0xcbd7d0, roughness: 0.86, side: THREE.DoubleSide }),
  tile: new THREE.MeshStandardMaterial({ color: 0xb8c5bd, roughness: 0.82 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0x53675d, roughness: 0.72 }),
  exteriorWall: new THREE.MeshStandardMaterial({ map: textures.exteriorWall, roughness: 0.9, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ color: 0x2b3136, roughness: 0.8 }),
  curtain: new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.95, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  slate: new THREE.MeshStandardMaterial({ color: 0x23292f, roughness: 0.5, metalness: 0.1 }),
};

const room = new THREE.Group();
const outdoor = new THREE.Group();
const exterior = new THREE.Group();
scene.add(room, outdoor, exterior);

// --- Marta (Third Person Model — visible during intro) ---
const martaModel = new THREE.Group();
martaModel.position.set(-2.9, 0, -2.0);
martaModel.rotation.y = Math.PI * 0.15;

const martaSkinMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.55 });
const martaDressMat = new THREE.MeshStandardMaterial({ color: 0x6b4c7d, roughness: 0.85 });
const martaCardiganMat = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.75 });
const martaHairMat = new THREE.MeshStandardMaterial({ color: 0xdcd5cc, roughness: 0.9 });

// Skirt / seated lower body
const martaSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.32, 16), martaDressMat);
martaSkirt.position.y = 0.76;
martaSkirt.castShadow = true;
martaModel.add(martaSkirt);

// Torso
const martaTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.38, 16), martaCardiganMat);
martaTorso.position.y = 1.11;
martaTorso.castShadow = true;
martaModel.add(martaTorso);

// Head
const martaHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), martaSkinMat);
martaHead.position.y = 1.42;
martaHead.castShadow = true;
martaModel.add(martaHead);

// Hair (white bun)
const martaHair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), martaHairMat);
martaHair.position.set(0, 1.49, -0.03);
martaHair.scale.set(1, 0.8, 1);
martaHair.castShadow = true;
martaModel.add(martaHair);

// Arms resting
const martaArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.32, 10), martaCardiganMat);
martaArmL.position.set(-0.2, 0.98, 0.02);
martaArmL.rotation.z = 0.35;
martaArmL.castShadow = true;
martaModel.add(martaArmL);

const martaArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.32, 10), martaCardiganMat);
martaArmR.position.set(0.2, 0.98, 0.02);
martaArmR.rotation.z = -0.35;
martaArmR.castShadow = true;
martaModel.add(martaArmR);

martaModel.visible = false;
room.add(martaModel);

function mesh(geometry, material, position, rotation = [0, 0, 0], cast = true, receive = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function createCutoutWall(width, height, position, material, rotation = [0, 0, 0], totalWidth = 12, totalHeight = 4.2, startX = -6, startY = 0) {
  const geom = new THREE.PlaneGeometry(width, height);
  const posArr = geom.attributes.position.array;
  const uvArr = geom.attributes.uv.array;
  const numVerts = uvArr.length / 2;
  for (let k = 0; k < numVerts; k++) {
    const localX = posArr[k * 3];
    const localY = posArr[k * 3 + 1];
    const worldX = position[0] + localX;
    const worldY = position[1] + localY;
    uvArr[k * 2] = (worldX - startX) / totalWidth;
    uvArr[k * 2 + 1] = (worldY - startY) / totalHeight;
  }
  geom.attributes.uv.needsUpdate = true;
  return mesh(geom, material, position, rotation, false);
}

function addBox(parent, size, material, position, rotation = [0, 0, 0]) {
  const m = mesh(new THREE.BoxGeometry(...size), material, position, rotation);
  parent.add(m);
  return m;
}

function addRoundedCylinder(parent, radius, height, material, position, rotation = [0, 0, 0], segments = 32) {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material, position, rotation);
  parent.add(m);
  return m;
}

room.add(mesh(new THREE.PlaneGeometry(12, 12), materials.floor, [0, 0, 0], [-Math.PI / 2, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(12, 12), materials.plaster, [0, 4.18, 0], [Math.PI / 2, 0, 0], false, false));

// Paredes interiores traseras (cutout para puerta, ventana grande y ventana de cocina más chica, miran hacia adentro)
room.add(createCutoutWall(2.1, 4.2, [-4.95, 2.1, -6], materials.wall));
room.add(createCutoutWall(1.99, 4.2, [-1.105, 2.1, -6], materials.wall));
room.add(createCutoutWall(1.8, 1.24, [-3.0, 0.62, -6], materials.wall));
room.add(createCutoutWall(1.8, 0.74, [-3.0, 3.83, -6], materials.wall));

room.add(createCutoutWall(1.41, 4.2, [2.255, 2.1, -6], materials.wall));
room.add(createCutoutWall(1.66, 1.96, [0.72, 3.22, -6], materials.wall));
room.add(createCutoutWall(0.34, 4.2, [5.83, 2.1, -6], materials.wall));
room.add(createCutoutWall(2.86, 1.24, [4.35, 0.62, -6], materials.wall));
room.add(createCutoutWall(2.86, 0.58, [4.35, 3.91, -6], materials.wall));

// Paredes interiores laterales con cutout para las nuevas ventanas laterales (miran hacia adentro)
room.add(createCutoutWall(4.6, 4.2, [-6, 2.1, -3.7], materials.wall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(4.6, 4.2, [-6, 2.1, 3.7], materials.wall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 1.24, [-6, 0.62, 0], materials.wall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 0.74, [-6, 3.83, 0], materials.wall, [0, Math.PI / 2, 0]));

room.add(createCutoutWall(4.6, 4.2, [6, 2.1, -3.7], materials.wall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(4.6, 4.2, [6, 2.1, 3.7], materials.wall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 1.24, [6, 0.62, 0], materials.wall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 0.74, [6, 3.83, 0], materials.wall, [0, -Math.PI / 2, 0]));

// Pared interior frontal (detrás de la cámara, mira hacia adentro)
room.add(mesh(new THREE.PlaneGeometry(12, 4.2), materials.wall, [0, 2.1, 6], [0, Math.PI, 0], false));

// --- PAREDES EXTERIORES (FACHADA PROCEDURAL) ---
const extZ = -6.01;
const extRot = [0, Math.PI, 0];
// Paredes traseras exteriores con cutout (rotadas 180 grados en Y, manteniendo las mismas coordenadas X para alinear aberturas)
room.add(createCutoutWall(2.1, 4.2, [-4.95, 2.1, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(1.99, 4.2, [-1.105, 2.1, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(1.8, 1.24, [-3.0, 0.62, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(1.8, 0.74, [-3.0, 3.83, extZ], materials.exteriorWall, extRot));

room.add(createCutoutWall(1.41, 4.2, [2.255, 2.1, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(1.66, 1.96, [0.72, 3.22, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(0.34, 4.2, [5.83, 2.1, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(2.86, 1.24, [4.35, 0.62, extZ], materials.exteriorWall, extRot));
room.add(createCutoutWall(2.86, 0.58, [4.35, 3.91, extZ], materials.exteriorWall, extRot));

// Paredes laterales exteriores con cutout para las nuevas ventanas (rotadas hacia afuera)
room.add(createCutoutWall(4.6, 4.2, [-6.01, 2.1, -3.7], materials.exteriorWall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(4.6, 4.2, [-6.01, 2.1, 3.7], materials.exteriorWall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 1.24, [-6.01, 0.62, 0], materials.exteriorWall, [0, -Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 0.74, [-6.01, 3.83, 0], materials.exteriorWall, [0, -Math.PI / 2, 0]));

room.add(createCutoutWall(4.6, 4.2, [6.01, 2.1, -3.7], materials.exteriorWall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(4.6, 4.2, [6.01, 2.1, 3.7], materials.exteriorWall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 1.24, [6.01, 0.62, 0], materials.exteriorWall, [0, Math.PI / 2, 0]));
room.add(createCutoutWall(2.8, 0.74, [6.01, 3.83, 0], materials.exteriorWall, [0, Math.PI / 2, 0]));

// --- ESTRUCTURA DE TECHO A DOS AGUAS ESTILIZADO ---
const roofGroup = new THREE.Group();
room.add(roofGroup);

// Panel de techo izquierdo (inclinado)
const roofLeft = addBox(roofGroup, [6.4, 0.15, 12.5], materials.roof, [-3.0, 4.75, 0], [0, 0, 11 * Math.PI / 180]);
// Panel de techo derecho (inclinado)
const roofRight = addBox(roofGroup, [6.4, 0.15, 12.5], materials.roof, [3.0, 4.75, 0], [0, 0, -11 * Math.PI / 180]);

// Vigas de soporte de madera del techo en los bordes
addBox(roofGroup, [0.15, 0.15, 12.6], materials.wood, [0, 5.25, 0]); // Viga cumbrera
addBox(roofGroup, [0.12, 0.12, 12.6], materials.wood, [-6.1, 4.15, 0]); // Alero izquierdo
addBox(roofGroup, [0.12, 0.12, 12.6], materials.wood, [6.1, 4.15, 0]);  // Alero derecho

// Tímpano triangular delantero (z = 6.02)
// Tímpano triangular del techo (geometría local en Z = 0)
const triangleGeom = new THREE.BufferGeometry();
const vertices = new Float32Array([
  -6.0, 4.2, 0,
   6.0, 4.2, 0,
   0.0, 5.3, 0
]);
triangleGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
// Configurar UVs simples
const uvs = new Float32Array([
  0, 0,
  1, 0,
  0.5, 1
]);
triangleGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
triangleGeom.computeVertexNormals();

// Tímpano trasero (frente a la calle en z = -6.02, rotado 180° en Y para mirar al exterior)
const tympanumBack = mesh(triangleGeom, materials.exteriorWall, [0, 0, -6.02], [0, Math.PI, 0], false);
room.add(tympanumBack);

// Tímpano delantero (frente al fondo en z = 6.02, mirando hacia afuera)
const tympanumFront = mesh(triangleGeom.clone(), materials.exteriorWall, [0, 0, 6.02], [0, 0, 0], false);
room.add(tympanumFront);

// --- DETALLES EXTERIORES (ENTRADA) ---
// Farol exterior con luz cálida
const outdoorLight = new THREE.PointLight(0xffb74d, 1.8, 8);
outdoorLight.position.set(1.72, 2.5, -6.2);
outdoorLight.castShadow = true;
outdoorLight.shadow.bias = -0.002;
outdoor.add(outdoorLight);

// Carcasa del farol
addBox(outdoor, [0.08, 0.08, 0.15], materials.metal, [1.72, 2.5, -6.1]);
const lanternBody = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), materials.metal, [1.72, 2.4, -6.2]);
const lanternBulb = mesh(new THREE.SphereGeometry(0.04, 8, 8), materials.warmLight, [1.72, 2.32, -6.2]);
outdoor.add(lanternBody, lanternBulb);

// Felpudo "HOLA"
const matText = makeCanvasTexture((ctx, s) => {
  ctx.fillStyle = '#7c5a3d'; // Color fibra coco
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#5a3d24';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, s - 12, s - 12);
  ctx.fillStyle = '#dbb593';
  ctx.font = 'bold 38px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('HOLA', s / 2, s / 2 + 13);
  noise(ctx, s, 0.12);
});
const welcomeMat = mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshStandardMaterial({ map: matText, roughness: 0.95 }), [0.72, 0.02, -6.6], [-Math.PI / 2, 0, 0], false);
outdoor.add(welcomeMat);

// Arbustos low-poly en macetas modernas
function createTopiary(parent, x, z) {
  const topiaryGroup = new THREE.Group();
  topiaryGroup.position.set(x, 0, z);
  parent.add(topiaryGroup);
  
  // Maceta geométrica de concreto oscuro
  addRoundedCylinder(topiaryGroup, 0.22, 0.35, new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.8 }), [0, 0.175, 0], [0, 0, 0], 12);
  // Tallo de madera
  addRoundedCylinder(topiaryGroup, 0.03, 0.4, materials.wood, [0, 0.4, 0], [0, 0, 0], 8);
  // Follaje (esferas de hojas apiladas con estilo low-poly/flatShading)
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.9, flatShading: true });
  const bush1 = mesh(new THREE.DodecahedronGeometry(0.32, 1), leavesMat, [0, 0.7, 0]);
  const bush2 = mesh(new THREE.DodecahedronGeometry(0.24, 1), leavesMat, [0, 0.98, 0]);
  topiaryGroup.add(bush1, bush2);
}
createTopiary(outdoor, -1.2, -6.6);
createTopiary(outdoor, 2.7, -6.6);
const windowGlass = mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.12, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), [4.35, 2.45, -5.98], [0, 0, 0], false, false);
room.add(windowGlass);
// Alféizar inferior (Sill) robusto que sobresale levemente
addBox(room, [2.96, 0.12, 0.26], materials.wood, [4.35, 1.28, -5.91]);
// Marco superior (Header)
addBox(room, [2.96, 0.12, 0.18], materials.wood, [4.35, 3.60, -5.95]);
// Jambas laterales (Left & Right jambs)
addBox(room, [0.12, 2.24, 0.18], materials.wood, [2.93, 2.44, -5.95]);
addBox(room, [0.12, 2.24, 0.18], materials.wood, [5.77, 2.44, -5.95]);
// Parteluz y travesaño central (Mullions)
addBox(room, [0.06, 2.24, 0.14], materials.wood, [4.35, 2.44, -5.95]);
addBox(room, [2.72, 0.06, 0.14], materials.wood, [4.35, 2.44, -5.95]);

// --- NUEVA VENTANA LATERAL IZQUIERDA (X = -6) ---
const windowGlassL = mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.12, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), [-5.98, 2.45, 0], [0, Math.PI / 2, 0], false, false);
room.add(windowGlassL);
// Alféizar
addBox(room, [0.26, 0.12, 2.96], materials.wood, [-5.91, 1.28, 0]);
// Marco superior
addBox(room, [0.18, 0.12, 2.96], materials.wood, [-5.95, 3.60, 0]);
// Jambas laterales
addBox(room, [0.18, 2.24, 0.12], materials.wood, [-5.95, 2.44, -1.42]);
addBox(room, [0.18, 2.24, 0.12], materials.wood, [-5.95, 2.44, 1.42]);
// Parteluz y travesaño central
addBox(room, [0.14, 2.24, 0.06], materials.wood, [-5.95, 2.44, 0]);
addBox(room, [0.14, 0.06, 2.72], materials.wood, [-5.95, 2.44, 0]);

// --- NUEVA VENTANA LATERAL DERECHA (X = 6) ---
const windowGlassR = mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.12, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), [5.98, 2.45, 0], [0, -Math.PI / 2, 0], false, false);
room.add(windowGlassR);
// Alféizar
addBox(room, [0.26, 0.12, 2.96], materials.wood, [5.91, 1.28, 0]);
// Marco superior
addBox(room, [0.18, 0.12, 2.96], materials.wood, [5.95, 3.60, 0]);
// Jambas laterales
addBox(room, [0.18, 2.24, 0.12], materials.wood, [5.95, 2.44, -1.42]);
addBox(room, [0.18, 2.24, 0.12], materials.wood, [5.95, 2.44, 1.42]);
// Parteluz y travesaño central
addBox(room, [0.14, 2.24, 0.06], materials.wood, [5.95, 2.44, 0]);
addBox(room, [0.14, 0.06, 2.72], materials.wood, [5.95, 2.44, 0]);

// --- NUEVA VENTANA DE LA COCINA EN LA PARED TRASERA (X = -3.0) ---
const windowGlassKitchen = mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.12, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), [-3.0, 2.45, -5.98], [0, 0, 0], false, false);
room.add(windowGlassKitchen);
// Alféizar
addBox(room, [1.96, 0.12, 0.26], materials.wood, [-3.0, 1.28, -5.91]);
// Marco superior
addBox(room, [1.96, 0.12, 0.18], materials.wood, [-3.0, 3.60, -5.95]);
// Jambas laterales
addBox(room, [0.12, 2.24, 0.18], materials.wood, [-3.91, 2.44, -5.95]);
addBox(room, [0.12, 2.24, 0.18], materials.wood, [-2.09, 2.44, -5.95]);
// Parteluz y travesaño central (Mullion simple)
addBox(room, [0.06, 2.24, 0.14], materials.wood, [-3.0, 2.44, -5.95]);
addBox(room, [1.72, 0.06, 0.14], materials.wood, [-3.0, 2.44, -5.95]);

// --- PARCHES DE ILUMINACIÓN SOLAR EN EL SUELO ---
const sunPatch = mesh(new THREE.PlaneGeometry(2.5, 4.2), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }), [3.35, 0.026, -1.45], [-Math.PI / 2, 0, 0.24], false, false);
const sunPatchLeft = mesh(new THREE.PlaneGeometry(3.5, 2.5), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), [-2.5, 0.026, 0.5], [-Math.PI / 2, 0, -0.4], false, false);
const sunPatchRight = mesh(new THREE.PlaneGeometry(3.5, 2.5), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), [2.5, 0.026, -0.5], [-Math.PI / 2, 0, 0.4], false, false);
const sunPatchKitchen = mesh(new THREE.PlaneGeometry(1.8, 3.5), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), [-3.5, 0.026, -1.8], [-Math.PI / 2, 0, 0.15], false, false);
room.add(sunPatch, sunPatchLeft, sunPatchRight, sunPatchKitchen);

// --- NUEVO ENTORNO EXTERIOR (LOW POLY) ---
// Vereda (Sidewalk)
materials.sidewalk = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 });
outdoor.add(mesh(new THREE.PlaneGeometry(40, 4.5), materials.sidewalk, [0, 0.015, -8.28], [-Math.PI / 2, 0, 0], false));

// Calle (Street)
materials.asphalt = new THREE.MeshStandardMaterial({ color: 0x2b323c, roughness: 0.9 });
outdoor.add(mesh(new THREE.PlaneGeometry(40, 8.0), materials.asphalt, [0, 0.01, -14.53], [-Math.PI / 2, 0, 0], false));

// Línea amarilla central de la calle
const lineGeom = new THREE.PlaneGeometry(1.2, 0.15);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
for (let x = -18; x <= 18; x += 3) {
  outdoor.add(mesh(lineGeom, lineMat, [x, 0.016, -14.53], [-Math.PI / 2, 0, 0], false, false));
}

// Vereda Opuesta
outdoor.add(mesh(new THREE.PlaneGeometry(40, 3.0), materials.sidewalk, [0, 0.015, -20.03], [-Math.PI / 2, 0, 0], false));

// Árboles Low Poly a lo largo de las veredas
for (const x of [-14, -10, -6, -2, 4, 8, 12, 16]) {
  // Vereda cercana (evitando la puerta y ventana)
  if (x < -2 || x > 6) {
    const tree1 = new THREE.Group(); tree1.position.set(x, 0, -7.5); outdoor.add(tree1);
    addRoundedCylinder(tree1, 0.15, 1.5, materials.wood, [0, 0.75, 0], [0, 0, 0], 12);
    addRoundedCylinder(tree1, 1.1, 2.2, new THREE.MeshStandardMaterial({ color: 0x2f6f45, roughness: 0.9 }), [0, 2.2, 0], [0, 0, 0], 16);
  }
  // Vereda opuesta
  const tree2 = new THREE.Group(); tree2.position.set(x + 1, 0, -19.5); outdoor.add(tree2);
  addRoundedCylinder(tree2, 0.18, 1.8, materials.wood, [0, 0.9, 0], [0, 0, 0], 12);
  addRoundedCylinder(tree2, 1.4, 2.6, new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 }), [0, 2.5, 0], [0, 0, 0], 18);
}

// Casas en frente (Low Poly)
const houseColors = [0x8aa1a7, 0xd99b66, 0x6d8b78, 0xe5c158, 0xa97363, 0x7b9095];
for (let i = 0; i < 6; i++) {
  const houseGroup = new THREE.Group();
  houseGroup.position.set(-15 + i * 6.0, 0, -23.5);
  outdoor.add(houseGroup);

  // Cuerpo de la casa
  const houseMat = new THREE.MeshStandardMaterial({ color: houseColors[i], roughness: 0.8 });
  addBox(houseGroup, [4.8, 4.0, 4.0], houseMat, [0, 2.0, 0]);

  // Techo a dos aguas (Prisma / Cono de 4 segmentos)
  const roofGeom = new THREE.CylinderGeometry(0.01, 3.5, 2.0, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3d31, roughness: 0.7 });
  const roof = mesh(roofGeom, roofMat, [0, 5.0, 0], [0, Math.PI / 4, 0]);
  houseGroup.add(roof);

  // Puerta
  addBox(houseGroup, [0.9, 2.0, 0.1], materials.wood, [0, 1.0, 2.01]);

  // Ventanas
  const winMat = new THREE.MeshStandardMaterial({ color: 0xf4cf86, emissive: 0xf2b75e, emissiveIntensity: 0.3 });
  addBox(houseGroup, [1.0, 1.0, 0.1], winMat, [-1.4, 1.5, 2.01]);
  addBox(houseGroup, [1.0, 1.0, 0.1], winMat, [1.4, 1.5, 2.01]);
  addBox(houseGroup, [1.2, 1.0, 0.1], winMat, [0, 3.0, 2.01]);
}

// Fondo de cielo
const skyPlane = mesh(new THREE.PlaneGeometry(120, 50), new THREE.MeshBasicMaterial({ color: 0xabe3f8 }), [0, 18, -35], [0, 0, 0], false, false);
outdoor.add(skyPlane);

const cinematicGroup = new THREE.Group();
outdoor.add(cinematicGroup);

const sonMesh = mesh(new THREE.SphereGeometry(0.3, 32, 32), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 }), [1.1, 1.3, -11.4]);
const oldWomanMesh = mesh(new THREE.SphereGeometry(0.28, 32, 32), new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.5 }), [1.5, 1.25, -11.9]);
const phoneProp = mesh(new THREE.BoxGeometry(0.18, 0.02, 0.35), materials.phoneCase, [1.15, 1.25, -11.5]);

sonMesh.visible = false;
oldWomanMesh.visible = false;
phoneProp.visible = false;
cinematicGroup.add(sonMesh, oldWomanMesh, phoneProp);

const livingDoorGroup = new THREE.Group();
livingDoorGroup.position.set(-0.04, 0, -6.03);
room.add(livingDoorGroup);
addBox(livingDoorGroup, [1.52, 2.1, 0.13], materials.wood, [0.76, 1.05, 0]);
addBox(livingDoorGroup, [0.05, 0.05, 0.04], materials.metal, [1.35, 1.03, 0.08]);
addBox(room, [0.14, 2.1, 0.16], materials.wood, [1.48, 1.05, -6.03]);
addBox(room, [0.14, 2.1, 0.16], materials.wood, [-0.04, 1.05, -6.03]);
addBox(room, [1.66, 0.14, 0.16], materials.wood, [0.72, 2.17, -6.03]);

const rug = mesh(new THREE.PlaneGeometry(4.7, 3.4), materials.rug, [0.2, 0.012, 0.5], [-Math.PI / 2, 0, 0], false);
room.add(rug);

addBox(room, [2.22, 0.18, 1.05], materials.fabric, [-2.9, 0.18, -2.3]);
addBox(room, [2.1, 0.35, 1.05], materials.fabric, [-2.9, 0.42, -2.3]);
addBox(room, [2.35, 0.58, 0.42], materials.fabric, [-2.9, 0.72, -2.68]);
addBox(room, [0.38, 0.66, 1.02], materials.fabric, [-4.18, 0.53, -2.28]);
addBox(room, [0.38, 0.66, 1.02], materials.fabric, [-1.62, 0.53, -2.28]);
for (const x of [-3.78, -2.02]) {
  for (const z of [-2.7, -1.9]) addBox(room, [0.11, 0.18, 0.11], materials.wood, [x, 0.09, z]);
}

addBox(room, [1.22, 0.12, 0.68], materials.wood, [0.15, 0.49, 0.2]);
for (const x of [-0.42, 0.72]) {
  for (const z of [-0.08, 0.48]) addBox(room, [0.08, 0.46, 0.08], materials.wood, [x, 0.24, z]);
}

addBox(room, [0.42, 0.035, 0.28], materials.paper, [0.18, 0.58, 0.12], [0, 0.24, 0]);
addBox(room, [0.32, 0.025, 0.22], new THREE.MeshStandardMaterial({ color: 0x4a2838, roughness: 0.72 }), [0.22, 0.625, 0.1], [0, 0.24, 0]);
addRoundedCylinder(room, 0.08, 0.06, materials.metal, [-0.42, 0.59, 0.31]);
addRoundedCylinder(room, 0.045, 0.05, materials.metal, [-0.27, 0.59, 0.31]);

const tablePhoneGroup = new THREE.Group();
tablePhoneGroup.position.set(0.35, 0.565, 0.28);
tablePhoneGroup.rotation.set(0, -0.25, 0);
room.add(tablePhoneGroup);
const tablePhoneBody = addBox(tablePhoneGroup, [0.24, 0.024, 0.46], materials.phoneCase, [0, 0, 0]);
tablePhoneBody.frustumCulled = false;
const tablePhoneScreen = mesh(
  new THREE.PlaneGeometry(0.22, 0.44),
  materials.phoneScreenOff,
  [0, 0.013, 0],
  [-Math.PI / 2, 0, 0],
  false,
  false
);
tablePhoneScreen.frustumCulled = false;
tablePhoneGroup.add(tablePhoneScreen);
tablePhoneGroup.visible = false; // Phone not given yet — shown after son's cinematic

const heldPhoneGroup = new THREE.Group();
heldPhoneGroup.visible = false;
camera.add(heldPhoneGroup);
const heldPhoneBody = addBox(heldPhoneGroup, [0.24, 0.46, 0.024], materials.phoneCase, [0, 0, 0]);
heldPhoneBody.frustumCulled = false;
const heldPhoneScreen = mesh(
  new THREE.PlaneGeometry(0.22, 0.44),
  materials.phoneScreenOff,
  [0, 0, 0.013],
  [0, 0, 0],
  false,
  false
);
heldPhoneScreen.frustumCulled = false;
heldPhoneGroup.add(heldPhoneScreen);

for (let i = 0; i < 3; i++) {
  // Desplazar el conjunto de cuadros en el eje Z (de -2.7 a -3.5) para evitar que se superpongan con la ventana lateral izquierda (en z=0)
  addBox(room, [0.72, 0.52, 0.045], materials.wood, [-5.97, 1.55 + i * 0.62, -3.5 + i * 0.62], [0, Math.PI / 2, 0]);
  addBox(room, [0.58, 0.38, 0.05], new THREE.MeshStandardMaterial({ color: [0x7e9caa, 0x9f8262, 0x8f668a][i], roughness: 0.7 }), [-5.94, 1.55 + i * 0.62, -3.5 + i * 0.62], [0, Math.PI / 2, 0]);
}

const lamp = new THREE.Group();
lamp.position.set(2.8, 0, -2.5);
room.add(lamp);
addRoundedCylinder(lamp, 0.18, 0.08, materials.metal, [0, 0.06, 0]);
addRoundedCylinder(lamp, 0.045, 1.25, materials.metal, [0, 0.68, 0]);
addRoundedCylinder(lamp, 0.36, 0.45, materials.warmLight, [0, 1.38, 0], [0, 0, 0], 36);

// Luz física cálida para la lámpara que proyecta sombras internas realistas
const lampLight = new THREE.PointLight(0xffa254, 2.4, 12);
lampLight.position.set(0, 1.38, 0);
lampLight.castShadow = true;
lampLight.shadow.bias = -0.002;
lampLight.shadow.mapSize.set(1024, 1024);
lamp.add(lampLight);

// --- LÁMPARA COLGANTE DE TECHO (CENTRAL) ---
const ceilingLamp = new THREE.Group();
ceilingLamp.position.set(0, 4.18, 0); // Posicionada en el techo en el centro del living
room.add(ceilingLamp);

// Cable negro delgado
addRoundedCylinder(ceilingLamp, 0.015, 0.6, materials.dark, [0, -0.3, 0]);
// Portalámparas metálico
addRoundedCylinder(ceilingLamp, 0.05, 0.12, materials.metal, [0, -0.6, 0]);
// Bombilla encendida brillante
const bulbMesh = mesh(new THREE.SphereGeometry(0.06, 8, 8), materials.warmLight, [0, -0.68, 0]);
ceilingLamp.add(bulbMesh);

// Luz PointLight física que ilumina cenitalmente el living de Marta, proyectando sombras realistas de los muebles hacia abajo
const ceilingLight = new THREE.PointLight(0xffeaad, 2.6, 15);
ceilingLight.position.set(0, -0.68, 0);
ceilingLight.castShadow = true;
ceilingLight.shadow.bias = -0.002;
ceilingLight.shadow.mapSize.set(1024, 1024);
ceilingLamp.add(ceilingLight);

const sideTable = new THREE.Group();
sideTable.position.set(-4.85, 0, 2.25);
room.add(sideTable);
addBox(sideTable, [0.72, 0.08, 0.42], materials.wood, [0, 0.55, 0]);
addBox(sideTable, [0.08, 0.55, 0.08], materials.wood, [-0.28, 0.28, -0.15]);
addBox(sideTable, [0.08, 0.55, 0.08], materials.wood, [0.28, 0.28, 0.15]);
addBox(sideTable, [0.28, 0.08, 0.18], new THREE.MeshStandardMaterial({ color: 0x2f3736, roughness: 0.6 }), [-0.12, 0.63, 0.02]);
for (let i = 0; i < 5; i++) {
addRoundedCylinder(sideTable, 0.035, 0.055, new THREE.MeshStandardMaterial({ color: [0xef6f6c, 0xf7b267, 0x6bc7b8][i % 3], roughness: 0.45 }), [0.18 + i * 0.055, 0.62, -0.08], [Math.PI / 2, 0, 0], 14);
}

// ==========================================
// --- CLIMATIZACIÓN Y DECORACIÓN DEL HOGAR DE MARTA ---
// ==========================================

// 1. Perchero de Entrada (con Sombrero clásico)
const coatRack = new THREE.Group();
coatRack.position.set(-0.5, 0, -5.4);
room.add(coatRack);
// Poste principal
addRoundedCylinder(coatRack, 0.035, 1.8, materials.wood, [0, 0.9, 0], [0, 0, 0], 12);
// Base pesada circular
addRoundedCylinder(coatRack, 0.18, 0.08, materials.wood, [0, 0.04, 0], [0, 0, 0], 16);
// Ganchos metálicos para colgar
for (let j = 0; j < 4; j++) {
  const angle = (j * Math.PI) / 2;
  const hookGroup = new THREE.Group();
  hookGroup.rotation.y = angle;
  coatRack.add(hookGroup);
  addRoundedCylinder(hookGroup, 0.01, 0.12, materials.metal, [0, 1.5, 0.06], [Math.PI / 4, 0, 0], 8);
}
// Sombrero clásico de fieltro colgado en un gancho
const hatGroup = new THREE.Group();
hatGroup.position.set(-0.06, 1.54, 0.11);
hatGroup.rotation.set(-0.35, 0.2, 0.6); // Colgado inclinado
coatRack.add(hatGroup);
// Ala del sombrero
addRoundedCylinder(hatGroup, 0.21, 0.015, new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }), [0, 0, 0], [0, 0, 0], 16);
// Copa del sombrero
addRoundedCylinder(hatGroup, 0.11, 0.08, new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }), [0, 0.04, 0], [0, 0, 0], 16);
// Cinta oscura del sombrero
addRoundedCylinder(hatGroup, 0.112, 0.016, materials.dark, [0, 0.01, 0], [0, 0, 0], 16);

// 2. Cocina Completa (Mesada, Fregadero, Alacenas y Estanterías)
const kitchenGroup = new THREE.Group();
room.add(kitchenGroup);

// Mesada Principal
const kitchenCounter = addBox(kitchenGroup, [3.2, 0.88, 0.72], materials.cabinet, [-3.8, 0.44, 5.6]);
// Encimera / Mesada de pizarra oscura
addBox(kitchenGroup, [3.22, 0.04, 0.74], materials.slate, [-3.8, 0.88 + 0.02, 5.59]);
// Zócalo de madera inferior
addBox(kitchenGroup, [3.2, 0.06, 0.04], materials.wood, [-3.8, 0.03, 5.22]);

// Puertas y cajones (Detalle visual en madera)
for (let j = 0; j < 4; j++) {
  const panelX = -5.0 + j * 0.8;
  // Panel de puerta
  addBox(kitchenGroup, [0.74, 0.72, 0.02], new THREE.MeshStandardMaterial({ color: 0x485850, roughness: 0.75 }), [panelX, 0.45, 5.23]);
  // Tiradores de madera redondos
  addRoundedCylinder(kitchenGroup, 0.02, 0.03, materials.wood, [panelX + (j % 2 === 0 ? 0.28 : -0.28), 0.45, 5.25], [Math.PI / 2, 0, 0], 10);
}

// Fregadero Metálico (Sink)
addBox(kitchenGroup, [0.65, 0.005, 0.45], materials.metal, [-4.5, 0.902, 5.5]);
// Canilla / Grifo de agua curvo
const faucetGroup = new THREE.Group();
faucetGroup.position.set(-4.5, 0.9, 5.65);
kitchenGroup.add(faucetGroup);
addRoundedCylinder(faucetGroup, 0.018, 0.16, materials.metal, [0, 0.08, 0], [0, 0, 0], 10);
addRoundedCylinder(faucetGroup, 0.018, 0.1, materials.metal, [0, 0.16, -0.04], [Math.PI / 2, 0, 0], 10);
addRoundedCylinder(faucetGroup, 0.015, 0.04, materials.metal, [0, 0.14, -0.08], [0, 0, 0], 10);

// Cocina / Anafe (Stove/Cooktop)
addBox(kitchenGroup, [0.75, 0.006, 0.5], new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.25, metalness: 0.9 }), [-3.1, 0.903, 5.5]);
// Pequeñas hornallas circulares
for (const [burnX, burnZ] of [[-3.25, 5.35], [-3.25, 5.65], [-2.95, 5.35], [-2.95, 5.65]]) {
  addRoundedCylinder(kitchenGroup, 0.09, 0.008, materials.dark, [burnX, 0.905, burnZ], [0, 0, 0], 12);
}

// Alacenas y Estanterías Flotantes
const kitchenShelfL = addBox(kitchenGroup, [1.3, 0.04, 0.26], materials.wood, [-4.6, 2.3, 5.8]);
const kitchenShelfR = addBox(kitchenGroup, [1.3, 0.04, 0.26], materials.wood, [-2.9, 2.3, 5.8]);

// Platos, Tazas y Frascos decorativos
for (let j = 0; j < 6; j++) {
  // Platos apilados en el estante izquierdo
  addRoundedCylinder(kitchenGroup, 0.09, 0.015, new THREE.MeshStandardMaterial({ color: [0xefefef, 0x8ecae6, 0xffb703][j % 3], roughness: 0.4 }), [-4.9 + j * 0.03, 2.35 + j * 0.005, 5.8], [0, 0, 0], 12);
}
// Frascos de cerámica en el estante derecho
for (let j = 0; j < 3; j++) {
  const jarX = -3.3 + j * 0.35;
  // Cuerpo del frasco
  addRoundedCylinder(kitchenGroup, 0.07, 0.18, new THREE.MeshStandardMaterial({ color: [0xe07a5f, 0xf4f1de, 0x3d5a80][j], roughness: 0.6 }), [jarX, 2.41, 5.8], [0, 0, 0], 12);
  // Tapita de corcho
  addRoundedCylinder(kitchenGroup, 0.06, 0.025, materials.wood, [jarX, 2.51, 5.8], [0, 0, 0], 10);
}

// 3. Mesa de Comedor y Sillas
const diningGroup = new THREE.Group();
diningGroup.position.set(-3.2, 0, 1.85);
room.add(diningGroup);
// Tapa de la mesa
addBox(diningGroup, [1.25, 0.05, 0.85], materials.wood, [0, 0.73, 0]);
// Patas cilíndricas delgadas
for (const [px, pz] of [[-0.55, -0.35], [-0.55, 0.35], [0.55, -0.35], [0.55, 0.35]]) {
  addRoundedCylinder(diningGroup, 0.032, 0.7, materials.wood, [px, 0.35, pz], [0, 0, 0], 10);
}

// Mantelito de tela rústica en el centro
addBox(diningGroup, [0.65, 0.004, 0.55], new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.95 }), [0, 0.758, 0]);

// Dos sillas enfrentadas (Silla A y Silla B)
const chairMats = [new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: 0xe07a5f, roughness: 0.85 })];
for (let j = 0; j < 2; j++) {
  const dir = j === 0 ? 1 : -1;
  const chair = new THREE.Group();
  chair.position.set(0, 0, 0.75 * dir);
  chair.rotation.y = j === 0 ? 0 : Math.PI;
  diningGroup.add(chair);

  // Asiento de madera
  addBox(chair, [0.42, 0.04, 0.42], materials.wood, [0, 0.42, 0]);
  // Almohadón tapizado de color cálido y acogedor
  addBox(chair, [0.38, 0.04, 0.38], chairMats[j], [0, 0.45, 0]);
  // Patas de la silla
  for (const [cx, cz] of [[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]]) {
    addRoundedCylinder(chair, 0.022, 0.4, materials.wood, [cx, 0.2, cz], [0, 0, 0], 10);
  }
  // Respaldo de la silla
  addBox(chair, [0.04, 0.48, 0.42], materials.wood, [0.18, 0.66, 0]);
  // Barrotes verticales decorativos en el respaldo
  addBox(chair, [0.03, 0.4, 0.03], materials.wood, [0.18, 0.62, -0.12]);
  addBox(chair, [0.03, 0.4, 0.03], materials.wood, [0.18, 0.62, 0.12]);
}

// 4. Biblioteca Estantería Alta (Llena de libros de colores y plantas)
const bookshelf = new THREE.Group();
bookshelf.position.set(5.72, 0, 3.2); // Posicionada contra la pared derecha del fondo
room.add(bookshelf);

// Parantes laterales principales de la biblioteca
addBox(bookshelf, [0.36, 2.38, 0.05], materials.wood, [0, 1.19, -0.63]);
addBox(bookshelf, [0.36, 2.38, 0.05], materials.wood, [0, 1.19, 0.63]);
// Tapa trasera delgada
addBox(bookshelf, [0.02, 2.38, 1.22], new THREE.MeshStandardMaterial({ color: 0x5a3e29, roughness: 0.8 }), [0.17, 1.19, 0]);

// Estantes horizontales
for (let j = 0; j < 5; j++) {
  const shelfY = 0.08 + j * 0.52;
  addBox(bookshelf, [0.36, 0.04, 1.22], materials.wood, [0, shelfY, 0]);

  // Colocar libros coloridos de forma procedural en los estantes intermedios
  if (j < 4) {
    const bookColors = [0xb05b4c, 0x4c706c, 0xd4a373, 0x455a64, 0xfffcf2, 0x8c5b3c];
    const numBooks = 8;
    for (let k = 0; k < numBooks; k++) {
      const bookH = 0.22 + Math.random() * 0.06;
      const bookD = 0.22;
      const bookW = 0.03 + Math.random() * 0.02;
      const bookZ = -0.45 + (k * 0.9) / numBooks + (Math.random() - 0.5) * 0.02;
      const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[k % bookColors.length], roughness: 0.85 });

      // Algunos libros están inclinados
      const isTilted = k === numBooks - 1 && Math.random() > 0.4;
      const tiltAngle = isTilted ? 0.25 * (Math.random() > 0.5 ? 1 : -1) : 0;
      const bookY = shelfY + 0.02 + bookH / 2;

      addBox(bookshelf, [bookD, bookH, bookW], bookMat, [-0.02, bookY, bookZ], [0, 0, tiltAngle]);
    }
  }
}

// Planta colgante en la estantería superior
const shelfTopY = 0.08 + 4 * 0.52;
const plantPot = addRoundedCylinder(bookshelf, 0.09, 0.12, new THREE.MeshStandardMaterial({ color: 0xbf9c85, roughness: 0.6 }), [-0.02, shelfTopY + 0.08, 0], [0, 0, 0], 12);
// Hojas verdes colgantes (Box low-poly apiladas para simular follaje cayendo)
const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6a45, roughness: 0.9, flatShading: true });
addBox(bookshelf, [0.18, 0.08, 0.18], leafMat, [-0.02, shelfTopY + 0.16, 0]);
// Hojas que cuelgan del borde
addBox(bookshelf, [0.14, 0.16, 0.06], leafMat, [-0.08, shelfTopY + 0.11, -0.06], [0.2, 0.1, -0.3]);
addBox(bookshelf, [0.08, 0.22, 0.08], leafMat, [-0.07, shelfTopY + 0.08, 0.07], [-0.1, 0.2, 0.4]);

// 5. Mueble de TV y Televisor de Tubo CRT Retro (Frente al Sofá)
const tvArea = new THREE.Group();
tvArea.position.set(5.72, 0, -2.30); // Eje Z alineado con el sofá del lado opuesto
room.add(tvArea);

// Rack / Mueble de TV bajo
addBox(tvArea, [0.45, 0.48, 1.45], materials.wood, [0, 0.24, 0]);
// Patas cortas del rack
for (const [px, pz] of [[-0.18, -0.65], [-0.18, 0.65], [0.18, -0.65], [0.18, 0.65]]) {
  addRoundedCylinder(tvArea, 0.025, 0.08, materials.dark, [px, 0.04, pz], [0, 0, 0], 8);
}
// Paneles corredizos oscuros en el rack
addBox(tvArea, [0.02, 0.36, 0.62], materials.dark, [-0.22, 0.26, -0.32]);
addBox(tvArea, [0.02, 0.36, 0.62], materials.dark, [-0.21, 0.26, 0.32]);
// Perilla redonda de los cajones
addRoundedCylinder(tvArea, 0.015, 0.02, materials.metal, [-0.23, 0.26, -0.06], [0, 0, Math.PI / 2], 10);
addRoundedCylinder(tvArea, 0.015, 0.02, materials.metal, [-0.23, 0.26, 0.06], [0, 0, Math.PI / 2], 10);

// Televisor Retro de Tubo (CRT)
const tvModel = new THREE.Group();
tvModel.position.set(-0.02, 0.48, 0);
tvArea.add(tvModel);

// Carcasa plástica del televisor (en color gris oscuro/marrón)
addBox(tvModel, [0.38, 0.44, 0.54], new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.65 }), [0, 0.22, 0]);
// Pantalla de cristal de tubo (ligeramente curva y sobresaliendo al frente)
addBox(tvModel, [0.04, 0.36, 0.38], new THREE.MeshStandardMaterial({ color: 0x12161a, roughness: 0.15, metalness: 0.9 }), [-0.18, 0.22, 0.06]);
// Panel de control lateral de madera en el frente del TV
addBox(tvModel, [0.02, 0.36, 0.08], materials.wood, [-0.18, 0.22, -0.2]);
// Diales de volumen y sintonización (cilindros de plástico)
addRoundedCylinder(tvModel, 0.02, 0.02, materials.metal, [-0.20, 0.32, -0.2], [0, 0, Math.PI / 2], 10);
addRoundedCylinder(tvModel, 0.02, 0.02, materials.metal, [-0.20, 0.24, -0.2], [0, 0, Math.PI / 2], 10);
// Pequeñas ranuras del altavoz integrado
for (let j = 0; j < 4; j++) {
  addBox(tvModel, [0.01, 0.01, 0.06], materials.dark, [-0.19, 0.1 + j * 0.02, -0.2]);
}

// Antena telescópica clásica "orejas de conejo" ( rabbit ears )
addRoundedCylinder(tvModel, 0.015, 0.03, materials.dark, [0, 0.44, 0], [0, 0, 0], 8); // Base de la antena
addRoundedCylinder(tvModel, 0.005, 0.42, materials.metal, [-0.06, 0.61, -0.12], [0, 0, -0.6], 8); // Antena L
addRoundedCylinder(tvModel, 0.005, 0.42, materials.metal, [-0.06, 0.61, 0.12], [0, 0, 0.6], 8); // Antena R

// 6. Reloj de Pared Analógico (Fondo Comedor)
const wallClock = new THREE.Group();
wallClock.position.set(-1.20, 2.9, 5.94); // En la pared del fondo a la altura de los ojos
room.add(wallClock);

// Marco de madera del reloj redondo
addRoundedCylinder(wallClock, 0.23, 0.05, materials.wood, [0, 0, 0], [Math.PI / 2, 0, 0], 24);
// Fondo blanco del reloj
addRoundedCylinder(wallClock, 0.20, 0.01, new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.95 }), [0, 0, -0.028], [Math.PI / 2, 0, 0], 24);
// Aguja horaria (corta) apuntando a las 4
addBox(wallClock, [0.015, 0.08, 0.004], materials.dark, [0.03, -0.02, -0.036], [0, 0, -Math.PI / 3]);
// Aguja de minutos (larga) apuntando a las 12
addBox(wallClock, [0.01, 0.13, 0.004], materials.dark, [0, 0.05, -0.036], [0, 0, 0]);
// Perno central metálico
addRoundedCylinder(wallClock, 0.012, 0.01, materials.metal, [0, 0, -0.038], [Math.PI / 2, 0, 0], 10);
// Marcador de las 12 y horas
addBox(wallClock, [0.008, 0.03, 0.002], materials.dark, [0, 0.17, -0.032]);
addBox(wallClock, [0.008, 0.03, 0.002], materials.dark, [0, -0.17, -0.032]);
addBox(wallClock, [0.03, 0.008, 0.002], materials.dark, [0.17, 0, -0.032]);
addBox(wallClock, [0.03, 0.008, 0.002], materials.dark, [-0.17, 0, -0.032]);

// 7. Cortinas Estilizadas para Ventanas
const curtainsL = new THREE.Group();
curtainsL.position.set(-5.88, 2.45, 0); // Ventana lateral izquierda
room.add(curtainsL);
// Barra de la cortina
addRoundedCylinder(curtainsL, 0.02, 3.1, materials.wood, [0.02, 1.18, 0], [Math.PI / 2, 0, 0], 10);
// Soporte de barra
addBox(curtainsL, [0.12, 0.04, 0.04], materials.wood, [0.05, 1.18, -1.52]);
addBox(curtainsL, [0.12, 0.04, 0.04], materials.wood, [0.05, 1.18, 1.52]);
// Telas a los costados
addBox(curtainsL, [0.03, 2.24, 0.38], materials.curtain, [0.01, 0, -1.25]);
addBox(curtainsL, [0.03, 2.24, 0.38], materials.curtain, [0.01, 0, 1.25]);
// Abrazaderas de madera que sujetan la cortina
addBox(curtainsL, [0.08, 0.04, 0.4], materials.wood, [0.02, -0.22, -1.25]);
addBox(curtainsL, [0.08, 0.04, 0.4], materials.wood, [0.02, -0.22, 1.25]);

const curtainsR = new THREE.Group();
curtainsR.position.set(5.88, 2.45, 0); // Ventana lateral derecha
room.add(curtainsR);
// Barra de la cortina
addRoundedCylinder(curtainsR, 0.02, 3.1, materials.wood, [-0.02, 1.18, 0], [Math.PI / 2, 0, 0], 10);
// Soportes de barra
addBox(curtainsR, [0.12, 0.04, 0.04], materials.wood, [-0.05, 1.18, -1.52]);
addBox(curtainsR, [0.12, 0.04, 0.04], materials.wood, [-0.05, 1.18, 1.52]);
// Telas a los costados
addBox(curtainsR, [0.03, 2.24, 0.38], materials.curtain, [-0.01, 0, -1.25]);
addBox(curtainsR, [0.03, 2.24, 0.38], materials.curtain, [-0.01, 0, 1.25]);
// Abrazaderas
addBox(curtainsR, [0.08, 0.04, 0.4], materials.wood, [-0.02, -0.22, -1.25]);
addBox(curtainsR, [0.08, 0.04, 0.4], materials.wood, [-0.02, -0.22, 1.25]);

const curtainsK = new THREE.Group();
curtainsK.position.set(-3.0, 2.45, -5.88); // Ventana frontal cocina
room.add(curtainsK);
// Barra de la cortina
addRoundedCylinder(curtainsK, 0.02, 2.1, materials.wood, [0, 1.18, 0.02], [0, 0, Math.PI / 2], 10);
// Telas a los costados
addBox(curtainsK, [0.28, 2.24, 0.03], materials.curtain, [-0.75, 0, 0.01]);
addBox(curtainsK, [0.28, 2.24, 0.03], materials.curtain, [0.75, 0, 0.01]);
// Abrazaderas
addBox(curtainsK, [0.3, 0.04, 0.08], materials.wood, [-0.75, -0.22, 0.02]);
addBox(curtainsK, [0.3, 0.04, 0.08], materials.wood, [0.75, -0.22, 0.02]);

// Luz de relleno ambiental diurna y clara para que la casa se vea muy iluminada por dentro
const ambient = new THREE.HemisphereLight(0xfff6e8, 0x3b4b48, 1.25);
scene.add(ambient);

// Sol exterior brillante que inunda de luz diurna el salón
const sun = new THREE.DirectionalLight(0xfff0c4, 5.0);
sun.position.set(6.2, 6.4, -3.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005; // Evita el shadow acne en paredes y piso
sun.shadow.radius = 4.0;    // Suavizado premium (soft shadow filter size)
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 24;
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
scene.add(sun);

// Luz direccional cenital interior de apoyo (rebote de luz diurna clara)
const interiorBounce = new THREE.DirectionalLight(0xfff8f0, 1.1);
interiorBounce.position.set(0, 5, 0); // Proyecta de arriba hacia abajo sin generar sombras extra
scene.add(interiorBounce);

// Luz del techo de la cocina para iluminar ese rincón y proyectar sombras cálidas
const kitchenLight = new THREE.PointLight(0xffdca8, 2.0, 12);
kitchenLight.position.set(-3.5, 3.2, 4.2);
kitchenLight.castShadow = true;
kitchenLight.shadow.bias = -0.002;
kitchenLight.shadow.mapSize.set(1024, 1024);
room.add(kitchenLight);

const windowLight = new THREE.RectAreaLight(0xdff7ff, 4.2, 2.8, 2.2);
windowLight.position.set(4.35, 2.45, -5.55);
windowLight.rotation.y = Math.PI;
scene.add(windowLight);

const doorState = {
  living: { open: false, group: livingDoorGroup, position: new THREE.Vector3(0.72, 0, -6.03), label: 'puerta exterior' },
};

const playerRadius = 0.28;

function inRect(x, z, rect) {
  return x > rect.minX + playerRadius && x < rect.maxX - playerRadius && z > rect.minZ + playerRadius && z < rect.maxZ - playerRadius;
}

function isPositionAllowed(x, z) {
  const living = { minX: -5.65, maxX: 5.65, minZ: -5.78, maxZ: 5.65 };
  const outside = { minX: -18.0, maxX: 18.0, minZ: -19.5, maxZ: -5.55 };

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

function clampPlayerToBounds() {
  if (isPositionAllowed(camera.position.x, camera.position.z)) return;
  const fallback = new THREE.Vector3(-0.85, 1.58, 3.25);
  camera.position.x = fallback.x;
  camera.position.z = fallback.z;
}

function setLookFromEuler() {
  camera.quaternion.setFromEuler(lookEuler);
}

function getNearbyDoor() {
  let nearest = null;
  let nearestDistance = Infinity;
  Object.entries(doorState).forEach(([id, door]) => {
    const distance = Math.hypot(camera.position.x - door.position.x, camera.position.z - door.position.z);
    if (distance < 1.35 && distance < nearestDistance) {
      nearest = { id, door };
      nearestDistance = distance;
    }
  });
  return nearest;
}

const cinematicState = {
  active: false,
  currentStep: 0,
  timer: 0,
  sequence: null,
  playedLivingCutscene: false,
  savedCamPos: new THREE.Vector3(),
  savedCamQuat: new THREE.Quaternion(),
  waitingForSpace: false,
};

let audioCtx = null;
function playCinematicSound(cfg) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = cfg.type || 'sine';
    osc.frequency.setValueAtTime(cfg.freq || 440, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (cfg.duration || 0.2));

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + (cfg.duration || 0.2));
  } catch (e) { }
}

function startCinematic(sequence, onEnd) {
  cinematicState.active = true;
  cinematicState.currentStep = 0;
  cinematicState.timer = 0;
  cinematicState.sequence = sequence;
  cinematicState.waitingForSpace = false;
  cinematicState.onEnd = onEnd || null;

  cinematicState.savedCamPos.copy(camera.position);
  cinematicState.savedCamQuat.copy(camera.quaternion);

  document.body.classList.add('cinematic-active');

  if (ui.cinematicOverlay) {
    ui.cinematicOverlay.setAttribute('aria-hidden', 'false');
  }
  if (ui.cinematicPrompt) {
    ui.cinematicPrompt.classList.remove('is-visible');
  }

  const firstStep = sequence[0];
  if (firstStep) {
    if (firstStep.onStart) firstStep.onStart();
    if (firstStep.dialogue) {
      if (ui.cinematicSpeaker) ui.cinematicSpeaker.textContent = firstStep.dialogue.speaker;
      if (ui.cinematicText) ui.cinematicText.textContent = firstStep.dialogue.text;
    }
    if (firstStep.sound) playCinematicSound(firstStep.sound);
  }
}

function advanceCinematicStep() {
  if (!cinematicState.active || !cinematicState.sequence) return;

  const currentStepObj = cinematicState.sequence[cinematicState.currentStep];
  if (currentStepObj && currentStepObj.action) {
    currentStepObj.action(1.0, 0);
  }

  cinematicState.currentStep++;
  cinematicState.timer = 0;
  cinematicState.waitingForSpace = false;

  const nextStep = cinematicState.sequence[cinematicState.currentStep];
  if (nextStep) {
    if (nextStep.onStart) nextStep.onStart();
    if (nextStep.dialogue) {
      if (ui.cinematicSpeaker) ui.cinematicSpeaker.textContent = nextStep.dialogue.speaker;
      if (ui.cinematicText) ui.cinematicText.textContent = nextStep.dialogue.text;
    }
    if (nextStep.sound) playCinematicSound(nextStep.sound);
    if (ui.cinematicPrompt) ui.cinematicPrompt.classList.remove('is-visible');
  } else {
    endCinematic();
  }
}

function endCinematic() {
  cinematicState.active = false;
  cinematicState.waitingForSpace = false;
  document.body.classList.remove('cinematic-active');
  if (ui.cinematicOverlay) ui.cinematicOverlay.setAttribute('aria-hidden', 'true');
  if (ui.cinematicPrompt) ui.cinematicPrompt.classList.remove('is-visible');

  camera.position.copy(cinematicState.savedCamPos);
  camera.quaternion.copy(cinematicState.savedCamQuat);

  // If a custom onEnd callback was provided, call it and skip default behavior
  if (cinematicState.onEnd) {
    const cb = cinematicState.onEnd;
    cinematicState.onEnd = null;
    cb();
    return;
  }

  // Default behavior for regular cinematics
  if (typeof sonMesh !== 'undefined') sonMesh.visible = false;
  if (typeof oldWomanMesh !== 'undefined') oldWomanMesh.visible = false;
  if (typeof phoneProp !== 'undefined') phoneProp.visible = false;

  if (missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
    setTimeout(() => {
      completeMission('doorbell');
    }, 1500);
  }
}

function updateCinematic(dt) {
  if (!cinematicState.active || !cinematicState.sequence) return;

  const step = cinematicState.sequence[cinematicState.currentStep];
  if (!step) {
    endCinematic();
    return;
  }

  if (!cinematicState.waitingForSpace) {
    cinematicState.timer += dt;
    const progress = Math.min(1, cinematicState.timer / step.duration);

    if (step.action) step.action(progress, dt);

    if (cinematicState.timer >= step.duration) {
      if (step.autoAdvance) {
        advanceCinematicStep();
      } else {
        cinematicState.waitingForSpace = true;
        if (ui.cinematicPrompt) ui.cinematicPrompt.classList.add('is-visible');
      }
    }
  }
}

const cutsceneEntry = [
  {
    duration: 2.5,
    dialogue: { speaker: "Hijo", text: "Hola abuela, qué bueno verte. Te traje este teléfono para que estemos comunicados." },
    sound: { freq: 520, type: 'triangle', duration: 0.25 },
    onStart: () => {
      sonMesh.visible = true;
      oldWomanMesh.visible = true;
      phoneProp.visible = true;

      sonMesh.position.set(1.1, 1.3, -11.4);
      oldWomanMesh.position.set(1.5, 1.25, -10.1);
      phoneProp.position.set(1.15, 1.25, -11.3);

      camera.position.set(2.2, 1.45, -8.5);
      camera.lookAt(1.3, 1.25, -10.8);
    },
    action: (progress) => {
      phoneProp.position.lerpVectors(
        new THREE.Vector3(1.15, 1.25, -11.3),
        new THREE.Vector3(1.4, 1.25, -10.5),
        progress
      );
      camera.position.z = THREE.MathUtils.lerp(-8.5, -8.8, progress);
      camera.lookAt(1.3, 1.25, -10.8);
    }
  },
  {
    duration: 3.5,
    dialogue: { speaker: "Anciana", text: "Ay hijo... ya sabes que a mí no me gustan para nada esas cosas modernas, me marean." },
    sound: { freq: 380, type: 'sine', duration: 0.3 },
    action: (progress) => {
      oldWomanMesh.position.z = -10.1 + Math.sin(progress * Math.PI) * 0.05;
      camera.position.z = THREE.MathUtils.lerp(-8.8, -9.0, progress);
      camera.lookAt(1.3, 1.25, -10.8);
    }
  },
  {
    duration: 3.0,
    dialogue: { speaker: "Hijo", text: "Lo sé abuela, pero haz el esfuerzo. Me tengo que ir corriendo al trabajo, ¡hablamos luego!" },
    sound: { freq: 550, type: 'triangle', duration: 0.2 },
    action: (progress) => {
      sonMesh.position.lerpVectors(
        new THREE.Vector3(1.1, 1.3, -11.4),
        new THREE.Vector3(4.5, 1.3, -15.5),
        progress
      );
      camera.position.z = THREE.MathUtils.lerp(-9.0, -9.1, progress);
      camera.lookAt(1.3, 1.25, -10.8);
    }
  }
];

const cutsceneLiving = [
  {
    duration: 2.5,
    dialogue: { speaker: "Hijo", text: "Hola abuela, qué bueno verte. Te traje este teléfono para que estemos comunicados." },
    sound: { freq: 520, type: 'triangle', duration: 0.25 },
    onStart: () => {
      sonMesh.visible = true;
      oldWomanMesh.visible = true;
      phoneProp.visible = true;

      sonMesh.position.set(0.72, 1.3, -6.8);
      oldWomanMesh.position.set(0.72, 1.25, -5.4);
      phoneProp.position.set(0.72, 1.25, -6.4);

      camera.position.set(2.2, 1.45, -5.2);
      camera.lookAt(0.72, 1.25, -6.1);
    },
    action: (progress) => {
      phoneProp.position.lerpVectors(
        new THREE.Vector3(0.72, 1.25, -6.4),
        new THREE.Vector3(0.72, 1.25, -5.7),
        progress
      );
      camera.position.x = THREE.MathUtils.lerp(2.2, 2.0, progress);
      camera.lookAt(0.72, 1.25, -6.1);
    }
  },
  {
    duration: 3.5,
    dialogue: { speaker: "Anciana", text: "Ay hijo... ya sabes que a mí no me gustan para nada esas cosas modernas, me marean." },
    sound: { freq: 380, type: 'sine', duration: 0.3 },
    action: (progress) => {
      oldWomanMesh.position.z = -5.4 + Math.sin(progress * Math.PI) * 0.05;
      camera.position.x = THREE.MathUtils.lerp(2.0, 1.85, progress);
      camera.lookAt(0.72, 1.25, -6.1);
    }
  },
  {
    duration: 3.0,
    dialogue: { speaker: "Hijo", text: "Lo sé abuela, pero haz el esfuerzo. Me tengo que ir corriendo al trabajo, ¡hablamos luego!" },
    sound: { freq: 550, type: 'triangle', duration: 0.2 },
    action: (progress) => {
      sonMesh.position.lerpVectors(
        new THREE.Vector3(0.72, 1.3, -6.8),
        new THREE.Vector3(1.4, 1.3, -10.2),
        progress
      );
      camera.position.x = THREE.MathUtils.lerp(1.85, 1.75, progress);
      camera.lookAt(0.72, 1.25, -6.1);
    }
  }
];

// --- INTRO FLYTHROUGH SEQUENCE ---
const introSequence = [
  // Step 1: Exterior establishing shot — high angle, show the house and street
  {
    duration: 4.5,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Marta tiene 78 años. Ha vivido una vida analógica, plena y tranquila.' },
    onStart: () => {
      martaModel.visible = true;
      tablePhoneGroup.visible = false;
      doorState.living.open = true;
      camera.position.set(6, 5.5, -18);
      camera.lookAt(0, 2, -6);
    },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress); // smoothstep
      camera.position.lerpVectors(
        new THREE.Vector3(6, 5.5, -18),
        new THREE.Vector3(4, 3.8, -13),
        ease
      );
      camera.lookAt(0, 2, -6);
    }
  },
  // Step 2: Approach the front door
  {
    duration: 4.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Pero hoy, el mundo hiperconectado la obliga a interactuar a través de una pantalla.' },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(
        new THREE.Vector3(4, 3.8, -13),
        new THREE.Vector3(0.72, 2.2, -7.5),
        ease
      );
      const lookTarget = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(0, 2, -6),
        new THREE.Vector3(0, 1.5, -3),
        ease
      );
      camera.lookAt(lookTarget);
    }
  },
  // Step 3: Enter through the open door into the living room
  {
    duration: 4.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Al no haber crecido con la tecnología, Marta está totalmente expuesta y vulnerable.' },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(
        new THREE.Vector3(0.72, 2.2, -7.5),
        new THREE.Vector3(1.2, 1.75, -2.0),
        ease
      );
      const lookTarget = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(0, 1.5, -3),
        new THREE.Vector3(-2.9, 1.2, -2.0),
        ease
      );
      camera.lookAt(lookTarget);
    }
  },
  // Step 4: Orbit around Marta on the sofa
  {
    duration: 5.5,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Estafas, notificaciones estridentes e interfaces confusas acechan su tranquilidad.' },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      const angle = -Math.PI * 0.4 + ease * Math.PI * 0.7;
      const radius = 2.8 - ease * 0.6;
      const martaCenter = new THREE.Vector3(-2.9, 0, -2.0);
      camera.position.set(
        martaCenter.x + Math.sin(angle) * radius,
        1.45 + Math.sin(ease * Math.PI) * 0.35,
        martaCenter.z + Math.cos(angle) * radius
      );
      camera.lookAt(martaCenter.x, 1.2, martaCenter.z);
 
      // Subtle Marta idle animation — gentle breathing
      martaTorso.scale.y = 1.0 + Math.sin(Date.now() * 0.002) * 0.015;
      martaHead.position.y = 1.42 + Math.sin(Date.now() * 0.0015) * 0.005;
    }
  },
  // Step 5: Close-up on Marta, then transition fade
  {
    duration: 4.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Ponte en sus zapatos. Experimenta la brecha digital desde sus propios ojos.' },
    sound: { freq: 280, type: 'sine', duration: 0.6 },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(
        new THREE.Vector3(-1.8, 1.55, -1.2),
        new THREE.Vector3(-2.6, 1.58, -1.7),
        ease
      );
      camera.lookAt(-2.9, 1.42, -2.0);
 
      // Fade to white for POV transition in last 30% of step
      if (progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3;
        if (ui.introFade) {
          ui.introFade.style.transition = 'none';
          ui.introFade.style.opacity = fadeProgress.toFixed(3);
        }
      }
    }
  }
];

function startIntro() {
  document.body.classList.add('intro-active');

  // Deshabilitar el botón y quitarle el foco para que la barra espaciadora no lo active de nuevo
  if (ui.startBtn) {
    ui.startBtn.disabled = true;
    ui.startBtn.blur();
  }

  // Initialize AudioContext on user interaction
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { }

  // Fade out intro overlay
  if (ui.introOverlay) {
    ui.introOverlay.classList.add('is-hidden');
    setTimeout(() => {
      ui.introOverlay.style.display = 'none';
    }, 1000);
  }

  // Start the cinematic after overlay fades
  setTimeout(() => {
    startCinematic(introSequence, () => {
      // onEnd callback — transition from intro to gameplay
      martaModel.visible = false;
      doorState.living.open = false;

      // Fade from white back to scene
      if (ui.introFade) {
        ui.introFade.style.transition = 'opacity 1.2s ease';
        ui.introFade.style.opacity = '0';
      }

      // Remove intro-active class to show HUD
      setTimeout(() => {
        document.body.classList.remove('intro-active');

        // Start the doorbell mission
        setTimeout(() => {
          setMission('doorbell', 'Atiende la puerta', 'Alguien toca el timbre. Ve a abrir la puerta de entrada.');
        }, 2000);
      }, 800);
    });
  }, 600);
}

function toggleNearbyDoor() {
  const nearby = getNearbyDoor();
  if (!nearby) return;
  nearby.door.open = !nearby.door.open;

  if (nearby.id === 'living' && nearby.door.open && missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
    startCinematic(cutsceneLiving, () => {
      // After son's cinematic: phone appears on table, door closes, mission completes
      tablePhoneGroup.visible = true;
      doorState.living.open = false;
      if (typeof sonMesh !== 'undefined') sonMesh.visible = false;
      if (typeof oldWomanMesh !== 'undefined') oldWomanMesh.visible = false;
      if (typeof phoneProp !== 'undefined') phoneProp.visible = false;

      if (missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
        setTimeout(() => {
          completeMission('doorbell');
        }, 1500);
      }
    });
  }
}

function updateDoors(dt) {
  let livingTarget = doorState.living.open ? -Math.PI * 0.52 : 0;
  doorState.living.group.rotation.y += (livingTarget - doorState.living.group.rotation.y) * Math.min(1, dt * 7);

  const nearby = getNearbyDoor();
  if (nearby) {
    ui.doorPrompt.textContent = `E ${nearby.door.open ? 'Cerrar' : 'Abrir'} ${nearby.door.label}`;
    ui.doorPrompt.classList.add('is-visible');
  } else {
    ui.doorPrompt.classList.remove('is-visible');
  }
}

function updateFirstPerson(dt) {
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
  camera.position.y = 1.58 + bob;
  setLookFromEuler();
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

function isDoorKey(event) {
  return event.code === 'KeyE' || event.key === 'e' || event.key === 'E';
}

function getMoveDirection(event) {
  return keyMap[event.code] || keyMap[event.key];
}

function handleMoveKey(event, active) {
  if (cinematicState.active) {
    if (active && (event.code === 'Space' || event.key === ' ')) {
      if (event.repeat) return;
      event.preventDefault();
      advanceCinematicStep();
    }
    return;
  }
  if (active && (event.code === 'KeyT' || event.key === 't' || event.key === 'T')) {
    if (event.repeat) return;
    event.preventDefault();
    phoneState.active = !phoneState.active;
    if (ui.phonePrompt) {
      ui.phonePrompt.textContent = phoneState.active ? 'T Guardar teléfono' : 'T Coger teléfono';
      ui.phonePrompt.classList.toggle('is-active', phoneState.active);
    }
    return;
  }
  if (active && isDoorKey(event)) {
    if (event.repeat) return;
    event.preventDefault();
    toggleNearbyDoor();
    return;
  }
  const key = getMoveDirection(event);
  if (!key) return;
  event.preventDefault();
  moveState[key] = active;
}

document.addEventListener('keydown', (event) => handleMoveKey(event, true), { capture: true });
document.addEventListener('keyup', (event) => handleMoveKey(event, false), { capture: true });

function bindWalkButton(id, direction) {
  const button = document.querySelector(`#${id}`);
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
  }, { passive: false });
  button.addEventListener('touchend', () => setActive(false));
  button.addEventListener('touchcancel', () => setActive(false));
}

bindWalkButton('moveForward', 'forward');
bindWalkButton('moveBack', 'back');
bindWalkButton('moveLeft', 'left');
bindWalkButton('moveRight', 'right');

function updateLook(deltaX, deltaY) {
  const sensitivity = 0.0022;
  lookEuler.y -= deltaX * sensitivity;
  lookEuler.x -= deltaY * sensitivity;
  lookEuler.x = THREE.MathUtils.clamp(lookEuler.x, -Math.PI * 0.45, Math.PI * 0.32);
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.focus();
  player.dragging = true;
  player.lastX = event.clientX;
  player.lastY = event.clientY;
});

window.addEventListener('pointermove', (event) => {
  if (!player.dragging) return;
  updateLook(event.clientX - player.lastX, event.clientY - player.lastY);
  player.lastX = event.clientX;
  player.lastY = event.clientY;
});

window.addEventListener('pointerup', () => {
  player.dragging = false;
});

window.addEventListener('blur', () => {
  Object.keys(moveState).forEach((key) => {
    moveState[key] = false;
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

clampPlayerToBounds();
setLookFromEuler();

function updatePhoneAnimation(dt) {
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

  const startPos = new THREE.Vector3(0, -0.6, -0.4);
  const startRot = new THREE.Euler(-Math.PI * 0.4, 0, 0);

  const endPos = new THREE.Vector3(0, -0.02, -0.65);
  const endRot = new THREE.Euler(0, 0, 0);

  const t = phoneState.progress;
  const ease = t * t * (3 - 2 * t);

  heldPhoneGroup.position.lerpVectors(startPos, endPos, ease);

  heldPhoneGroup.rotation.x = THREE.MathUtils.lerp(startRot.x, endRot.x, ease);
  heldPhoneGroup.rotation.y = THREE.MathUtils.lerp(startRot.y, endRot.y, ease);
  heldPhoneGroup.rotation.z = THREE.MathUtils.lerp(startRot.z, endRot.z, ease);

  if (ui.phoneUI) {
    const showUI = phoneState.active && phoneState.wakeTimer > 0.25;
    ui.phoneUI.classList.toggle('is-visible', showUI);
    ui.phoneUI.setAttribute('aria-hidden', !showUI);
  }
}

function switchPhoneView(viewId) {
  if (!ui.phoneViews) return;
  ui.phoneViews.forEach((view) => {
    view.classList.toggle('is-active', view.id === viewId);
  });
}

if (ui.phoneAppBtns) {
  ui.phoneAppBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const app = btn.getAttribute('data-app');
      if (app === 'messages') switchPhoneView('phoneMessagesView');
      if (app === 'map') switchPhoneView('phoneMapView');
      if (app === 'settings') switchPhoneView('phoneSettingsView');
    });
  });
}

if (ui.openMessagesBtn) {
  ui.openMessagesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    switchPhoneView('phoneMessagesView');
  });
}

if (ui.phoneBackBtns) {
  ui.phoneBackBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPhoneView('phoneHomeView');
    });
  });
}

if (ui.phoneHomeBar) {
  ui.phoneHomeBar.addEventListener('click', (e) => {
    e.stopPropagation();
    switchPhoneView('phoneHomeView');
  });
}

const dilemmaInvest = {
  title: "Dilema: Préstamo Familiar",
  description: "Tu hijo te pide $200 para invertir en un negocio de tecnología de alto riesgo.",
  optionA: {
    label: "Prestarle los $200",
    successRate: 0,
    positive: {
      description: "El negocio despega rápidamente y tu hijo te devuelve el dinero con creces.",
      effects: { money: 150, happiness: 25, calm: 10 }
    },
    negative: {
      description: "El negocio fracasa ante la competencia. Pierdes el dinero y hay tensión familiar.",
      effects: { money: -200, happiness: -20, calm: -35 }
    }
  },
  optionB: {
    label: "Negarle el préstamo",
    successRate: 0.8,
    positive: {
      description: "Tu hijo entiende tus motivos y busca otro inversor. Proteges tus ahorros intactos.",
      effects: { money: 0, happiness: -5, calm: 15 }
    },
    negative: {
      description: "Tu hijo se ofende profundamente por la falta de apoyo y deja de hablarte por unas semanas.",
      effects: { money: 0, happiness: -30, calm: -20 }
    }
  }
};

function renderImpactBadges(container, effects) {
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

function applyEffects(effects) {
  if (effects.money) statsState.money = Math.max(0, statsState.money + effects.money);
  if (effects.happiness) statsState.happiness = Math.max(0, Math.min(100, statsState.happiness + effects.happiness));
  if (effects.calm) statsState.calm = Math.max(0, Math.min(100, statsState.calm + effects.calm));
}

let activeDilemmaResolve = null;

function showDilemma(config, onResolve) {
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

  if (ui.btnSelectA) ui.btnSelectA.onclick = () => selectDilemmaOption(config.optionA);
  if (ui.btnSelectB) ui.btnSelectB.onclick = () => selectDilemmaOption(config.optionB);

  ui.dilemmaModal.setAttribute('aria-hidden', 'false');
}

function selectDilemmaOption(option) {
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

if (ui.sendReplyBtn && ui.replyBubble) {
  ui.sendReplyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showDilemma(dilemmaInvest, () => {
      ui.replyBubble.classList.remove('is-hidden');
      ui.sendReplyBtn.textContent = '✓ Decisión tomada';
      ui.sendReplyBtn.disabled = true;
      ui.sendReplyBtn.style.opacity = '0.5';
    });
  });
}

if (ui.phoneUI) {
  ui.phoneUI.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  ui.phoneUI.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  ui.phoneUI.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  });
}

function updateStats(dt) {
  if (phoneState.active) {
    statsState.fatigue += dt;
    statsState.fatigue = Math.min(60, statsState.fatigue);
  } else {
    statsState.fatigue -= dt * 2;
    statsState.fatigue = Math.max(0, statsState.fatigue);
  }

  const percentage = (statsState.fatigue / 60) * 100;
  if (ui.fatigueValue) {
    ui.fatigueValue.textContent = Math.round(percentage) + '%';
    if (percentage > 75) ui.fatigueValue.style.color = '#ef4444';
    else if (percentage > 40) ui.fatigueValue.style.color = '#f59e0b';
    else ui.fatigueValue.style.color = '#3b82f6';
  }
  if (ui.fatigueFill) {
    ui.fatigueFill.style.width = percentage + '%';
  }

  if (ui.moneyValue) ui.moneyValue.textContent = '$' + statsState.money;
  if (ui.happinessValue) ui.happinessValue.textContent = Math.round(statsState.happiness) + '%';
  if (ui.happinessFill) ui.happinessFill.style.width = statsState.happiness + '%';
  if (ui.calmValue) ui.calmValue.textContent = Math.round(statsState.calm) + '%';
  if (ui.calmFill) ui.calmFill.style.width = statsState.calm + '%';

  const t = statsState.fatigue / 60;
  const blurFactor = t * t * 10;
  const filterVal = blurFactor > 0.05 ? `blur(${blurFactor.toFixed(2)}px)` : 'none';
  if (ui.experienceCanvas) ui.experienceCanvas.style.filter = filterVal;
  if (ui.phoneUI) ui.phoneUI.style.filter = filterVal;
}

function animate() {
  const dt = clock.getDelta();
  updateFirstPerson(dt);
  updateDoors(dt);
  updatePhoneAnimation(dt);
  updateStats(dt);
  updateMissions(dt);
  updateCinematic(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// --- GAME START FLOW ---
// Add intro-active class immediately to hide HUD
document.body.classList.add('intro-active');

// Start button handler
if (ui.startBtn) {
  ui.startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startIntro();
  });
}

// Start the render loop (scene renders behind intro overlay)
animate();
