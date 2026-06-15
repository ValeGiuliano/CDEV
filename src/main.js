import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createIcons, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, DollarSign, Smile, Wind, Eye } from 'lucide';
import { ui } from './utils/dom.js';
import { showToast } from './utils/helpers.js';
import {
  setVisualFatigueDisabled,
  setCurrentContact,
  setDayRestarted,
  dayRestarted,
} from './state/index.js';

void dayRestarted; // referenced in day2WakeUpSequence below
import {
  MONEY_INITIAL,
  MONEY_BARBIE,
  FATIGUE_MAX,
  FATIGUE_INCREASE_PER_SEC,
  FATIGUE_DECREASE_PER_SEC,
  BED_POSITION,
  CAMERA_WAKE_UP,
  CAMERA_AFTER_WAKE_UP,
  CAMERA_LOOK_AT_AFTER_WAKE_UP,
  MESSAGE_AFTER_PLAYSTORE_MS,
  MESSAGE_AFTER_INSTALL_MS,
  INSTALL_DELAY_MS,
} from './config/constants.js';
import { dilemmaTutorial, mlGiftsDilemma } from './data/dilemmas.js';
import { mlProducts } from './data/products.js';
const fakeMLProducts = mlProducts;
import { camiloDialogues, claraDialogues } from './data/chats/index.js';
import { playDoorbellSound, playNotificationSound, playAlertSound, playCinematicSound } from './audio/sounds.js';

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
let martaMixer = null;
let martaLoadedModel = null;
let sonMixer = null;
let sonLoadedModel = null;
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

const mlAdState = {
  phase: 0,
  adsCompleted: false,
  ad2TrueIndex: -1,
  ad3Clicks: 0,
  ad3MaxClicks: 5,
  ad3XPos: { top: '50%', left: '50%' },
};

const statsState = {
  fatigue: 0,
  money: 100000,
  happiness: 80,
  calm: 75,
};

let visualFatigueDisabled = false;

const missionsState = {
  currentMissionId: null,
  active: false,
  completed: false,
  doorbellTimer: 0,
};

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
  if (id === 'tutorial') {
    playNotificationSound();
    addTutorialMessage();
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

// --- CARGA ASÍNCRONA DE MARTA EN 3D (CON FALLBACK PROCEDURAL) ---
gltfLoader.load(
  '/marta.glb',
  (gltf) => {
    const model = gltf.scene;
    
    // Habilitar sombras y asegurar que los materiales se vean de ambos lados
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });

    // Ocultar los placeholders procedimentales cilíndricos originales de Marta
    martaSkirt.visible = false;
    martaTorso.visible = false;
    martaHead.visible = false;
    martaHair.visible = false;
    martaArmL.visible = false;
    martaArmR.visible = false;

    // Guardar referencia global e incorporar el modelo inmediatamente al nodo de escena
    // Esto asegura que la jerarquía y el cálculo de matrices globales tengan contexto físico real
    martaLoadedModel = model;
    room.add(model);
    model.updateMatrixWorld(true);

    // --- AUTODETECTAR ESCALA Y ALINEACIÓN DE LA CAJA ENVOLVENTE (MALLAS GEOMÉTRICAS ÚNICAMENTE) ---
    // Forzar la inicialización y actualización de matrices jerárquicas de mundo tanto en el modelo
    // como en sus sub-mallas individuales. Esto evita factores de escala disparatados.
    const box = new THREE.Box3();
    let hasMeshes = false;
    model.traverse((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld(true);
        box.expandByObject(child);
        hasMeshes = true;
      }
    });

    if (!hasMeshes) {
      box.setFromObject(model);
    }

    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    const center = box.getCenter(new THREE.Vector3());
    
    console.log("--- DEBUG MARTA GLB (SOLO MALLAS) ---");
    console.log("Tamaño real del cuerpo de Marta:", size);
    console.log("Centro real de Marta:", center);
    console.log("Mínimo real:", min);
    
    // 1. Auto-escala relativa a la puerta (2.1 metros)
    // Queremos que Marta mida aproximadamente el 77% de la altura de la puerta (1.62 metros de altura para que luzca proporcional)
    const targetHeight = 2.1 * 0.77; 
    const maxDim = Math.max(size.x, size.y, size.z); // Dimensión más larga de cabeza a pies
    let scaleFactor = targetHeight / maxDim;
    
    console.log("Altura objetivo (77% de puerta de 2.1m):", targetHeight);
    console.log("Factor de escala calculado:", scaleFactor);
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    model.userData.scaleFactor = scaleFactor; // Almacenar escala original para evitar deformaciones en el loop

    // 2. Colocar al personaje parado de pie sobre el suelo, libre del sillón, mirando hacia la TV
    // El sillón y su apoyabrazos terminan en X = -1.43. La colocamos en X = -0.7 para que libre el sillón con soltura.
    model.position.x = -0.7 - center.x * scaleFactor;
    model.position.z = -2.3 - center.z * scaleFactor;
    
    // Asegurar que la base de sus pies (min Y) descanse exactamente sobre el piso (Y = 0)
    model.position.y = 0 - min.y * scaleFactor;
    
    // Rotar para mirar hacia la televisión (+X)
    model.rotation.set(0, Math.PI / 2, 0); 
    
    console.log("Posición local parada calculada (libre de sillón):", model.position);

    // --- RELAJAR BRAZOS EN POSE EN T PROCEDURALMENTE POR HUESOS ---
    // Recorremos el esqueleto de la abuela buscando los huesos de los hombros/brazos superiores
    // para rotarlos hacia abajo y darles una posición relajada y natural por defecto.
    model.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        if ((name.includes('upperarm') || name.includes('arm')) &&
            !name.includes('forearm') && !name.includes('hand') && !name.includes('finger') && !name.includes('twist')) {
          
          if (name.includes('left') || name.includes('l_') || name.endsWith('l')) {
            child.rotation.z = -1.25; // Bajar brazo izquierdo
            child.rotation.x = 0.15;  // Desplazar ligeramente al frente
            child.rotation.y = 0.10;
          } else if (name.includes('right') || name.includes('r_') || name.endsWith('r')) {
            child.rotation.z = 1.25;  // Bajar brazo derecho
            child.rotation.x = 0.15;  // Desplazar ligeramente al frente
            child.rotation.y = -0.10;
          }
        }
      }
    });

    // --- LUZ DE RELLENO DEDICADA PARA EL ROSTRO DE MARTA ---
    // Colocamos una luz PointLight física, cálida y de rebote sin sombras posicionada a 60cm
    // adelante de su cara (en coordenadas locales +X ya que el modelo mira hacia +X en la escena).
    // Esto garantiza que su rostro y hombros brillen maravillosamente en la cinemática
    // sin crear sombras secundarias extrañas y se oculte de forma limpia en el gameplay.
    const martaFillLight = new THREE.PointLight(0xfff1cf, 2.5, 3.5);
    martaFillLight.position.set(0.6, 1.45, 0); // Localmente: 60cm adelante de su cara, altura de ojos
    martaFillLight.castShadow = false;
    model.add(martaFillLight);

    // Guardar los ojos del modelo para el parpadeo procedural
    const eyes = [];
    model.traverse((child) => {
      if (child.isMesh && (
        child.name.toLowerCase().includes('eye') || 
        child.name.toLowerCase().includes('ojo') || 
        child.name.toLowerCase().includes('pupil') || 
        child.name.toLowerCase().includes('pupila') ||
        child.name.toLowerCase().includes('glance') ||
        child.name.toLowerCase().includes('look')
      )) {
        eyes.push(child);
      }
    });
    model.userData.eyes = eyes;

    console.log("--- DEBUG PARPADEO MARTA ---");
    console.log("Mallas de ojos detectadas en el modelo:", eyes.map(e => e.name));
    if (eyes.length === 0) {
      console.log("No se detectó ninguna malla de ojo compatible de forma automática. Nombres de todas las mallas en el modelo para referencia:");
      model.traverse((child) => {
        if (child.isMesh) {
          console.log(` - Mesh: "${child.name}" (Visible: ${child.visible})`);
        }
      });
    }

    // Intentar registrar animaciones esqueléticas si vienen en el archivo GLB
    const validAnimations = gltf.animations.filter(a => {
      const name = a.name.toLowerCase();
      return !name.includes('tpose') && 
             !name.includes('t-pose') && 
             !name.includes('bind') && 
             !name.includes('default') && 
             !name.includes('pose') &&
             a.duration > 0.05; // Filtrar poses estáticas
    });

    if (gltf.animations && gltf.animations.length > 0 && validAnimations.length > 0) {
      martaMixer = new THREE.AnimationMixer(model);
      model.userData.animations = gltf.animations;

      console.log("--- DEBUG ANIMACIONES MARTA ---");
      console.log("Animaciones disponibles en Marta:", gltf.animations.map(a => a.name));

      // Buscar una animación adecuada de hablar (conversar)
      const talkClip = validAnimations.find(a => 
        a.name.toLowerCase().includes('talk') || 
        a.name.toLowerCase().includes('argue') || 
        a.name.toLowerCase().includes('discut') ||
        a.name.toLowerCase().includes('habla') ||
        a.name.toLowerCase().includes('speech')
      ) || validAnimations[0];

      model.userData.talkClip = talkClip;
      console.log(`Animación esquelética de diálogo registrada con éxito ("${talkClip.name}").`);
    } else {
      // Habilitar animación procedimental de respaldo (idle) si es un modelo estático
      model.userData.proceduralIdle = true;
      console.log("El modelo de la abuela cargó sin animaciones corporales. Se aplicará idle procedimental de respaldo.");
    }
  },
  undefined,
  (error) => {
    console.warn("No se encontró o no se pudo cargar marta.glb en la carpeta public. Usando fallback procedural.", error);
  }
);

// --- CARGA ASÍNCRONA DEL HIJO EN 3D (CON FALLBACK PROCEDURAL) ---
gltfLoader.load(
  '/hijo.glb',
  (gltf) => {
    const model = gltf.scene;
    
    // Habilitar sombras y asegurar que los materiales se vean de ambos lados
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });

    // Incorporar el modelo del hijo inmediatamente al nodo de escena para contextualizar matrices de mundo
    sonLoadedModel = model;
    room.add(model);
    model.visible = false;
    model.updateMatrixWorld(true);

    // --- AUTODETECTAR ESCALA Y ALINEACIÓN DE LA CAJA ENVOLVENTE (MALLAS GEOMÉTRICAS ÚNICAMENTE) ---
    // Asegurar inicialización y actualización de matrices jerárquicas en mallas del hijo
    const box = new THREE.Box3();
    let hasMeshes = false;
    model.traverse((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld(true);
        box.expandByObject(child);
        hasMeshes = true;
      }
    });

    if (!hasMeshes) {
      box.setFromObject(model);
    }

    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    
    console.log("--- DEBUG HIJO GLB ---");
    console.log("Tamaño real del cuerpo del hijo:", size);
    
    // Auto-escala relativa a la puerta (2.1 metros)
    // El hijo mide el 86% de la altura de la puerta (1.80 metros de altura, alto y gallardo)
    const targetHeight = 2.1 * 0.86; 
    const maxDim = Math.max(size.x, size.y, size.z);
    let scaleFactor = targetHeight / maxDim;
    
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Calcular y guardar el offset vertical base para situarlo de pie sobre el suelo (Y = 0)
    const baseOffset = 0 - min.y * scaleFactor;
    model.userData.baseOffset = baseOffset;

    console.log("El modelo hijo.glb cargó con éxito. Offset base Y:", baseOffset);

    // Intentar reproducir animaciones esqueléticas si vienen en el archivo GLB
    if (gltf.animations && gltf.animations.length > 0) {
      sonMixer = new THREE.AnimationMixer(model);
      model.userData.animations = gltf.animations;

      console.log("--- DEBUG ANIMACIONES HIJO ---");
      console.log("Animaciones disponibles en el Hijo:", gltf.animations.map(a => a.name));

      // Buscar una animación adecuada de Idle o espera para iniciar
      const idleClip = gltf.animations.find(a => 
        a.name.toLowerCase().includes('idle') || 
        a.name.toLowerCase().includes('wait') || 
        a.name.toLowerCase().includes('espera') ||
        a.name.toLowerCase().includes('stand')
      ) || gltf.animations[0];

      const action = sonMixer.clipAction(idleClip);
      action.play();
      console.log(`Animación esquelética iniciada para el hijo con éxito ("${idleClip.name}").`);
    }
  },
  undefined,
  (error) => {
    console.warn("No se encontró o no se pudo cargar hijo.glb en la carpeta public. Usando fallback procedural cilíndrico.", error);
  }
);

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

// --- SILLÓN ESTILIZADO DE PROPORCIONES REALISTAS ---
// Patas cortas de madera elegantes
for (const x of [-3.7, -2.1]) {
  for (const z of [-2.6, -2.0]) {
    addBox(room, [0.08, 0.06, 0.08], materials.wood, [x, 0.03, z]);
  }
}
// Base del sillón (delgada y sobria, de y=0.06 a y=0.18)
addBox(room, [1.85, 0.12, 0.85], materials.fabric, [-2.9, 0.12, -2.3]);
// Almohadón de asiento (proporcional y ergonómico, de y=0.18 a y=0.42)
addBox(room, [1.75, 0.24, 0.85], materials.fabric, [-2.9, 0.30, -2.3]);
// Respaldo de altura estándar (de y=0.36 a y=0.86)
addBox(room, [1.95, 0.50, 0.20], materials.fabric, [-2.9, 0.61, -2.625]);
// Apoyabrazos izquierdo (de y=0.12 a y=0.60)
addBox(room, [0.20, 0.48, 0.82], materials.fabric, [-3.825, 0.36, -2.285]);
// Apoyabrazos derecho (de y=0.12 a y=0.60)
addBox(room, [0.20, 0.48, 0.82], materials.fabric, [-1.975, 0.36, -2.285]);

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

// 5b. Cama de Marta (Rincón del dormitorio)
const bedGroup = new THREE.Group();
bedGroup.position.set(4.2, 0, 4.2);
room.add(bedGroup);

// Base de la cama (estructura de madera)
addBox(bedGroup, [1.6, 0.35, 2.1], materials.wood, [0, 0.175, 0]);
// Colchón blanco
addBox(bedGroup, [1.5, 0.22, 2.0], new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.95 }), [0, 0.46, 0]);
// Sábana azul claro
addBox(bedGroup, [1.48, 0.06, 1.9], new THREE.MeshStandardMaterial({ color: 0xa8c8e8, roughness: 0.9 }), [0, 0.6, 0]);
// Almohada
addBox(bedGroup, [0.55, 0.1, 0.35], new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.95 }), [0, 0.62, -0.7]);
// Cabecera de la cama
addBox(bedGroup, [1.65, 0.85, 0.08], materials.wood, [0, 0.78, -1.02]);
// Manta doblada al pie de la cama
addBox(bedGroup, [1.3, 0.08, 0.5], new THREE.MeshStandardMaterial({ color: 0xc4786a, roughness: 0.85 }), [0, 0.64, 0.65]);

const bedState = {
  position: new THREE.Vector3(4.2, 0, 4.2),
  label: 'cama',
};

let gameState = {
  currentDay: 1,
};

const conversations = {
  camilo: [],
  clara: [],
};

let currentContact = null;

const installedApps = {
  messages: true,
  map: true,
  settings: true,
  playstore: false,
  mercadolibre: false,
  mercad0libre: false,
};

const playstoreApps = [
  { id: 'mercad0libre', name: 'Mercad0Libre', dev: 'Mercado Libre', color: '#FFF600', label: 'M0' },
  { id: 'whatsapp', name: 'WhatsApp', dev: 'Meta Platforms', color: '#25D366', label: 'WA' },
  { id: 'instagram', name: 'Instagram', dev: 'Meta Platforms', color: '#E4405F', label: 'IG' },
  { id: 'spotify', name: 'Spotify', dev: 'Spotify AB', color: '#1DB954', label: 'Sp' },
  { id: 'netflix', name: 'Netflix', dev: 'Netflix, Inc.', color: '#E50914', label: 'N' },
  { id: 'mercadolibre', name: 'MercadoLibre', dev: 'Mercado Libre', color: '#FFF600', label: 'ML' },
];

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

function isNearBed() {
  const distance = Math.hypot(camera.position.x - bedState.position.x, camera.position.z - bedState.position.z);
  return distance < 1.8;
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

function startCinematic(sequence, onEnd) {
  // Exit pointer lock if active
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
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
  if (sonLoadedModel) sonLoadedModel.visible = false;
  if (typeof oldWomanMesh !== 'undefined') oldWomanMesh.visible = false;
  if (martaLoadedModel) martaLoadedModel.visible = false;
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
      phoneProp.visible = true;

      const sonX = 1.1;
      const sonZ = -11.4;

      if (sonLoadedModel) {
        sonMesh.visible = false;
        sonLoadedModel.visible = true;
        const sonOffset = sonLoadedModel.userData.baseOffset || 0;
        sonLoadedModel.position.set(sonX, sonOffset, sonZ);
        // El hijo mira hacia Marta (X = 1.5, Z = -10.1)
        const dX = 1.5 - sonX;
        const dZ = -10.1 - sonZ;
        sonLoadedModel.rotation.set(0, Math.atan2(dX, dZ), 0);

        // Activar la animación de espera (Idle) al inicio de la cinemática
        if (sonMixer && sonLoadedModel.userData.animations) {
          const idleClip = sonLoadedModel.userData.animations.find(a => 
            a.name.toLowerCase().includes('idle') || 
            a.name.toLowerCase().includes('wait') || 
            a.name.toLowerCase().includes('espera') ||
            a.name.toLowerCase().includes('stand')
          ) || sonLoadedModel.userData.animations[0];
          sonMixer.stopAllAction();
          sonMixer.clipAction(idleClip).play();
        }
      } else {
        sonMesh.visible = true;
        sonMesh.position.set(sonX, 1.3, sonZ);
      }

      phoneProp.position.set(1.15, 0.90, -11.3);

      if (martaLoadedModel) {
        oldWomanMesh.visible = false;
        martaLoadedModel.visible = true;
        const baseOffset = martaLoadedModel.position.y;
        martaLoadedModel.position.set(1.5, baseOffset, -10.1);
        const targetSonX = sonLoadedModel ? sonLoadedModel.position.x : sonX;
        const targetSonZ = sonLoadedModel ? sonLoadedModel.position.z : sonZ;
        const dX = targetSonX - 1.5;
        const dZ = targetSonZ - (-10.1);
        martaLoadedModel.rotation.set(0, Math.atan2(dX, dZ), 0);
      } else {
        oldWomanMesh.visible = true;
        oldWomanMesh.position.set(1.5, 1.25, -10.1);
      }

      camera.position.set(2.2, 1.45, -8.5);
      camera.lookAt(1.3, 1.25, -10.8);
    },
    action: (progress) => {
      phoneProp.position.lerpVectors(
        new THREE.Vector3(1.15, 0.90, -11.3),
        new THREE.Vector3(1.4, 0.90, -10.5),
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
    onStart: () => {
      // Activar la animación de conversación de Marta cuando habla
      if (martaLoadedModel && martaMixer && martaLoadedModel.userData.talkClip) {
        martaMixer.stopAllAction();
        martaMixer.clipAction(martaLoadedModel.userData.talkClip).play();
      }
    },
    action: (progress) => {
      const zPos = -10.1 + Math.sin(progress * Math.PI) * 0.05;
      if (martaLoadedModel) {
        martaLoadedModel.position.z = zPos;
      } else {
        oldWomanMesh.position.z = zPos;
      }
      camera.position.z = THREE.MathUtils.lerp(-8.8, -9.0, progress);
      camera.lookAt(1.3, 1.25, -10.8);
    }
  },
  {
    duration: 3.0,
    dialogue: { speaker: "Hijo", text: "Lo sé abuela, pero haz el esfuerzo. Me tengo que ir corriendo al trabajo, ¡hablamos luego!" },
    sound: { freq: 550, type: 'triangle', duration: 0.2 },
    onStart: () => {
      // Detener animación de conversación de Marta para que relaje los brazos inmediatamente
      if (martaMixer) {
        martaMixer.stopAllAction();
      }
      // Activar la animación de caminar al empezar a moverse
      if (sonLoadedModel && sonMixer && sonLoadedModel.userData.animations) {
        const walkClip = sonLoadedModel.userData.animations.find(a => 
          a.name.toLowerCase().includes('walk') || 
          a.name.toLowerCase().includes('caminar') || 
          a.name.toLowerCase().includes('run') ||
          a.name.toLowerCase().includes('step')
        ) || sonLoadedModel.userData.animations[0];
        sonMixer.stopAllAction();
        sonMixer.clipAction(walkClip).play();
      }
    },
    action: (progress) => {
      const startPos = new THREE.Vector3(1.1, 0, -11.4);
      const endPos = new THREE.Vector3(4.5, 0, -15.5);
      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);

      if (sonLoadedModel) {
        const sonOffset = sonLoadedModel.userData.baseOffset || 0;
        sonLoadedModel.position.set(currentPos.x, sonOffset, currentPos.z);
        const dX = 4.5 - 1.1;
        const dZ = -15.5 - (-11.4);
        sonLoadedModel.rotation.set(0, Math.atan2(dX, dZ), 0);
      } else {
        sonMesh.position.set(currentPos.x, 1.3, currentPos.z);
      }

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
      phoneProp.visible = true;

      const sonX = 0.72;
      const sonZ = -6.8;

      if (sonLoadedModel) {
        sonMesh.visible = false;
        sonLoadedModel.visible = true;
        const sonOffset = sonLoadedModel.userData.baseOffset || 0;
        sonLoadedModel.position.set(sonX, sonOffset, sonZ);
        sonLoadedModel.rotation.set(0, 0, 0); // Mirar de frente hacia Z positivo (hacia Marta)

        // Activar la animación de espera (Idle) al inicio de la cinemática
        if (sonMixer && sonLoadedModel.userData.animations) {
          const idleClip = sonLoadedModel.userData.animations.find(a => 
            a.name.toLowerCase().includes('idle') || 
            a.name.toLowerCase().includes('wait') || 
            a.name.toLowerCase().includes('espera') ||
            a.name.toLowerCase().includes('stand')
          ) || sonLoadedModel.userData.animations[0];
          sonMixer.stopAllAction();
          sonMixer.clipAction(idleClip).play();
        }
      } else {
        sonMesh.visible = true;
        sonMesh.position.set(sonX, 1.3, sonZ);
      }

      phoneProp.position.set(0.72, 0.90, -6.4);

      if (martaLoadedModel) {
        oldWomanMesh.visible = false;
        martaLoadedModel.visible = true;
        const baseOffset = martaLoadedModel.position.y;
        martaLoadedModel.position.set(0.72, baseOffset, -5.4);
        martaLoadedModel.rotation.set(0, Math.PI, 0); // Mirar hacia Z negativo (hacia el hijo)
      } else {
        oldWomanMesh.visible = true;
        oldWomanMesh.position.set(0.72, 1.25, -5.4);
      }

      camera.position.set(2.2, 1.45, -5.2);
      camera.lookAt(0.72, 1.25, -6.1);
    },
    action: (progress) => {
      phoneProp.position.lerpVectors(
        new THREE.Vector3(0.72, 0.90, -6.4),
        new THREE.Vector3(0.72, 0.90, -5.7),
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
    onStart: () => {
      // Activar la animación de conversación de Marta cuando habla
      if (martaLoadedModel && martaMixer && martaLoadedModel.userData.talkClip) {
        martaMixer.stopAllAction();
        martaMixer.clipAction(martaLoadedModel.userData.talkClip).play();
      }
    },
    action: (progress) => {
      const zPos = -5.4 + Math.sin(progress * Math.PI) * 0.05;
      if (martaLoadedModel) {
        martaLoadedModel.position.z = zPos;
      } else {
        oldWomanMesh.position.z = zPos;
      }
      camera.position.x = THREE.MathUtils.lerp(2.0, 1.85, progress);
      camera.lookAt(0.72, 1.25, -6.1);
    }
  },
  {
    duration: 3.0,
    dialogue: { speaker: "Hijo", text: "Lo sé abuela, pero haz el esfuerzo. Me tengo que ir corriendo al trabajo, ¡hablamos luego!" },
    sound: { freq: 550, type: 'triangle', duration: 0.2 },
    onStart: () => {
      // Detener animación de conversación de Marta para que relaje los brazos inmediatamente
      if (martaMixer) {
        martaMixer.stopAllAction();
      }
      // Activar la animación de caminar al empezar a moverse
      if (sonLoadedModel && sonMixer && sonLoadedModel.userData.animations) {
        const walkClip = sonLoadedModel.userData.animations.find(a => 
          a.name.toLowerCase().includes('walk') || 
          a.name.toLowerCase().includes('caminar') || 
          a.name.toLowerCase().includes('run') ||
          a.name.toLowerCase().includes('step')
        ) || sonLoadedModel.userData.animations[0];
        sonMixer.stopAllAction();
        sonMixer.clipAction(walkClip).play();
      }
    },
    action: (progress) => {
      const startPos = new THREE.Vector3(0.72, 0, -6.8);
      const endPos = new THREE.Vector3(1.4, 0, -10.2);
      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);

      if (sonLoadedModel) {
        const sonOffset = sonLoadedModel.userData.baseOffset || 0;
        sonLoadedModel.position.set(currentPos.x, sonOffset, currentPos.z);
        const dX = 1.4 - 0.72;
        const dZ = -10.2 - (-6.8);
        sonLoadedModel.rotation.set(0, Math.atan2(dX, dZ), 0);
      } else {
        sonMesh.position.set(currentPos.x, 1.3, currentPos.z);
      }

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
  // Step 3: Enter through the open door into the living room, looking towards standing Marta
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
        new THREE.Vector3(-0.7, 1.52, -2.3), // Enfocar la altura del rostro de Marta de pie (evita que el diálogo la tape)
        ease
      );
      camera.lookAt(lookTarget);
    }
  },
  // Step 4: Orbit around standing Marta
  {
    duration: 5.5,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Estafas, notificaciones estridentes e interfaces confusas acechan su tranquilidad.' },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      const angle = -Math.PI * 0.4 + ease * Math.PI * 0.7;
      const radius = 2.8 - ease * 0.6;
      const martaCenter = new THREE.Vector3(-0.7, 0, -2.3); // Posición de pie de Marta
      camera.position.set(
        martaCenter.x + Math.sin(angle) * radius,
        1.55 + Math.sin(ease * Math.PI) * 0.35, // Altura de órbita elevada para personaje parado
        martaCenter.z + Math.cos(angle) * radius
      );
      camera.lookAt(martaCenter.x, 1.52, martaCenter.z); // Apuntar a su rostro/ojos para mantenerla visible sobre el globo de texto
 
      if (martaSkirt.visible) {
        martaTorso.scale.y = 1.0 + Math.sin(Date.now() * 0.002) * 0.015;
        martaHead.position.y = 1.42 + Math.sin(Date.now() * 0.0015) * 0.005;
      }
    }
  },
  // Step 5: Zoom directly into Marta's eyes for a seamless POV transition
  {
    duration: 4.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Ponte en sus zapatos. Experimenta la brecha digital desde sus propios ojos.' },
    sound: { freq: 280, type: 'sine', duration: 0.6 },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      // La cámara viaja desde en frente a un lado hasta ubicarse exactamente en los ojos de Marta
      camera.position.lerpVectors(
        new THREE.Vector3(0.6, 1.55, -1.8),  // Delante y a la derecha de Marta
        new THREE.Vector3(-0.7, 1.48, -2.3), // Ojos de Marta (inicio del POV a nivel ergonómico de 1.48m)
        ease
      );
      // La cámara gira desde enfocar su rostro hasta mirar al frente hacia el TV (+X)
      const lookTarget = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(-0.7, 1.48, -2.3),
        new THREE.Vector3(9.3, 1.48, -2.3),  // Dirección del televisor en X positivo a nivel de ojos
        ease
      );
      camera.lookAt(lookTarget);

      // Ocultar proactivamente el modelo de Marta en cuanto la cámara se acerque demasiado.
      // Esto evita la penetración visual y los recortes poligonales grotescos dentro de su cabeza.
      const shouldBeVisible = (progress < 0.35);
      martaModel.visible = shouldBeVisible; // Desactivar visibilidad global en el render loop
      if (martaLoadedModel) {
        martaLoadedModel.visible = shouldBeVisible;
      } else {
        // Manipular visibilidad de placeholders procedimentales solo si el GLTF no cargó
        if (martaSkirt) {
          martaSkirt.visible = shouldBeVisible;
          martaTorso.visible = shouldBeVisible;
          martaHead.visible = shouldBeVisible;
          martaHair.visible = shouldBeVisible;
          martaArmL.visible = shouldBeVisible;
          martaArmR.visible = shouldBeVisible;
        }
      }
 
      // Fade to white para la transición de POV en el último 30% del paso
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

// --- DAY 2 WAKE-UP SEQUENCE ---
const day2WakeUpSequence = [
  {
    duration: 2.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Al día siguiente…' },
    onStart: () => {
      camera.position.set(4.2, 0.72, 3.45);
      camera.lookAt(4.2, 2.5, 3.45);
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.transition = 'none';
        ui.dayTransitionOverlay.style.opacity = '1';
        ui.dayTransitionOverlay.setAttribute('aria-hidden', 'false');
      }
    },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = String(1 - ease * 0.7);
      }
      camera.position.y = THREE.MathUtils.lerp(0.72, 0.78, ease);
    }
  },
  {
    duration: 3.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Marta abre los ojos. La luz de la mañana entra por la ventana.' },
    sound: { freq: 320, type: 'sine', duration: 0.4 },
    onStart: () => {
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = '0.3';
      }
      if (dayRestarted.value && ui.cinematicText) {
        ui.cinematicText.textContent = 'Qué horrible pesadilla…';
      }
    },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = String(0.3 * (1 - ease));
      }
      // From looking up at ceiling to looking toward the window
      const startTarget = new THREE.Vector3(4.2, 2.5, 3.45);
      const endTarget = new THREE.Vector3(4.2, 1.4, 0);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, ease);
      camera.lookAt(currentTarget);
      camera.position.y = THREE.MathUtils.lerp(0.78, 0.82, ease);
    }
  }
];

function restartCurrentDay() {
  // Close game over modal
  if (ui.gameOverModal) ui.gameOverModal.setAttribute('aria-hidden', 'true');
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');

  // Reset stats to initial Day 2 values
  statsState.fatigue = 0;
  statsState.money = 100000;
  statsState.happiness = 80;
  statsState.calm = 75;
  updateStats(0);

  // Reset missions
  missionsState.currentMissionId = null;
  missionsState.active = false;
  missionsState.completed = false;
  if (ui.missionsContainer) ui.missionsContainer.setAttribute('aria-hidden', 'true');

  // Reset conversations
  conversations.camilo = [];
  conversations.clara = [];

  // Reset installed apps
  installedApps.playstore = false;
  installedApps.mercadolibre = false;
  installedApps.mercad0libre = false;
  updatePhoneHomeApps();

  // Reset MercadoLibre ads state
  mlAdState.phase = 0;
  mlAdState.adsCompleted = false;
  mlAdState.ad3Clicks = 0;
  mlAdState.ad2TrueIndex = -1;
  mlAdState.ad3XPos = { top: '50%', left: '50%' };

  // Stop any active fraud drain
  fraudDrainState.active = false;

  // Close any open modals
  if (ui.dilemmaModal) ui.dilemmaModal.setAttribute('aria-hidden', 'true');
  if (ui.outcomeModal) ui.outcomeModal.setAttribute('aria-hidden', 'true');
  if (ui.daysBlockedModal) ui.daysBlockedModal.setAttribute('aria-hidden', 'true');

  // Put the phone away (save it) before starting the wake-up cinematic
  phoneState.active = false;
  phoneState.progress = 0;
  phoneState.wakeTimer = 0;
  phoneState.sleepTimer = 0;
  switchPhoneView('phoneHomeView');
  if (ui.phoneUI) {
    ui.phoneUI.classList.remove('is-visible');
    ui.phoneUI.setAttribute('aria-hidden', 'true');
  }
  if (ui.phonePrompt) {
    ui.phonePrompt.textContent = 'T Coger teléfono';
    ui.phonePrompt.classList.remove('is-active');
  }
  tablePhoneGroup.visible = true;
  heldPhoneGroup.visible = false;
  if (document.pointerLockElement === canvas) {
    document.requestPointerLock();
  }

  // Flag for restarted day
  setDayRestarted(true);

  // Position camera in bed and restart wake-up cinematic
  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  setTimeout(() => {
    startDay2();
  }, 400);
}

function startDay3() {
  // Stub for Day 3: position player, show a short message via the missions container.
  if (ui.missionsContainer) {
    ui.missionsContainer.setAttribute('aria-hidden', 'false');
    if (ui.missionTitle) ui.missionTitle.textContent = 'Fin del Día 2';
    if (ui.missionText) ui.missionText.textContent = 'Marta se acuesta tranquila. La Barbie llegará mañana y Clara estará feliz. ❤️';
    if (ui.missionCard) ui.missionCard.classList.add('is-completed');
  }
}

function startDay2() {
  // Position player in bed area for the wake-up cinematic
  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  // Wait for the day transition fade-out to finish before starting the cinematic
  function waitForTransition() {
    if (dayTransitionState.active) {
      requestAnimationFrame(waitForTransition);
      return;
    }

    startCinematic(day2WakeUpSequence, () => {
      // After cinematic: give control back and wait 5 seconds for the message
      camera.position.set(4.2, 1.48, 3.8);
      lookEuler.set(0, Math.PI, 0);
      camera.quaternion.setFromEuler(lookEuler);

      // Reset dayRestarted flag now that the cinematic has played
      setDayRestarted(false);

      setTimeout(() => {
        playNotificationSound();
        phoneState.active = true;
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        }
        if (ui.phonePrompt) {
          ui.phonePrompt.textContent = 'T Guardar teléfono';
          ui.phonePrompt.classList.add('is-active');
        }
        startClaraBirthdayMission();
        switchPhoneView('phoneMessagesView');
        setTimeout(() => {
          renderContactList();
          openContactChat('camilo');
          setTimeout(() => {
            startClaraBirthdayFlow();
          }, 500);
        }, 200);
      }, 5000);
    });
  }

  waitForTransition();
}

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

      // Situar la cámara de juego (POV) exactamente en los ojos de Marta de pie en X = -0.7, Z = -2.3
      camera.position.set(-0.7, 1.48, -2.3); // Altura de ojos de 1.48m para una transición 100% fluida del zoom final
      // Rotar la vista para mirar hacia la televisión en +X (Euler Y = -Math.PI / 2)
      lookEuler.set(0, -Math.PI / 2, 0);
      camera.quaternion.setFromEuler(lookEuler);

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
      if (martaLoadedModel) martaLoadedModel.visible = false;
      if (typeof phoneProp !== 'undefined') phoneProp.visible = false;

      if (missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
        setTimeout(() => {
          completeMission('doorbell');
          setTimeout(() => {
            setMission('tutorial', 'Tutorial', 'Lee el mensaje de Camilo para aprender a jugar.');
          }, 1000);
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

function updateBedPrompt(dt) {
  if (ui.bedPrompt) {
    if (isNearBed() && !getNearbyDoor()) {
      ui.bedPrompt.textContent = 'E Dormir';
      ui.bedPrompt.classList.add('is-visible');
    } else {
      ui.bedPrompt.classList.remove('is-visible');
    }
  }
}

let dayTransitionState = {
  active: false,
  progress: 0,
  phase: 'fade-in', // 'fade-in' or 'fade-out'
  onEnd: null,
};

function startDayTransition(onEnd) {
  if (cinematicState.active) return;
  if (!areAllMissionsComplete()) {
    showDaysBlockedModal();
    return;
  }
  dayTransitionState = {
    active: true,
    progress: 0,
    phase: 'fade-in',
    onEnd: onEnd,
  };
  cinematicState.active = true;
}

function showDaysBlockedModal() {
  if (ui.daysBlockedModal) {
    ui.daysBlockedModal.setAttribute('aria-hidden', 'false');
  }
}

function hideDaysBlockedModal() {
  if (ui.daysBlockedModal) {
    ui.daysBlockedModal.setAttribute('aria-hidden', 'true');
  }
}

function updateDayTransition(dt) {
  if (!dayTransitionState.active) return;

  const speed = 1.8;
  dayTransitionState.progress += dt * speed;

  if (dayTransitionState.phase === 'fade-in') {
    if (dayTransitionState.progress >= 1) {
      dayTransitionState.progress = 1;
      // Execute the callback (advance day, reset fatigue)
      if (dayTransitionState.onEnd) dayTransitionState.onEnd();
      // Switch to fade-out
      dayTransitionState.phase = 'fade-out';
      dayTransitionState.progress = 0;
    }
  } else if (dayTransitionState.phase === 'fade-out') {
    if (dayTransitionState.progress >= 1) {
      dayTransitionState.progress = 1;
      dayTransitionState.active = false;
      cinematicState.active = false;
    }
  }
}

function getDayTransitionOpacity() {
  if (!dayTransitionState.active) return 0;
  if (dayTransitionState.phase === 'fade-in') {
    return dayTransitionState.progress;
  } else {
    return 1 - dayTransitionState.progress;
  }
}

function updatePhonePrompt(dt) {
  // El teléfono solo está disponible después de completar la misión del timbre
  const phoneAvailable = !missionsState.currentMissionId || missionsState.currentMissionId !== 'doorbell' || missionsState.completed;
  
  if (ui.phonePrompt) {
    if (phoneAvailable) {
      ui.phonePrompt.classList.add('is-visible');
    } else {
      ui.phonePrompt.classList.remove('is-visible');
    }
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
  camera.position.y = 1.48 + bob; // Altura de ojos de Marta (1.48m) en lugar de la altura de la frente/cabeza (1.58m)
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

    // El teléfono solo está disponible después de completar la misión del timbre
    if (missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
      return;
    }

    phoneState.active = !phoneState.active;
    
    // Release pointer lock to allow clicking on the phone screen,
    // or request it back when putting the phone away.
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
    return;
  }
  if (active && isDoorKey(event)) {
    if (event.repeat) return;
    event.preventDefault();
    if (getNearbyDoor()) {
      toggleNearbyDoor();
      return;
    }
    if (isNearBed()) {
      startDayTransition(() => {
        gameState.currentDay++;
        if (ui.dayCounter) ui.dayCounter.textContent = 'Día ' + gameState.currentDay;
        missionsState.currentMissionId = null;
        missionsState.active = false;
        missionsState.completed = false;
        if (gameState.currentDay === 2) {
          startDay2();
        } else if (gameState.currentDay === 3) {
          startDay3();
        }
      });
      return;
    }
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
  const sensitivity = 0.0022; // Adjust this value up or down to tune the feel
  lookEuler.y -= deltaX * sensitivity;
  lookEuler.x -= deltaY * sensitivity;
  lookEuler.x = THREE.MathUtils.clamp(lookEuler.x, -Math.PI * 0.45, Math.PI * 0.32);
}

// Request Pointer Lock when clicking the canvas
canvas.addEventListener('click', () => {
  // Do not lock pointer during cutscenes or when using the phone
  if (!cinematicState.active && !phoneState.active) {
    canvas.requestPointerLock();
  }
});

// Track pointer lock status changes if needed
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    player.dragging = false; // Disable drag-to-look flag when fully locked
  }
});

// Update camera look using movement deltas
window.addEventListener('pointermove', (event) => {
  if (document.pointerLockElement === canvas) {
    // When pointer is locked, use direct movement deltas
    updateLook(event.movementX, event.movementY);
  } else if (player.dragging) {
    // Fallback to drag-to-look when not locked (original behavior)
    updateLook(event.clientX - player.lastX, event.clientY - player.lastY);
    player.lastX = event.clientX;
    player.lastY = event.clientY;
  }
});

// Retain pointerdown for the fallback drag system
canvas.addEventListener('pointerdown', (event) => {
  canvas.focus();
  if (document.pointerLockElement !== canvas) {
    player.dragging = true;
    player.lastX = event.clientX;
    player.lastY = event.clientY;
  }
});

canvas.addEventListener('click', () => {
  if (phoneState.active) return;
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  }
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

function addTutorialMessage() {
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

  // Remove any existing tutorial message to avoid duplicates
  if (conversations.camilo) {
    conversations.camilo = conversations.camilo.filter((msg) => !msg.html.includes('¡Bienvenida, Mamá!'));
  }
  addMessageToConversation('camilo', 'incoming', html);
}

function showMartaReplyTutorial() {
  addMessageToConversation('camilo', 'outgoing', `Camilito, gracias por el celular y por tu mensaje tan lindo. Con tu cariño me alcanza y sobra. Voy a tratar de aprender a usarlo, aunque me cueste. Te quiero mucho, hijo. ❤️`);
}

function showCamiloBedMessage() {
  addMessageToConversation('camilo', 'incoming', `Mamá, me alegra que te haya gustado el celular. ¿Ves que no era tan difícil? 😄<br><br>Ah, y una cosa importante: la cama es para descansar entre día y día. Si no dormís bien, el tiempo no avanza. Es tu manera de recuperarte y empezar un nuevo día.<br><br>Bueno, ya te dejo descansar. Mañana seguimos hablando. Te quiere, Camilo. ❤️<br><br><em>PD: Cuando quieras terminar la noche, andá a la cama.</em>`);

  const replyBox = ui.phoneChatReplyBox;
  if (replyBox) {
    replyBox.classList.remove('is-hidden');
    replyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-tutorial-accept="true">Aceptar</button>`;
  }
}

function areAllMissionsComplete() {
  return missionsState.completed === true;
}

function renderContactList() {
  const list = ui.phoneContactsList;
  if (!list) return;

  list.innerHTML = '';
  currentContact = null;

  const contacts = [
    { id: 'camilo', name: 'Camilo', avatar: '👨', preview: getLastPreview('camilo') },
    { id: 'clara', name: 'Clara', avatar: '👧', preview: getLastPreview('clara') },
  ];

  contacts.forEach((contact) => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-avatar" style="background:${contact.id === 'camilo' ? '#2563eb' : '#ec4899'}">${contact.avatar}</div>
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

function getLastPreview(contact) {
  if (!conversations[contact] || conversations[contact].length === 0) return '';
  const last = conversations[contact][conversations[contact].length - 1];
  const text = last.html.replace(/<[^>]*>/g, ' ').trim();
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

function openContactChat(contact) {
  currentContact = contact;

  if (ui.phoneContactsList) ui.phoneContactsList.style.display = 'none';
  if (ui.phoneChatContainer) ui.phoneChatContainer.style.display = 'flex';
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.style.display = 'block';

  const name = contact === 'camilo' ? 'Camilo' : 'Clara';
  if (ui.messagesTopbarTitle) ui.messagesTopbarTitle.textContent = name;

  renderConversation(contact);
}

function addMessageToConversation(contact, type, html) {
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

  // Update preview if contact list is visible
  if (currentContact === null && ui.phoneContactsList && ui.phoneContactsList.style.display !== 'none') {
    renderContactList();
  }
}

function renderConversation(contact) {
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

function renderPlayStore(filterText) {
  const list = document.getElementById('playstoreAppList');
  if (!list) return;
  list.innerHTML = '';
  const query = (filterText || '').toLowerCase();
  playstoreApps.forEach((app) => {
    if (installedApps[app.id]) return;
    if (query && !app.name.toLowerCase().includes(query)) return;
    const card = document.createElement('div');
    card.className = 'playstore-card';
    card.innerHTML = `
      <div class="playstore-icon" style="background:${app.color}"><span style="color:#fff;font-weight:800;font-size:0.85rem;">${app.label}</span></div>
      <div class="playstore-card-info"><h5>${app.name}</h5><span>${app.dev}</span></div>
      <button class="playstore-install-btn" data-install-btn="${app.id}">Instalar</button>
    `;
    list.appendChild(card);
    const btn = card.querySelector('.playstore-install-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      installApp(app.id, btn);
    });
  });
  if (list.children.length === 0) {
    list.innerHTML = '<p style="color:#6b7280;text-align:center;padding:20px;font-size:0.85rem;">No se encontraron apps</p>';
  }
}

function installApp(appId, btn) {
  if (installedApps[appId]) return;
  btn.innerHTML = '<div class="install-progress"><div class="install-fill"></div></div><span style="font-size:0.7rem;">Descargando...</span>';
  btn.disabled = true;
  btn.className = 'playstore-install-btn playstore-btn-downloading';
  setTimeout(() => {
    installedApps[appId] = true;
    btn.innerHTML = '✓ Instalado';
    btn.className = 'playstore-install-btn playstore-btn-installed';
    const app = playstoreApps.find((a) => a.id === appId);
    if (app) showToast(app.name + ' instalado');
    updatePhoneHomeApps();

    if (appId === 'mercadolibre') {
      // Installing the app no longer completes the mission:
      // the player must perform a real purchase to finish the mission.
    }

    setTimeout(() => renderPlayStore(document.getElementById('playstoreSearchInput')?.value || ''), 500);
  }, 1500);
}

function updatePhoneHomeApps() {
  const psBtn = document.getElementById('playstoreAppBtn');
  const mlBtn = document.getElementById('mercadolibreAppBtn');
  const fakeBtn = document.getElementById('mercad0libreAppBtn');
  if (psBtn) psBtn.style.display = installedApps.playstore ? '' : 'none';
  if (mlBtn) mlBtn.style.display = installedApps.mercadolibre ? '' : 'none';
  if (fakeBtn) fakeBtn.style.display = installedApps.mercad0libre ? '' : 'none';
}

function renderMLAd() {
  const container = document.getElementById('mlAdContent');
  if (!container) return;
  container.innerHTML = '';

  if (mlAdState.phase === 1) {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = `
      <div style="color:#fff;text-align:center;padding:20px;">
        <h2 style="font-size:1.8rem;margin-bottom:12px;">¡OFERTA IMPERDIBLE!</h2>
        <p style="font-size:1.1rem;margin-bottom:8px;">Smart TV 50" 4K</p>
        <p style="font-size:2rem;font-weight:800;">$299.999</p>
        <p style="font-size:0.9rem;opacity:0.8;margin-top:8px;">Antes: $499.999</p>
        <p style="font-size:0.8rem;opacity:0.6;margin-top:20px;">¡Solo por hoy!</p>
      </div>
      <button class="ad-x-btn" id="mlAd1X" style="top:12px;right:12px;">✕</button>
    `;
    const xBtn = document.getElementById('mlAd1X');
    if (xBtn) {
      xBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mlAdState.phase = 2;
        mlAdState.ad2TrueIndex = Math.floor(Math.random() * 8);
        renderMLAd();
      });
    }
  } else if (mlAdState.phase === 2) {
    container.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    container.innerHTML = `
      <div style="color:#fff;text-align:center;padding:20px;">
        <h2 style="font-size:1.6rem;margin-bottom:12px;">¡DESCUENTOS EXCLUSIVOS!</h2>
        <p style="font-size:1rem;margin-bottom:8px;">Hasta 40% OFF en tecnología</p>
        <p style="font-size:0.9rem;opacity:0.8;">Celulares, notebooks y más</p>
      </div>
    `;
    const positions = [
      { top: '15%', left: '15%' },
      { top: '15%', left: '75%' },
      { top: '50%', left: '15%' },
      { top: '50%', left: '75%' },
      { top: '80%', left: '15%' },
      { top: '80%', left: '50%' },
      { top: '80%', left: '75%' },
      { top: '35%', left: '45%' },
    ];
    for (let i = 0; i < 8; i++) {
      const xBtn = document.createElement('button');
      xBtn.className = 'ad-x-btn';
      xBtn.style.top = positions[i].top;
      xBtn.style.left = positions[i].left;
      xBtn.textContent = '✕';
      if (i === mlAdState.ad2TrueIndex) {
        xBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          mlAdState.phase = 3;
          mlAdState.ad3Clicks = 0;
          mlAdState.ad3XPos = { top: '50%', left: '50%' };
          renderMLAd();
        });
      } else {
        xBtn.classList.add('fake-x');
        xBtn.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
      container.appendChild(xBtn);
    }
  } else if (mlAdState.phase === 3) {
    container.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    container.innerHTML = `
      <div style="color:#fff;text-align:center;padding:20px;">
        <h2 style="font-size:1.4rem;margin-bottom:12px;">¡ÚLTIMA OPORTUNIDAD!</h2>
        <p style="font-size:0.9rem;opacity:0.8;">No te pierdas estas ofertas</p>
      </div>
      <button class="ad-x-btn small-x" id="mlAd3X" style="top:${mlAdState.ad3XPos.top};left:${mlAdState.ad3XPos.left};">✕</button>
    `;
      const xBtn = document.getElementById('mlAd3X');
      if (xBtn) {
        xBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          mlAdState.ad3Clicks++;
          if (mlAdState.ad3Clicks >= mlAdState.ad3MaxClicks) {
            installedApps.mercadolibre = true;
            updatePhoneHomeApps();
            mlAdState.adsCompleted = true;
            mlAdState.phase = 4;
            openMLProducts();
          } else {
            mlAdState.ad3XPos = {
              top: (10 + Math.random() * 75) + '%',
              left: (10 + Math.random() * 75) + '%',
            };
            renderMLAd();
          }
        });
      }
  }
}

function startClaraBirthdayMission() {
  setMission('claraGift', 'Regalo de Clara', 'Averiguá qué le gustaría de regalo a tu nieta Clara.');
  addMessageToConversation('camilo', 'incoming', `Hola mamá. ¿Cómo dormiste? 😊<br><br>Te escribo porque en 5 días es el cumpleaños de <strong>Clara</strong> 🎂 y quería recordarte que estás invitada a la casa para el festejo. ¿Ya sabés qué le regalarías?`);
}

function startClaraBirthdayFlow() {
  const replyBox = ui.phoneChatReplyBox;
  if (!replyBox) return;

  replyBox.classList.remove('is-hidden');
  replyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-clara-reply="true">Responder</button>`;
}

function openClaraChat() {
  openContactChat('clara');

  setTimeout(() => {
    addMessageToConversation('clara', 'outgoing', `Hola Clara, ¿cómo estás? Tu papá me dijo que tu cumpleaños se acerca y quería saber qué te gustaría de regalo.`);

    setTimeout(() => {
      addMessageToConversation('clara', 'incoming', `Hola abuela! 😊 Estoy re contenta. Sí, falta poquito. Me encantaría una <strong>Barbie futbolista edición mundial 2026</strong> ⚽💖`);

      setTimeout(() => {
        addMessageToConversation('clara', 'outgoing', `Qué lindo, mi amor. Voy a ver si la consigo. Te quiero mucho. ❤️`);

        setTimeout(() => {
          // Switch back to Camilo chat to receive the next instructions
          addMessageToConversation('camilo', 'incoming', `Genial, mamá. Para comprar online podés usar <strong>MercadoLibre</strong>. Es como un shopping pero en el celular.<br><br>Primero tenés que ir a la <strong>Play Store</strong> y buscar "MercadoLibre". Le das a <strong>Instalar</strong> y esperás un ratito.<br><br>Cualquier cosa me llamás y te ayudo! ❤️`);

          // Complete the claraGift mission and start the download mission
          if (missionsState.currentMissionId === 'claraGift' && !missionsState.completed) {
            completeMission('claraGift');
          }

          setTimeout(() => {
            startDownloadMercadoLibreMission();
          }, 1500);
        }, 1500);
      }, 1200);
    }, 1800);
  }, 800);
}

function startDownloadMercadoLibreMission() {
  setMission('downloadMercadoLibre', 'Descargar MercadoLibre', 'Entrá a la Play Store y descargá la app oficial de MercadoLibre.');

  installedApps.playstore = true;
  updatePhoneHomeApps();

  // Go back to Camilo chat and show button to open PlayStore
  openContactChat('camilo');

  if (ui.phoneChatReplyBox) {
    ui.phoneChatReplyBox.classList.remove('is-hidden');
    ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-open-playstore="true">Abrir Play Store</button>`;
  }
}

function renderFakeMLProducts() {
  const list = ui.fakemlProducts;
  if (!list) return;
  list.innerHTML = '';

  fakeMLProducts.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'fakeml-product-card';
    card.innerHTML = `
      <div class="fakeml-product-img" style="background:${product.gradient};"></div>
      <div class="fakeml-product-info">
        <span class="fakeml-product-price">$${product.price.toLocaleString('es-AR')}</span>
        <span class="fakeml-product-title">${product.title}</span>
        <span class="fakeml-product-shipping">Envío gratis hoy</span>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (product.id === 'barbie') {
        openFakeMLCheckout();
      } else {
        showToast('Esta funcionalidad no está disponible');
      }
    });
    list.appendChild(card);
  });
}

function openFakeMLProducts() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  renderFakeMLProducts();
  switchPhoneView('phoneFakeMLView');
}

function openFakeMLCheckout() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  // Clear previous card data
  if (ui.fakemlCardNumber) ui.fakemlCardNumber.value = '';
  if (ui.fakemlCardName) ui.fakemlCardName.value = '';
  if (ui.fakemlCardExp) ui.fakemlCardExp.value = '';
  if (ui.fakemlCardCvv) ui.fakemlCardCvv.value = '';
  if (ui.fakemlLoadCardBtn) {
    ui.fakemlLoadCardBtn.disabled = false;
    ui.fakemlLoadCardBtn.style.opacity = '1';
  }
  if (ui.fakemlConfirmBtn) {
    ui.fakemlConfirmBtn.disabled = true;
    ui.fakemlConfirmBtn.style.opacity = '0.5';
  }
  switchPhoneView('phoneFakeMLCheckoutView');
}

function loadFakeCardData() {
  if (ui.fakemlCardNumber) ui.fakemlCardNumber.value = '4509 9535 6623 4188';
  if (ui.fakemlCardName) ui.fakemlCardName.value = 'MARTA GOMEZ';
  if (ui.fakemlCardExp) ui.fakemlCardExp.value = '08/29';
  if (ui.fakemlCardCvv) ui.fakemlCardCvv.value = '324';
  if (ui.fakemlLoadCardBtn) {
    ui.fakemlLoadCardBtn.disabled = true;
    ui.fakemlLoadCardBtn.style.opacity = '0.5';
    ui.fakemlLoadCardBtn.textContent = 'Datos cargados';
  }
  if (ui.fakemlConfirmBtn) {
    ui.fakemlConfirmBtn.disabled = false;
    ui.fakemlConfirmBtn.style.opacity = '1';
  }
}

function renderMLProducts() {
  const list = ui.mlProducts;
  if (!list) return;
  list.innerHTML = '';

  mlProducts.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'fakeml-product-card';
    card.innerHTML = `
      <div class="fakeml-product-img" style="background:${product.gradient};"></div>
      <div class="fakeml-product-info">
        <span class="fakeml-product-price">$${product.price.toLocaleString('es-AR')}</span>
        <span class="fakeml-product-title">${product.title}</span>
        <span class="fakeml-product-shipping">Envío gratis hoy</span>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (product.id === 'barbie') {
        openMLCheckout();
      } else {
        showToast('Esta funcionalidad no está disponible');
      }
    });
    list.appendChild(card);
  });
}

function openMLProducts() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  renderMLProducts();
  switchPhoneView('phoneMLProductsView');
}

function openMLCheckout() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  if (ui.mlCardNumber) ui.mlCardNumber.value = '';
  if (ui.mlCardName) ui.mlCardName.value = '';
  if (ui.mlCardExp) ui.mlCardExp.value = '';
  if (ui.mlCardCvv) ui.mlCardCvv.value = '';
  if (ui.mlLoadCardBtn) {
    ui.mlLoadCardBtn.disabled = false;
    ui.mlLoadCardBtn.style.opacity = '1';
    ui.mlLoadCardBtn.textContent = 'Cargar datos de tarjeta';
  }
  if (ui.mlConfirmBtn) {
    ui.mlConfirmBtn.disabled = true;
    ui.mlConfirmBtn.style.opacity = '0.5';
    ui.mlConfirmBtn.textContent = 'Confirmar compra';
  }
  switchPhoneView('phoneMLCheckoutView');
}

function loadMLCardData() {
  if (ui.mlCardNumber) ui.mlCardNumber.value = '4509 9535 6623 4188';
  if (ui.mlCardName) ui.mlCardName.value = 'MARTA GOMEZ';
  if (ui.mlCardExp) ui.mlCardExp.value = '08/29';
  if (ui.mlCardCvv) ui.mlCardCvv.value = '324';
  if (ui.mlLoadCardBtn) {
    ui.mlLoadCardBtn.disabled = true;
    ui.mlLoadCardBtn.style.opacity = '0.5';
    ui.mlLoadCardBtn.textContent = 'Datos cargados';
  }
  if (ui.mlConfirmBtn) {
    ui.mlConfirmBtn.disabled = false;
    ui.mlConfirmBtn.style.opacity = '1';
  }
}

function confirmMLPurchase() {
  if (!ui.mlConfirmBtn || ui.mlConfirmBtn.disabled) return;
  ui.mlConfirmBtn.disabled = true;
  ui.mlConfirmBtn.style.opacity = '0.5';
  ui.mlConfirmBtn.textContent = 'Procesando...';
  if (ui.mlLoadCardBtn) {
    ui.mlLoadCardBtn.disabled = true;
    ui.mlLoadCardBtn.style.opacity = '0.5';
  }

  setTimeout(() => {
    if (ui.mlConfirmBtn) {
      ui.mlConfirmBtn.textContent = '✓ Pago confirmado';
    }
    setTimeout(() => {
      statsState.money = Math.max(0, statsState.money - 42999);
      updateStats(0);
      switchPhoneView('phoneMLSuccessView');
    }, 1000);
  }, 2000);
}

function completeMLPurchaseAndMission() {
  if (missionsState.currentMissionId === 'downloadMercadoLibre' && !missionsState.completed) {
    completeMission('downloadMercadoLibre');
  }
  addMessageToConversation('camilo', 'incoming', '¡Excelente, mamá! Ya compraste el regalo para Clara 🎁. Llegará mañana, así que estate atenta. ❤️');
  statsState.happiness = Math.min(100, statsState.happiness + 5);
  updateStats(0);
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');
}

function startFraudDrain() {
  fraudDrainState.active = true;
  fraudDrainState.startMoney = statsState.money;
  fraudDrainState.elapsed = 0;
  fraudDrainState.lastAlert = 0;
  if (ui.fraudOverlay) ui.fraudOverlay.classList.add('is-active');
  playAlertSound();
}

function updateFraudDrain(dt) {
  if (!fraudDrainState.active) return;
  fraudDrainState.elapsed += dt;
  const progress = Math.min(1, fraudDrainState.elapsed / fraudDrainState.duration);
  const newMoney = Math.max(0, Math.round(fraudDrainState.startMoney * (1 - progress)));
  statsState.money = newMoney;
  updateStats(0);

  if (fraudDrainState.elapsed - fraudDrainState.lastAlert > 0.6) {
    playAlertSound();
    fraudDrainState.lastAlert = fraudDrainState.elapsed;
  }

  if (statsState.money <= 0) {
    statsState.money = 0;
    fraudDrainState.active = false;
    triggerBadEndingAppFraud();
  }
}

function triggerBadEndingAppFraud() {
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');
  if (ui.gameOverModal) ui.gameOverModal.setAttribute('aria-hidden', 'false');
  statsState.calm = Math.max(0, statsState.calm - 30);
  updateStats(0);
}

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
      if (app === 'playstore') {
        renderPlayStore();
        switchPhoneView('phonePlayStoreView');
      }
      if (app === 'mercadolibre') {
        if (mlAdState.adsCompleted) {
          openMLProducts();
        } else {
          mlAdState.phase = 1;
          mlAdState.ad3Clicks = 0;
          renderMLAd();
          switchPhoneView('phoneMLAdView');
        }
      }
      if (app === 'mercad0libre') {
        openFakeMLProducts();
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
      }
    });
  });
}

if (ui.phoneHomeBar) {
  ui.phoneHomeBar.addEventListener('click', (e) => {
    e.stopPropagation();
    switchPhoneView('phoneHomeView');
  });
}

function openMLGifts() {
  switchPhoneView('phoneHomeView');
  setTimeout(() => {
    showDilemma(mlGiftsDilemma, () => {
      updateStats(0);
      switchPhoneView('phoneMLHomeView');
    });
  }, 300);
}

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

let fraudDrainState = {
  active: false,
  startMoney: 0,
  elapsed: 0,
  duration: 5,
  lastAlert: 0,
};

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

if (ui.phoneChatReplyBox) {
  ui.phoneChatReplyBox.addEventListener('click', (e) => {
    const btn = e.target.closest('#sendReplyBtn');
    if (!btn) return;
    e.stopPropagation();

    if (missionsState.currentMissionId === 'tutorial' && !missionsState.completed) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = 'Enviando...';

      showMartaReplyTutorial();

      setTimeout(() => {
        showCamiloBedMessage();
        if (missionsState.currentMissionId === 'tutorial' && !missionsState.completed) {
          completeMission('tutorial');
        }
      }, 1500);
      return;
    }

    if (missionsState.currentMissionId === 'claraGift' && !missionsState.completed) {
      if (btn.getAttribute('data-clara-reply') === 'true') {
        btn.disabled = true;
        btn.style.opacity = '0.5';

        addMessageToConversation('camilo', 'outgoing', `La verdad que no sé, hijo. ¿Vos tenés idea?`);

        setTimeout(() => {
          addMessageToConversation('camilo', 'incoming', `Yo tampoco sé 😅. ¿Por qué no le preguntas directamente a ella? Seguro te dice qué le gustaría. ❤️`);
          if (ui.phoneChatReplyBox) {
            ui.phoneChatReplyBox.classList.remove('is-hidden');
            ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-clara-accept="true">Escribirle a Clara</button>`;
          }
        }, 1200);
        return;
      }

      if (btn.getAttribute('data-clara-accept') === 'true') {
        openClaraChat();
        return;
      }
    }

    if (missionsState.currentMissionId === 'downloadMercadoLibre' && !missionsState.completed) {
      if (btn.getAttribute('data-open-playstore') === 'true') {
        renderPlayStore();
        switchPhoneView('phonePlayStoreView');
        if (ui.phoneChatReplyBox) {
          ui.phoneChatReplyBox.classList.add('is-hidden');
        }
        return;
      }
    }
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
  if (!visualFatigueDisabled) {
    if (phoneState.active) {
      statsState.fatigue += dt;
      statsState.fatigue = Math.min(60, statsState.fatigue);
    } else {
      statsState.fatigue -= dt * 2;
      statsState.fatigue = Math.max(0, statsState.fatigue);
    }
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

  const t = visualFatigueDisabled ? 0 : statsState.fatigue / 60;
  const blurFactor = t * t * 10;
  const filterVal = blurFactor > 0.05 ? `blur(${blurFactor.toFixed(2)}px)` : 'none';
  if (ui.experienceCanvas) ui.experienceCanvas.style.filter = filterVal;
  if (ui.phoneUI) ui.phoneUI.style.filter = filterVal;
}

function animate() {
  const dt = clock.getDelta();
  updateFirstPerson(dt);
  updateDoors(dt);
  updateBedPrompt(dt);
  updateDayTransition(dt);
  updatePhonePrompt(dt);
  updatePhoneAnimation(dt);
  updateStats(dt);
  updateMissions(dt);
  updateCinematic(dt);
  updateFraudDrain(dt);

  // Actualizar mezcladores de animación esquelética
  if (martaMixer) {
    martaMixer.update(dt);
  }
  if (sonMixer) {
    sonMixer.update(dt);
  }

  // Sincronizar visibilidad y animar a Marta en 3D importada
  if (martaLoadedModel) {
    // Si martaModel es visible (ej. escena inicial de la intro), forzamos la visibilidad del modelo importado.
    // Si martaModel NO es visible, ocultamos el modelo importado en el gameplay o durante el intro.
    // Si hay otra cinemática activa (ej. la del hijo), respetamos su visibilidad manual ya asignada en esa secuencia.
    if (martaModel.visible) {
      martaLoadedModel.visible = true;
    } else {
      if (!cinematicState.active || (cinematicState.sequence && cinematicState.sequence === introSequence)) {
        martaLoadedModel.visible = false;
      }
    }

    const elapsed = clock.getElapsedTime();

    // Animación procedimental en caso de ser modelo estático
    if (martaLoadedModel.userData && martaLoadedModel.userData.proceduralIdle) {
      const s = martaLoadedModel.userData.scaleFactor || 1.0;
      // Respiración muy suave multiplicando por la escala base original para evitar deformar al personaje
      martaLoadedModel.scale.y = s * (1.0 + Math.sin(elapsed * 1.6) * 0.012);
      martaLoadedModel.scale.x = s * (1.0 + Math.cos(elapsed * 1.6) * 0.004);
      martaLoadedModel.scale.z = s * (1.0 + Math.cos(elapsed * 1.6) * 0.004);
      
      // Cabeceo ligero
      martaLoadedModel.rotation.x = Math.sin(elapsed * 0.8) * 0.012;
    }

    // Parpadeo procedimental (blink) continuo para Marta - funciona con o sin animación corporal esquelética
    if (martaLoadedModel.userData && martaLoadedModel.userData.eyes && martaLoadedModel.userData.eyes.length > 0) {
      const isBlinking = (Math.floor(elapsed) % 4 === 0) && (elapsed % 1 < 0.12);
      martaLoadedModel.userData.eyes.forEach((eye) => {
        eye.scale.y = isBlinking ? 0.05 : 1.0;
      });
    }
  }

  renderer.render(scene, camera);

  const dayOverlay = document.getElementById('dayTransitionOverlay');
  if (dayOverlay) {
    const opacity = getDayTransitionOpacity();
    dayOverlay.style.opacity = opacity;
    dayOverlay.setAttribute('aria-hidden', opacity < 0.01 ? 'true' : 'false');
  }

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

if (ui.fakemlLoadCardBtn) {
  ui.fakemlLoadCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadFakeCardData();
  });
}

if (ui.fakemlConfirmBtn) {
  ui.fakemlConfirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.fakemlConfirmBtn.disabled) return;
    ui.fakemlConfirmBtn.disabled = true;
    ui.fakemlConfirmBtn.style.opacity = '0.5';
    ui.fakemlConfirmBtn.textContent = 'Procesando...';
    startFraudDrain();
  });
}

if (ui.mlLoadCardBtn) {
  ui.mlLoadCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadMLCardData();
  });
}

if (ui.mlConfirmBtn) {
  ui.mlConfirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmMLPurchase();
  });
}

if (ui.mlSuccessBtn) {
  ui.mlSuccessBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    completeMLPurchaseAndMission();
  });
}

if (ui.btnRewindGameOver) {
  ui.btnRewindGameOver.addEventListener('click', (e) => {
    e.stopPropagation();
    restartCurrentDay();
  });
}

document.addEventListener('click', (e) => {
  if (missionsState.currentMissionId === 'tutorial' && !missionsState.completed) {
    if (e.target && e.target.matches('[data-tutorial-accept="true"]')) {
      e.stopPropagation();
      completeMission('tutorial');
      switchPhoneView('phoneHomeView');
    }
  }
});

if (ui.daysBlockedModal) {
  const btnAccept = document.getElementById('btnAcceptBlocked');
  if (btnAccept) {
    btnAccept.addEventListener('click', (e) => {
      e.stopPropagation();
      hideDaysBlockedModal();
    });
  }
}

if (ui.settingFatigue) {
  ui.settingFatigue.addEventListener('change', (e) => {
    e.stopPropagation();
    visualFatigueDisabled = ui.settingFatigue.checked;
    if (visualFatigueDisabled) {
      statsState.fatigue = 0;
    }
    updateStats(0);
  });
}

const playstoreSearchInput = document.getElementById('playstoreSearchInput');
if (playstoreSearchInput) {
  playstoreSearchInput.addEventListener('input', (e) => {
    e.stopPropagation();
    renderPlayStore(e.target.value);
  });
}

// Start the render loop (scene renders behind intro overlay)
animate();
