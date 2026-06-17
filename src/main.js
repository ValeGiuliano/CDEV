import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createIcons, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, DollarSign, Smile, Wind, Eye } from 'lucide';
import { ui } from './utils/dom.js';
import { showToast } from './utils/helpers.js';
import {
  gameState,
  moveState,
  player,
  phoneState,
  mlAdState,
  statsState,
  missionsState,
  conversations,
  installedApps,
  playstoreApps,
  fraudDrainState,
  cinematicState,
  dayTransitionState,
  setVisualFatigueDisabled,
  setCurrentContact,
  setDayRestarted,
  dayRestarted,
  currentContact,
  visualFatigueDisabled,
  doorState,
  day3Scammed,
  day4State,
  day4InitialMoney,
  casinoState,
  uberState,
} from './state/index.js';

void dayRestarted;
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

import { mlProducts, marketplaceProducts } from './data/products.js';
const fakeMLProducts = mlProducts;
import { camiloDialogues, claraDialogues } from './data/chats/index.js';
import { playDoorbellSound, playNotificationSound, playAlertSound, playCinematicSound, playCasinoAmbientSound, playCasinoSpinSound, playCasinoWinSound, playCasinoLoseSound } from './audio/sounds.js';
import { canvas, renderer, scene, camera, clock, lookEuler, initResizeListener, setTimeOfDay, updateTimeOfDay } from './core/renderer.js';
import { phoneScreenCorners } from './core/phone3d.js';
import { initPlayer, updateFirstPerson, updateLook, setLookFromEuler, clampPlayerToBounds, isDoorKey, getMoveDirection } from './gameplay/player.js';
import { initDoors, handleDoorKey, updateDoors } from './gameplay/doors.js';
import { initBed, handleSleepKey, updateBedPrompt, showCamiloBedMessage } from './gameplay/bed.js';
import { initDayCycle, updateDayTransition, getDayTransitionOpacity, hideDaysBlockedModal, startDay2, startDay4, sleepToNextDay as sleepToNextDayFn } from './gameplay/dayCycle.js';
import { initMissions, setMission, completeMission, updateMissions, addTutorialMessage, showMartaReplyTutorial, startClaraBirthdayMission, startClaraBirthdayFlow, triggerClaraGiftDialogue, startDownloadMercadoLibreMission, startDay4BuyMission, startDownloadMarketplaceMission, startBuyMarketplaceMission, startUberMission } from './gameplay/missions.js';
import { initUberMaze, openUberApp, updateUberMaze, setMazeInput, isUberMazeRunning, attachUberListeners, resetUberMaze } from './gameplay/uberMaze.js';
import { initUberMapPin, startUberMapPin, resetUberMapPin, updateUberMapPin, isUberMapPinActive, setMapPinInput } from './gameplay/uberMapPin.js';
import { calculateScoreDetails, loadLeaderboard, saveScore, renderScoreBreakdown, renderLeaderboardTable, downloadLeaderboard } from './gameplay/leaderboard.js';
import { initTraffic, updateTraffic, spawnParkedUber } from './gameplay/traffic.js';
import {
  initPhone,
  updatePhonePrompt,
  updatePhoneAnimation,
  updatePhoneUISize,
  switchPhoneView,
  updatePhoneHomeApps,
  renderContactList,
  openContactChat,
  addMessageToConversation,
  togglePhone,
} from './phone/index.js';
import { initKeyboard, showKeyboard } from './phone/keyboard.js';
import { initCinematicEngine, startCinematic, advanceCinematicStep, endCinematic, updateCinematic } from './cinematics/engine.js';
const gltfLoader = new GLTFLoader();
let martaMixer = null;
let martaLoadedModel = null;
let sonMixer = null;
let sonLoadedModel = null;

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

document.body.tabIndex = 0;
document.body.focus();
canvas.tabIndex = 0;

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

// --- CARGA ASÍNCRONA DEL REPARTIDOR (CON FALLBACK PROCEDURAL) ---
let repartidorModel = null;
let repartidorMixer = null;
let repartidorActiveMesh = null;
let repartidorReady = false;

gltfLoader.load(
  '/repartidor.glb',
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) child.material.side = THREE.DoubleSide;
      }
    });
    repartidorModel = model;
    room.add(model);
    model.visible = false;
    model.updateMatrixWorld(true);

    if (gltf.animations && gltf.animations.length > 0) {
      repartidorMixer = new THREE.AnimationMixer(model);
      model.userData.animations = gltf.animations;
      console.log("Repartidor: animaciones disponibles:", gltf.animations.map(a => a.name));
    } else {
      model.userData.proceduralIdle = true;
    }

    const box = new THREE.Box3();
    let hasMeshes = false;
    model.traverse((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld(true);
        box.expandByObject(child);
        hasMeshes = true;
      }
    });
    if (!hasMeshes) box.setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;

    const targetHeight = 1.7;
    let scale = targetHeight / Math.max(size.y, 0.001);

    if (scale < 0.5 || scale > 3) {
      console.warn(`Repartidor GLB con escala anómala (size.y=${size.y}, scale=${scale}). Se forzará escala 1.0.`);
      scale = 1.0;
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.position.y -= min.y;
    }

    model.userData.scaleFactor = scale;
    model.userData.baseOffset = min.y * scale;
    model.userData.centerX = (box.min.x + box.max.x) / 2;
    model.userData.centerZ = (box.min.z + box.max.z) / 2;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    repartidorReady = true;
    console.log("Repartidor listo. Escala:", scale, "size.y:", size.y);
  },
  undefined,
  (error) => {
    console.warn("No se encontró o no se pudo cargar repartidor.glb. Usando fallback procedural.", error);
    repartidorReady = true;
  }
);

// --- CARGA ASÍNCRONA DEL LADRÓN (CON FALLBACK PROCEDURAL) ---
let ladronModel = null;
let ladronMixer = null;
let ladronReady = false;

gltfLoader.load(
  '/ladron.glb',
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) child.material.side = THREE.DoubleSide;
      }
    });
    ladronModel = model;
    room.add(model);
    model.visible = false;
    model.updateMatrixWorld(true);

    if (gltf.animations && gltf.animations.length > 0) {
      ladronMixer = new THREE.AnimationMixer(model);
      model.userData.animations = gltf.animations;
      console.log("Ladrón: animaciones disponibles:", gltf.animations.map(a => a.name));
    } else {
      model.userData.proceduralIdle = true;
    }

    const box = new THREE.Box3();
    let hasMeshes = false;
    model.traverse((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld(true);
        box.expandByObject(child);
        hasMeshes = true;
      }
    });
    if (!hasMeshes) box.setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;

    const targetHeight = 1.75;
    let scale = targetHeight / Math.max(size.y, 0.001);

    if (scale < 0.5 || scale > 3) {
      console.warn(`Ladrón GLB con escala anómala (size.y=${size.y}, scale=${scale}). Se forzará escala 1.0.`);
      scale = 1.0;
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.position.y -= min.y;
    }

    model.userData.scaleFactor = scale;
    model.userData.baseOffset = min.y * scale;
    model.userData.centerX = (box.min.x + box.max.x) / 2;
    model.userData.centerZ = (box.min.z + box.max.z) / 2;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    ladronReady = true;
    console.log("Ladrón listo. Escala:", scale, "size.y:", size.y);
  },
  undefined,
  (error) => {
    console.warn("No se encontró o no se pudo cargar ladron.glb. Usando fallback procedural.", error);
    ladronReady = true;
  }
);

// Placeholders procedurales para los personajes
const repartidorPlaceholder = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.9, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1e88e5, emissive: 0x1e88e5, emissiveIntensity: 0.4, roughness: 0.6 })
  );
  body.position.y = 0.55;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffdbac, emissive: 0xffdbac, emissiveIntensity: 0.2, roughness: 0.6 })
  );
  head.position.y = 1.15;
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.6, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1e88e5, emissive: 0x1e88e5, emissiveIntensity: 0.4, roughness: 0.6 })
  );
  armL.position.set(-0.35, 0.7, 0);
  const armR = armL.clone();
  armR.position.x = 0.35;
  const package_ = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xc68642, emissive: 0xc68642, emissiveIntensity: 0.3, roughness: 0.8 })
  );
  package_.position.set(0.4, 0.85, 0.15);
  repartidorPlaceholder.add(body, head, armL, armR, package_);
  repartidorPlaceholder.visible = false;
  room.add(repartidorPlaceholder);
}

const ladronPlaceholder = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.95, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x550000, emissiveIntensity: 0.3, roughness: 0.7 })
  );
  body.position.y = 0.58;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xb3826b, emissive: 0xb3826b, emissiveIntensity: 0.2, roughness: 0.6 })
  );
  head.position.y = 1.2;
  const mask = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.1, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.7 })
  );
  mask.position.set(0, 1.18, 0.15);
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.6, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x550000, emissiveIntensity: 0.3, roughness: 0.7 })
  );
  armL.position.set(-0.35, 0.72, 0);
  const armR = armL.clone();
  armR.position.x = 0.35;
  ladronPlaceholder.add(body, head, mask, armL, armR);
  ladronPlaceholder.visible = false;
  room.add(ladronPlaceholder);
}

// Esfera de debug: confirma que la posición de la cinemática es correcta
const debugMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
debugMarker.position.set(0.72, 1, -7.5);
debugMarker.visible = false;
room.add(debugMarker);

function hideDay4Characters() {
  if (repartidorModel) repartidorModel.visible = false;
  if (repartidorPlaceholder.parent === room) repartidorPlaceholder.visible = false;
  if (ladronPlaceholder.parent === room) ladronPlaceholder.visible = false;
  if (ladronModel && ladronModel.userData.clone1) ladronModel.userData.clone1.visible = false;
  if (ladronModel && ladronModel.userData.clone2) ladronModel.userData.clone2.visible = false;
  repartidorPlaceholder.visible = false;
  ladronPlaceholder.visible = false;
  if (repartidorActiveMesh) repartidorActiveMesh.visible = false;
  debugMarker.visible = false;
  repartidorActiveMesh = null;
}

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
doorState.living.group = livingDoorGroup;
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
tablePhoneGroup.position.set(0.35, 0.569, 0.28);
tablePhoneGroup.rotation.set(0, -0.25, 0);
tablePhoneGroup.scale.set(2 / 3, 2 / 3, 2 / 3);
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
bedGroup.rotation.y = Math.PI;
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

// --- DAY 3 WAKE-UP SEQUENCE ---
const day3WakeUpSequence = [
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
    duration: 4.0,
    autoAdvance: true,
    dialogue: { speaker: '', text: 'Marta abre los ojos. Aunque está preocupada por su tarjeta, el sol de la mañana le trae tranquilidad.' },
    sound: { freq: 320, type: 'sine', duration: 0.4 },
    onStart: () => {
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = '0.3';
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

// --- DAY 4 WAKE-UP SEQUENCE ---
const day4WakeUpSequence = [
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
    dialogue: { speaker: '', text: 'Hoy tengo que conseguirle la muñeca a Clara. ¡Manos a la obra!' },
    sound: { freq: 320, type: 'sine', duration: 0.4 },
    onStart: () => {
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = '0.3';
      }
    },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = String(0.3 * (1 - ease));
      }
      const startTarget = new THREE.Vector3(4.2, 2.5, 3.45);
      const endTarget = new THREE.Vector3(4.2, 1.4, 0);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, ease);
      camera.lookAt(currentTarget);
      camera.position.y = THREE.MathUtils.lerp(0.78, 0.82, ease);
    }
  }
];

// --- DAY 5 WAKE-UP SEQUENCE ---
const day5WakeUpSequence = [
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
    dialogue: { speaker: '', text: '¡Hoy es el cumpleaños de Clara! Tengo que llegar a la fiesta.' },
    sound: { freq: 320, type: 'sine', duration: 0.4 },
    onStart: () => {
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = '0.3';
      }
    },
    action: (progress) => {
      const ease = progress * progress * (3 - 2 * progress);
      if (ui.dayTransitionOverlay) {
        ui.dayTransitionOverlay.style.opacity = String(0.3 * (1 - ease));
      }
      const startTarget = new THREE.Vector3(4.2, 2.5, 3.45);
      const endTarget = new THREE.Vector3(4.2, 1.4, 0);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, ease);
      camera.lookAt(currentTarget);
      camera.position.y = THREE.MathUtils.lerp(0.78, 0.82, ease);
    }
  }
];

// --- DAY 4: SECUENCIA DE ENTREGA (COMPRA REAL) ---
const deliverySequence = [
  {
    duration: 2.5,
    autoAdvance: true,
    dialogue: { speaker: 'Repartidor', text: '¡Buenas! Vengo de Marketplace con su pedido.' },
    sound: { freq: 520, type: 'triangle', duration: 0.25 },
    onStart: () => {
      console.log('deliverySequence start', {
        repartidorModel: !!repartidorModel,
        repartidorReady,
        repartidorActiveMesh: !!repartidorActiveMesh
      });

      if (repartidorModel && repartidorReady) {
        repartidorModel.visible = true;
        repartidorModel.position.set(0.72, 0, -7.5);
        repartidorModel.rotation.set(0, 0, 0);
        repartidorActiveMesh = repartidorModel;
        console.log('Usando modelo GLB del repartidor');
      } else {
        console.warn('Modelo de repartidor no disponible; no se muestra personaje');
        repartidorActiveMesh = null;
      }
      camera.position.set(2.2, 1.45, -5.2);
      camera.lookAt(0.72, 1.25, -6.5);
    },
    action: (progress) => {
      const z = THREE.MathUtils.lerp(-7.5, -5.6, progress);
      if (repartidorActiveMesh === repartidorModel) {
        repartidorModel.position.z = z;
      } else if (repartidorActiveMesh === repartidorPlaceholder) {
        repartidorPlaceholder.position.z = z;
      }
      camera.position.x = THREE.MathUtils.lerp(2.2, 1.9, progress);
      camera.lookAt(0.72, 1.25, -5.8);
    }
  },
  {
    duration: 2.0,
    autoAdvance: true,
    dialogue: { speaker: 'Marta', text: '¡Ay, gracias hijo! Pasó rápido.' },
    onStart: () => {},
    action: (progress) => {
      camera.position.x = THREE.MathUtils.lerp(1.9, 1.85, progress);
      camera.lookAt(0.72, 1.25, -5.8);
    }
  },
  {
    duration: 2.0,
    autoAdvance: true,
    dialogue: { speaker: 'Repartidor', text: 'Que tenga un buen día. ¡Saludos!' },
    onStart: () => {},
    action: (progress) => {
      const z = THREE.MathUtils.lerp(-5.6, -8.5, progress);
      if (repartidorActiveMesh === repartidorModel) {
        repartidorModel.position.z = z;
      } else if (repartidorActiveMesh === repartidorPlaceholder) {
        repartidorPlaceholder.position.z = z;
      }
      camera.position.x = THREE.MathUtils.lerp(1.85, 1.75, progress);
      camera.lookAt(0.72, 1.25, -6.0);
    }
  }
];

// --- DAY 4: SECUENCIA DE ASALTO (COMPRA ESTAFA) ---
const assaultSequence = [
  {
    duration: 1.8,
    autoAdvance: true,
    dialogue: { speaker: 'Ladrón', text: '¡Hola, buenas! ¿Marta?' },
    sound: { freq: 200, type: 'sawtooth', duration: 0.4 },
    onStart: () => {
      console.log('assaultSequence start', {
        ladronModel: !!ladronModel,
        ladronReady
      });

      if (ladronModel && ladronReady) {
        ladronModel.visible = true;
        const offset = ladronModel.userData.baseOffset || 0;
        ladronModel.position.set(0.72, offset, -7.5);
        ladronModel.rotation.set(0, 0, 0);
        repartidorActiveMesh = ladronModel;
        console.log('Usando modelo GLB del ladrón');
      } else {
        ladronPlaceholder.visible = true;
        ladronPlaceholder.position.set(0.72, 0, -7.5);
        ladronPlaceholder.rotation.set(0, 0, 0);
        repartidorActiveMesh = ladronPlaceholder;
        console.log('Usando placeholder del ladrón');
      }
      camera.position.set(2.2, 1.45, -5.2);
      camera.lookAt(0.72, 1.25, -6.5);
    },
    action: (progress) => {
      const z = THREE.MathUtils.lerp(-7.5, -6.5, progress);
      if (repartidorActiveMesh === ladronModel) {
        const offset = ladronModel.userData.baseOffset || 0;
        ladronModel.position.set(0.72, offset, z);
      } else if (repartidorActiveMesh === ladronPlaceholder) {
        ladronPlaceholder.position.z = z;
      }
      camera.position.x = THREE.MathUtils.lerp(2.2, 1.9, progress);
      camera.lookAt(0.72, 1.25, -6.0);
    }
  },
  {
    duration: 1.5,
    autoAdvance: true,
    dialogue: { speaker: 'Marta', text: '¿Sí? ¿Quién es?' },
    action: (progress) => {
      camera.position.x = THREE.MathUtils.lerp(1.9, 1.7, progress);
      camera.position.z = THREE.MathUtils.lerp(-5.2, -5.5, progress);
      camera.lookAt(0.72, 1.25, -6.0);
    }
  },
  {
    duration: 2.0,
    autoAdvance: true,
    dialogue: { speaker: 'Ladrón', text: '¡ENTREGATE!' },
    sound: { freq: 100, type: 'sawtooth', duration: 0.6 },
    onStart: () => {
      if (ladronModel) {
        ladronModel.visible = true;
        const offset = ladronModel.userData.baseOffset || 0;
        ladronModel.position.set(0.72, offset, -5.8);
        ladronModel.rotation.set(0, 0, 0);
      } else {
        ladronPlaceholder.visible = true;
        ladronPlaceholder.position.set(0.72, 0, -5.8);
        ladronPlaceholder.rotation.set(0, 0, 0);
      }
    },
    action: (progress) => {
      const shake = (Math.sin(progress * Math.PI * 20)) * 0.15;
      camera.position.set(1.5 + shake, 1.2 - progress * 0.4, -5.5);
      camera.lookAt(0.72, 1.1, -5.6);
    }
  }
];

function startDay4Delivery() {
  hideDay4Characters();
  if (ui.damageOverlay) {
    ui.damageOverlay.classList.remove('is-active');
    void ui.damageOverlay.offsetWidth;
    ui.damageOverlay.classList.add('is-active');
  }
  if (day4State.purchasedProduct && day4State.purchasedProduct.isScam) {
    startCinematic(assaultSequence, () => {
      day4State.deliveryResolved = true;
      day4State.awaitingDelivery = false;
      if (ui.postAssaultScamModal) {
        ui.postAssaultScamModal.setAttribute('aria-hidden', 'false');
      }
    });
  } else {
    startCinematic(deliverySequence, () => {
      day4State.deliveryResolved = true;
      day4State.awaitingDelivery = false;
      hideDay4Characters();
      if (missionsState.currentMissionId === 'attendDelivery' && !missionsState.completed) {
        completeMission('attendDelivery');
      }
      setTimeout(() => {
        setMission('goToSleep', 'Ir a dormir', '¡Recibiste el regalo! Ahora descansá.');
        setTimeOfDay('noche', 5.0);
      }, 1500);
    });
  }
}

// --- DAY 4: APP CASINO SLOTS 8-BIT ---
const CASINO_SYMBOLS = ['🍒', '🍋', '🍇', '7️⃣', '💎', '🍀'];
let casinoReelInterval = null;

function openCasinoApp() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  updateCasinoUI();
  switchPhoneView('phoneCasinoView');
  playCasinoAmbientSound();
}

function updateCasinoUI() {
  if (ui.casinoBalance) ui.casinoBalance.textContent = statsState.money.toLocaleString('es-AR');
  if (ui.casinoBetAmount) ui.casinoBetAmount.textContent = casinoState.currentBet.toLocaleString('es-AR');
  if (ui.casinoSpinBtn) ui.casinoSpinBtn.disabled = casinoState.spinning;
  if (ui.casinoBetMinus) ui.casinoBetMinus.disabled = casinoState.spinning || casinoState.currentBet <= 5000;
  if (ui.casinoBetPlus) ui.casinoBetPlus.disabled = casinoState.spinning;
}

function changeCasinoBet(delta) {
  if (casinoState.spinning) return;
  const newBet = casinoState.currentBet + delta;
  if (newBet >= 5000) {
    casinoState.currentBet = newBet;
    updateCasinoUI();
  }
}

function spinCasino() {
  if (casinoState.spinning) return;
  if (statsState.money < casinoState.currentBet) {
    showToast('No tenés saldo suficiente');
    return;
  }

  casinoState.spinning = true;
  statsState.money = Math.max(0, statsState.money - casinoState.currentBet);
  updateStats(0);
  updateCasinoUI();

  if (ui.casinoMessage) ui.casinoMessage.textContent = 'Girando...';
  playCasinoSpinSound();

  const reels = [ui.casinoReel1, ui.casinoReel2, ui.casinoReel3];
  reels.forEach((r) => r && r.classList.add('spinning'));

  let spins = 0;
  if (casinoReelInterval) clearInterval(casinoReelInterval);
  casinoReelInterval = setInterval(() => {
    reels.forEach((r) => {
      if (r) r.textContent = CASINO_SYMBOLS[Math.floor(Math.random() * CASINO_SYMBOLS.length)];
    });
    spins++;
    if (spins >= 15) {
      clearInterval(casinoReelInterval);
      casinoReelInterval = null;
      finishCasinoSpin();
    }
  }, 100);
}

function finishCasinoSpin() {
  const won = Math.random() < 0.3;
  const reels = [ui.casinoReel1, ui.casinoReel2, ui.casinoReel3];
  reels.forEach((r) => r && r.classList.remove('spinning'));

  const pickSymbol = () => CASINO_SYMBOLS[Math.floor(Math.random() * CASINO_SYMBOLS.length)];
  const pickDifferent = (notSymbol) => {
    let s = pickSymbol();
    while (s === notSymbol) s = pickSymbol();
    return s;
  };

  if (won) {
    const matchSymbol = pickSymbol();
    reels.forEach((r) => { if (r) r.textContent = matchSymbol; });
    const winnings = casinoState.currentBet * 2;
    statsState.money = statsState.money + winnings;
    if (ui.casinoMessage) ui.casinoMessage.textContent = `¡Ganaste $${winnings.toLocaleString('es-AR')}!`;
    playCasinoWinSound();
  } else {
    const r1 = pickSymbol();
    let r2 = pickSymbol();
    let r3 = pickSymbol();
    if (r1 === r2 && r2 === r3) {
      r3 = pickDifferent(r1);
    }
    if (reels[0]) reels[0].textContent = r1;
    if (reels[1]) reels[1].textContent = r2;
    if (reels[2]) reels[2].textContent = r3;
    if (ui.casinoMessage) ui.casinoMessage.textContent = 'Perdiste. ¡Suerte la próxima!';
    playCasinoLoseSound();
  }

  updateStats(0);
  casinoState.spinning = false;
  updateCasinoUI();

  if (statsState.money <= 0) {
    casinoState.bankrupt = true;
    setTimeout(showCasinoBankruptModal, 1000);
  }
}

function showCasinoBankruptModal() {
  if (ui.casinoBankruptModal) {
    ui.casinoBankruptModal.setAttribute('aria-hidden', 'false');
  }
}

function restartCurrentDay() {
  // Close game over modal
  if (ui.gameOverModal) ui.gameOverModal.setAttribute('aria-hidden', 'true');
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');

  // Reset cinematic and transition state to avoid double wake-up animation
  cinematicState.active = false;
  cinematicState.onEnd = null;
  dayTransitionState.active = false;

  // Disable rewind button to prevent double click during restart
  if (ui.btnRewindGameOver) ui.btnRewindGameOver.disabled = true;

  // Reset stats to initial Day 2 values
  statsState.fatigue = 0;
  statsState.money = 100000;
  statsState.happiness = 80;
  statsState.calm = 75;
  phoneState.wifiEnabled = true;
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

  setTimeOfDay('dia', 0.0);

  // Position camera in bed and restart wake-up cinematic
  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  setTimeout(() => {
    startDay2();
  }, 400);
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

function handleMoveKey(event, active) {
  if (phoneState.active && (isUberMazeRunning() || isUberMapPinActive())) {
    if (active && (event.code === 'KeyT' || event.key === 't' || event.key === 'T')) {
      if (event.repeat) return;
      event.preventDefault();
      togglePhone();
      return;
    }
    const dir = getMoveDirection(event);
    if (dir) {
      event.preventDefault();
      const mazeDir = dir === 'forward' ? 'up' : dir === 'back' ? 'down' : dir;
      if (isUberMazeRunning()) {
        setMazeInput(mazeDir, active);
      } else {
        setMapPinInput(mazeDir, active);
      }
    }
    return;
  }
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
    togglePhone();
    return;
  }
  if (active && isDoorKey(event)) {
    if (event.repeat) return;
    event.preventDefault();
    if (handleDoorKey()) return;
    if (handleSleepKey()) return;
    return;
  }
  const key = getMoveDirection(event);
  if (!key) return;
  event.preventDefault();
  moveState[key] = active;
}

document.addEventListener('keydown', (event) => handleMoveKey(event, true), { capture: true });
document.addEventListener('keyup', (event) => handleMoveKey(event, false), { capture: true });

canvas.addEventListener('click', () => {
  if (phoneState.active) return;
  if (!document.pointerLockElement) {
    canvas.requestPointerLock();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (phoneState.active && phoneState.wakeTimer > 0.25) {
    updatePhoneUISize();
  }
});

clampPlayerToBounds();
setLookFromEuler();
initPlayer();

initCinematicEngine({
  camera,
  canvas,
  ui,
  playCinematicSound,
});

initDoors({
  doorPrompt: ui.doorPrompt,
  onOpenLivingDoor: () => {
    if (
      gameState.currentDay === 4 &&
      day4State.awaitingDelivery &&
      !day4State.deliveryResolved
    ) {
      startDay4Delivery();
      return;
    }
    if (
      missionsState.currentMissionId === 'openDoorUber' &&
      !missionsState.completed
    ) {
      startDay5EndCinematic();
      return;
    }
    startCinematic(cutsceneLiving, () => {
      tablePhoneGroup.visible = true;
      doorState.living.open = false;
      if (typeof sonMesh !== 'undefined') sonMesh.visible = false;
      if (typeof oldWomanMesh !== 'undefined') oldWomanMesh.visible = false;
      if (martaLoadedModel) martaLoadedModel.visible = false;
      if (typeof phoneProp !== 'undefined') phoneProp.visible = false;
      setTimeout(() => {
        completeMission('doorbell');
        setTimeout(() => {
          setMission('tutorial', 'Tutorial', 'Lee el mensaje de Camilo para aprender a jugar.');
        }, 1000);
      }, 1500);
    });
  },
});

initBed({
  bedPrompt: ui.bedPrompt,
  addMessage: addMessageToConversation,
  sleepToNextDay: sleepToNextDayFn,
});

initDayCycle({
  camera,
  lookEuler,
  canvas,
  startCinematic,
  day2WakeUpSequence,
  day3WakeUpSequence,
  day4WakeUpSequence,
  day5WakeUpSequence,
  setDayRestarted,
  playNotificationSound,
  startClaraBirthdayMission,
  switchPhoneView,
  renderContactList,
  openContactChat,
  startClaraBirthdayFlow,
  startUberMission,
});

initMissions({
  addMessage: addMessageToConversation,
  openContact: openContactChat,
  updateHome: updatePhoneHomeApps,
  playDoorbell: playDoorbellSound,
  playNotification: playNotificationSound,
  installedAppsRef: installedApps,
});

initPhone({
  tablePhoneGroup,
  heldPhoneGroup,
  camera,
  canvas,
  getUpdateStats: () => updateStats,
  callbacks: {
    onOpenPlaystoreApp: () => {
      renderPlayStore();
      switchPhoneView('phonePlayStoreView');
    },
    onOpenMercadoLibreApp: () => {
      if (mlAdState.adsCompleted) {
        openMLProducts();
      } else {
        mlAdState.phase = 1;
        mlAdState.ad3Clicks = 0;
        renderMLAd();
        switchPhoneView('phoneMLAdView');
      }
    },
    onOpenMercad0LibreApp: () => {
      openFakeMLProducts();
    },
    onOpenMarketplaceApp: () => {
      openMarketplaceProducts();
    },
    onOpenMarketpl4ceApp: () => {
      triggerMarketpl4ceHack();
    },
    onOpenCasinoApp: () => {
      openCasinoApp();
    },
    onOpenUberApp: () => {
      openUberApp();
    },
    onOpenBrowserApp: () => {
      resetBrowserApp();
      switchPhoneView('phoneBrowserView');
    },
    onSoporteBnaGiveData: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = 'Enviando...';

      addMessageToConversation('soporteBna', 'outgoing', 'Sí, claro. Los números son 4517 8829 0019 7254 y el código es 382.');
      if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

      setTimeout(() => {
        addMessageToConversation('soporteBna', 'incoming', 'Muchas gracias 😈');
        
        // Trigger day 3 money drain
        setTimeout(() => {
          startFraudDrainDay3();
        }, 1500);
      }, 1500);
    },
    onBancoNacionVerify: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = 'Verificando...';

      addMessageToConversation('bancoNacion', 'outgoing', 'El código es 8813');
      if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

      setTimeout(() => {
        addMessageToConversation(
          'bancoNacion',
          'incoming',
          'Código verificado con éxito. Tu tarjeta ha sido desbloqueada. Lamentamos las molestias, ya puedes volver a operar con normalidad.'
        );

        if (missionsState.currentMissionId === 'fixBankCard' && !missionsState.completed) {
          completeMission('fixBankCard');
        }

        setTimeout(() => {
          setMission('goToSleep', 'Ir a dormir', 'El problema del banco ya está solucionado. Ve a descansar.');
          setTimeOfDay('noche', 5.0);
        }, 2000);
      }, 1500);
    },
    onTutorialReply: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = 'Enviando...';

      showMartaReplyTutorial();

      setTimeout(() => {
        showCamiloBedMessage();
        if (missionsState.currentMissionId === 'tutorial' && !missionsState.completed) {
          completeMission('tutorial');
        }

        setTimeout(() => {
          setMission('goToSleep', 'Ir a dormir', 'Ve a la cama a descansar para empezar el siguiente día.');
          setTimeOfDay('noche', 5.0);
        }, 1000);
      }, 1500);
    },
    onTutorialAccept: (btn) => {
      switchPhoneView('phoneHomeView');
    },
    onClaraReply: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';

      addMessageToConversation('camilo', 'outgoing', `La verdad que no sé, hijo. ¿Vos tenés idea?`);

      setTimeout(() => {
        addMessageToConversation(
          'camilo',
          'incoming',
          `Yo tampoco sé 😅. ¿Por qué no le preguntas directamente a ella? Seguro te dice qué le gustaría. ❤️`
        );
        if (ui.phoneChatReplyBox) {
          ui.phoneChatReplyBox.classList.remove('is-hidden');
          ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-camilo-ok="true">Responder 'Ok'</button>`;
        }
      }, 1200);
    },
    onCamiloOk: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      addMessageToConversation('camilo', 'outgoing', `Ok`);
      if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

      if (missionsState.currentMissionId === 'readCamiloMessage' && !missionsState.completed) {
        completeMission('readCamiloMessage');
      }

      setTimeout(() => {
        setMission('claraGift', 'Regalo de Clara', 'Averiguá qué le gustaría de regalo a tu nieta Clara.');
      }, 1500);
    },
    onClaraHowTo: (btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      addMessageToConversation('clara', 'outgoing', `¡Qué lindo regalo, mi amor! Pero no sé dónde se compran esas cosas ahora. ¿Vos sabés dónde la puedo conseguir?`);

      setTimeout(() => {
        addMessageToConversation(
          'clara',
          'incoming',
          `¡Sí, abu! Seguro la conseguís en <strong>MercadoLibre</strong>. Es facilísimo, te descargás la aplicación y la comprás ahí. Cualquier cosa decile a papá que te ayude! ❤️`
        );
        if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

        if (missionsState.currentMissionId === 'claraGift' && !missionsState.completed) {
          completeMission('claraGift');
        }

        setTimeout(() => {
          startDownloadMercadoLibreMission();
        }, 1500);
      }, 1500);
    },
    onOpenContactChat: (contact) => {
      if (contact === 'clara') {
        if (missionsState.currentMissionId === 'claraGift' && conversations.clara.length === 0) {
          triggerClaraGiftDialogue();
        }
      }
    },
    onOpenPlaystoreFromReply: () => {
      renderPlayStore();
      switchPhoneView('phonePlayStoreView');
      if (ui.phoneChatReplyBox) {
        ui.phoneChatReplyBox.classList.add('is-hidden');
      }
    },
  },
});

initUberMaze({
  onExitPointerLock: () => {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  },
  onSwitchView: (viewId) => switchPhoneView(viewId),
  onMazeCompleted: (elapsed) => {
    startUberMapPin(elapsed);
  },
  onFail: () => {
    statsState.calm = Math.max(0, statsState.calm - 20);
    statsState.happiness = Math.max(0, statsState.happiness - 15);
    updateStats(0);
    if (ui.uberFailModal) {
      setTimeout(() => {
        ui.uberFailModal.setAttribute('aria-hidden', 'false');
      }, 600);
    }
  },
});

let parkedUberCar = null;

initUberMapPin({
  onWin: (score, elapsed) => {
    if (missionsState.currentMissionId === 'orderUber' && !missionsState.completed) {
      completeMission('orderUber');
    }
    
    // Store elapsed time
    uberState.elapsed = elapsed;
    
    // Update player stats
    const tempScoreDetails = calculateScoreDetails(elapsed);
    const scorePerformance = Math.min(100, Math.round(tempScoreDetails.totalScore / 70));
    statsState.happiness = Math.min(100, statsState.happiness + Math.round(scorePerformance / 4));
    statsState.calm = Math.min(100, statsState.calm + 12);
    updateStats(0);

    // Close the phone instead of showing modal immediately
    if (phoneState.active) togglePhone();
    
    // Spawn parked Uber car
    parkedUberCar = spawnParkedUber();
    
    // Set next mission to open the door
    setMission('openDoorUber', 'Tomar el Uber', 'El Uber ya llegó y te está esperando afuera. Abrí la puerta principal para subir.');
  },
  onFail: () => {
    statsState.calm = Math.max(0, statsState.calm - 20);
    statsState.happiness = Math.max(0, statsState.happiness - 15);
    updateStats(0);
    if (ui.uberFailModal) {
      setTimeout(() => {
        ui.uberFailModal.setAttribute('aria-hidden', 'false');
      }, 600);
    }
  },
});

attachUberListeners();

const skipBtn = document.getElementById('uberSkipMazeBtn') || ui.uberSkipMazeBtn;
if (skipBtn) {
  console.log('Registering click listener for uberSkipMazeBtn');
  skipBtn.addEventListener('click', (e) => {
    console.log('uberSkipMazeBtn clicked!');
    e.stopPropagation();
    resetUberMaze();
    uberState.startedAt = performance.now();
    uberState.attempts = 1;
    startUberMapPin(0);
  });
} else {
  console.error('uberSkipMazeBtn not found in DOM!');
}

if (ui.btnSaveUberScore) {
  ui.btnSaveUberScore.addEventListener('click', (e) => {
    e.stopPropagation();
    const nameInput = ui.uberPlayerName ? ui.uberPlayerName.value : 'Marta';
    const finalName = nameInput.trim() || 'Marta';
    
    if (lastScoreDetails) {
      const updatedBoard = saveScore(finalName, lastScoreDetails);
      
      // Hide submit form, show leaderboard rankings list
      if (ui.uberLeaderboardForm) {
        ui.uberLeaderboardForm.style.display = 'none';
      }
      if (ui.uberLeaderboardView) {
        ui.uberLeaderboardView.style.display = 'block';
      }
      
      // Render Table
      if (ui.uberLeaderboardBody) {
        renderLeaderboardTable(ui.uberLeaderboardBody, updatedBoard);
      }
    }
  });
}

if (ui.btnUberNarrationNext) {
  ui.btnUberNarrationNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.uberNarrationModal) {
      ui.uberNarrationModal.style.display = 'none';
      ui.uberNarrationModal.setAttribute('aria-hidden', 'true');
    }

    // Now calculate and show results modal (Success Modal with Leaderboard)
    lastScoreDetails = calculateScoreDetails(uberState.elapsed);
    if (ui.uberSuccessModal) {
      if (ui.uberScoreBreakdown) {
        renderScoreBreakdown(ui.uberScoreBreakdown, lastScoreDetails);
      }
      
      // Reset submit form visibility
      if (ui.uberLeaderboardForm) ui.uberLeaderboardForm.style.display = 'block';
      if (ui.uberLeaderboardView) {
        ui.uberLeaderboardView.style.display = 'none';
      }
      if (ui.uberPlayerName) {
        ui.uberPlayerName.value = 'Marta';
      }

      ui.uberSuccessModal.setAttribute('aria-hidden', 'false');
    }
  });
}

if (ui.btnUberDownloadBoard) {
  ui.btnUberDownloadBoard.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadLeaderboard();
  });
}

function getClaraReactionNarrative() {
  const product = day4State.purchasedProduct;
  if (!product || product.isScam) {
    return "Marta no pudo llegar con la muñeca Barbie Mundial soñada debido a las frustrantes estafas que sufrió en línea. En su lugar, tuvo que entregarle un regalo alternativo comprado a las apuradas en el barrio.<br><br>Clara agradeció con un beso educado y un <em>'gracias abuela'</em>, pero la desilusión en sus ojitos fue evidente al no ver la Barbie Mundial de la Selección. Marta sintió una profunda mezcla de impotencia y frustración al ver cómo las trabas de la tecnología arruinaron el regalo perfecto.";
  }
  if (product.id === 'alta-real') {
    return "¡La reacción de Clara fue espectacular! Al abrir el paquete y ver la Barbie Mundial nueva, original y en su caja sellada, sus ojos brillaron de alegría y empezó a saltar por toda la sala.<br><br>Corrió a abrazar a Marta con fuerza exclamando: <strong>'¡Sos la mejor abuela de todo el universo! ¡Te amo!'</strong>. A pesar de haber gastado $70.000 y lidiar con la odisea de la Play Store y los chats, la inmensa felicidad de su nieta pagó con creces cada dolor de cabeza digital.";
  }
  if (product.id === 'media-real') {
    return "Clara se puso súper contenta cuando abrió el regalo. Aunque la muñeca no venía en su caja original y tenía el pelo un poco cepillado por su dueña anterior, Clara exclamó con una gran sonrisa: <strong>'¡Qué buena que está, abuela, muchas gracias! ¡Vamos a jugar ya!'</strong>.<br><br>Marta suspiró con alivio al ver que su esfuerzo por comprarla usada por $25.000 valió la pena y que Clara disfrutaba enormemente el regalo sin importarle el empaque.";
  }
  if (product.id === 'baja-real') {
    return "Al abrir el paquete, Clara intentó forzar una sonrisa, pero se le notó un poco de desilusión. La muñeca venía sin caja, tenía el vestido algo desgastado y le faltaba uno de los zapatitos de fútbol.<br><br>Aunque abrazó a Marta cariñosamente y le dijo <em>'gracias'</em>, al rato la dejó a un lado para jugar con los regalos de sus amigos. Marta sintió que haber gastado solo $15.000 cuidó su jubilación, pero se quedó con la espinita de no haber podido darle a Clara lo que ella realmente soñaba.";
  }
  return "Marta entregó un regalo alternativo a Clara. Su nieta lo recibió con cariño, pero Marta no pudo evitar pensar en cómo la complejidad del mundo digital le impidió conseguir el regalo que tanto anhelaba para este día especial.";
}

function startDay5EndCinematic() {
  if (!parkedUberCar) return;

  // Stop pointer lock if active
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }

  // Complete openDoorUber mission
  completeMission('openDoorUber');

  // Define end cinematic steps
  const endSteps = [
    {
      duration: 3.5,
      autoAdvance: true,
      dialogue: { speaker: "Marta", text: "¡Ahí está el Uber! Menos mal, ya voy tarde..." },
      sound: { freq: 440, type: 'sine', duration: 0.1 },
      onStart: () => {
        // Look out from doorway towards the street
        camera.position.set(0.72, 1.48, -5.6);
        camera.lookAt(0.0, 1.2, -12.53);
      }
    },
    {
      duration: 3.5,
      autoAdvance: true,
      dialogue: { speaker: "Narrador", text: "Marta sale de la casa y se sube al Uber..." },
      onStart: () => {
        // Move camera closer to doorway
        camera.position.set(0.4, 1.4, -7.0);
        camera.lookAt(0.0, 1.1, -12.53);
        // Hide Marta to simulate she left
        if (martaLoadedModel) martaLoadedModel.visible = false;
        oldWomanMesh.visible = false;
      }
    },
    {
      duration: 7.0,
      autoAdvance: true,
      dialogue: { speaker: "Narrador", text: "El auto arranca y se aleja por la calle, llevando a Marta al cumpleaños de su nieta Clara." },
      onStart: () => {
        // Exterior camera view looking at the car
        camera.position.set(4.5, 1.3, -10.0);
        camera.lookAt(-2.0, 1.1, -12.53);
      },
      action: (progress, dt) => {
        // Move car to the left
        if (parkedUberCar && parkedUberCar.mesh) {
          parkedUberCar.mesh.position.x -= 8.0 * dt;
          parkedUberCar.sound.updatePosition(parkedUberCar.mesh.position, camera.position);
        }
        // Fade to black in the second half
        if (progress > 0.5) {
          const fadeVal = (progress - 0.5) * 2;
          if (ui.dayTransitionOverlay) {
            ui.dayTransitionOverlay.style.transition = 'none';
            ui.dayTransitionOverlay.style.opacity = String(fadeVal);
            ui.dayTransitionOverlay.setAttribute('aria-hidden', 'false');
          }
        }
      }
    }
  ];

  startCinematic(endSteps, () => {
    // Cinematic has ended
    // Clean up sounds
    if (parkedUberCar && parkedUberCar.sound) {
      parkedUberCar.sound.stop();
    }
    
    // Hide cinematic dialogue
    if (ui.cinematicOverlay) {
      ui.cinematicOverlay.setAttribute('aria-hidden', 'true');
    }

    // Populate and show the Narration modal
    if (ui.uberNarrationText) {
      ui.uberNarrationText.innerHTML = getClaraReactionNarrative();
    }
    if (ui.uberNarrationModal) {
      ui.uberNarrationModal.style.display = 'flex';
      ui.uberNarrationModal.setAttribute('aria-hidden', 'false');
    }
  });
}

function renderPlayStore(filterText) {
  const list = document.getElementById('playstoreAppList');
  if (!list) return;
  list.innerHTML = '';
  const query = (filterText || '').toLowerCase();
  playstoreApps.forEach((app) => {
    if (installedApps[app.id]) return;
    if (app.id === 'casino' && gameState.currentDay < 4) return;
    if (query && !app.name.toLowerCase().includes(query)) return;
    const card = document.createElement('div');
    card.className = 'playstore-card';
    card.innerHTML = `
      <div class="playstore-card-top">
        <div class="playstore-icon" style="background:${app.color}"><span style="color:#fff;font-weight:800;font-size:0.85rem;">${app.label}</span></div>
        <div class="playstore-card-info"><h5>${app.name}</h5><span>${app.dev}</span></div>
      </div>
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

    if (appId === 'marketpl4ce') {
      setTimeout(triggerMarketpl4ceHack, 500);
      setTimeout(() => renderPlayStore(document.getElementById('playstoreSearchInput')?.value || ''), 500);
      return;
    }

    if (appId === 'marketplace') {
      if (missionsState.currentMissionId === 'downloadMarketplace' && !missionsState.completed) {
        completeMission('downloadMarketplace');
        setTimeout(() => startBuyMarketplaceMission(), 1500);
      }
    }

    if (appId === 'mercadolibre' || appId === 'mercad0libre') {
      if (missionsState.currentMissionId === 'downloadMercadoLibre' && !missionsState.completed) {
        completeMission('downloadMercadoLibre');
        setTimeout(() => {
          setMission('tryBuyGift', 'Comprar el regalo', 'Intentá comprar la muñeca Barbie para Clara en la aplicación instalada.');
        }, 1500);
      }
    }

    setTimeout(() => renderPlayStore(document.getElementById('playstoreSearchInput')?.value || ''), 500);
  }, 1500);
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
        if (gameState.currentDay >= 4) {
          showToast('Sin stock disponible');
          if (missionsState.currentMissionId === 'buyGiftDay4' && !missionsState.completed) {
            completeMission('buyGiftDay4');
            setTimeout(() => startDownloadMarketplaceMission(), 1500);
          }
        } else {
          openMLCheckout();
        }
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
      ui.mlConfirmBtn.textContent = '✕ Pago rechazado';
    }
    setTimeout(() => {
      // No money is deducted since the purchase failed
      updateStats(0);
      switchPhoneView('phoneMLSuccessView');
    }, 1000);
  }, 2000);
}

function completeMLPurchaseAndMission() {
  if (missionsState.currentMissionId === 'tryBuyGift' && !missionsState.completed) {
    completeMission('tryBuyGift');
  }
  addMessageToConversation('camilo', 'incoming', 'Mamá, ¿qué pasó? Me enteré de que tuviste un problema con la tarjeta del Banco Nación. No te preocupes, mañana llamamos al banco y lo solucionamos juntos. Andá a descansar. ❤️');
  statsState.calm = Math.max(0, statsState.calm - 15);
  statsState.happiness = Math.max(0, statsState.happiness - 10);
  updateStats(0);
  if (ui.phoneChatReplyBox) ui.phoneChatReplyBox.classList.add('is-hidden');

  setTimeout(() => {
    setMission('goToSleep', 'Ir a dormir', 'Ya es tarde y tuviste un día largo. Ve a la cama a descansar.');
    setTimeOfDay('noche', 5.0);
  }, 1500);
}

// --- DAY 4: MARKETPLACE ---
let selectedMarketplaceProduct = null;

function renderMarketplaceProducts() {
  const list = ui.marketplaceProducts;
  if (!list) return;
  list.innerHTML = '';

  marketplaceProducts.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'marketplace-product-card';
    card.innerHTML = `
      <div class="marketplace-product-img" style="background:${product.gradient};"></div>
      <div class="marketplace-product-info">
        <span class="marketplace-product-price">$${product.price.toLocaleString('es-AR')}</span>
        <span class="marketplace-product-title">${product.title}</span>
        <span class="marketplace-product-quality quality-${product.quality.toLowerCase()}">Calidad: ${product.quality}</span>
      </div>
    `;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      openMarketplaceProductDetail(product);
    });
    list.appendChild(card);
  });
}

function openMarketplaceProducts() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  renderMarketplaceProducts();
  switchPhoneView('phoneMarketplaceView');
}

function openMarketplaceProductDetail(product) {
  selectedMarketplaceProduct = product;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }

  if (ui.marketplaceDetailContent) {
    ui.marketplaceDetailContent.innerHTML = `
      <div class="marketplace-detail-image" style="background:${product.gradient};"></div>
      <div class="marketplace-detail-info">
        <div class="marketplace-detail-title">${product.title}</div>
        <div class="marketplace-detail-price">$${product.price.toLocaleString('es-AR')}</div>
        <span class="marketplace-detail-quality quality-${product.quality.toLowerCase()}">Calidad: ${product.quality}</span>
      </div>
      <div class="marketplace-detail-section">
        <span class="marketplace-detail-section-label">Descripción</span>
        <p class="marketplace-detail-description">${product.description}</p>
      </div>
      <div class="marketplace-detail-section">
        <span class="marketplace-detail-section-label">Vendedor</span>
        <div class="marketplace-detail-seller">${product.seller}</div>
        <div class="marketplace-detail-meta">${product.rating}</div>
        <div class="marketplace-detail-meta">${product.accountAge}</div>
      </div>
      <button class="marketplace-detail-buy-btn" id="marketplaceDetailBuyBtn">Comprar</button>
    `;

    const buyBtn = document.getElementById('marketplaceDetailBuyBtn');
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMarketplaceCheckout(product);
      });
    }
  }

  switchPhoneView('phoneMarketplaceProductDetailView');
}

function openMarketplaceCheckout(product) {
  selectedMarketplaceProduct = product;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }

  if (ui.marketplaceCheckoutProduct) {
    ui.marketplaceCheckoutProduct.innerHTML = `
      <div class="marketplace-product-img" style="background:${product.gradient}; width:64px; height:64px; flex-shrink:0;"></div>
      <div>
        <div style="font-weight:700;color:#fff;font-size:0.95rem;">${product.title}</div>
        <div style="color:#ffd700;font-weight:800;font-size:1.1rem;margin-top:4px;">$${product.price.toLocaleString('es-AR')}</div>
        <div style="color:#9ca3af;font-size:0.75rem;margin-top:2px;">${product.quality} · ${product.seller}</div>
      </div>
    `;
  }

  if (ui.marketplaceCardNumber) ui.marketplaceCardNumber.value = '';
  if (ui.marketplaceCardName) ui.marketplaceCardName.value = '';
  if (ui.marketplaceCardExp) ui.marketplaceCardExp.value = '';
  if (ui.marketplaceCardCvv) ui.marketplaceCardCvv.value = '';
  if (ui.marketplaceLoadCardBtn) {
    ui.marketplaceLoadCardBtn.disabled = false;
    ui.marketplaceLoadCardBtn.style.opacity = '1';
    ui.marketplaceLoadCardBtn.textContent = 'Cargar datos de tarjeta';
  }
  if (ui.marketplaceConfirmBtn) {
    ui.marketplaceConfirmBtn.disabled = true;
    ui.marketplaceConfirmBtn.style.opacity = '0.5';
    ui.marketplaceConfirmBtn.textContent = 'Confirmar compra';
  }

  switchPhoneView('phoneMarketplaceCheckoutView');
}

function loadMarketplaceCardData() {
  if (ui.marketplaceCardNumber) ui.marketplaceCardNumber.value = '4509 9535 6623 4188';
  if (ui.marketplaceCardName) ui.marketplaceCardName.value = 'MARTA GOMEZ';
  if (ui.marketplaceCardExp) ui.marketplaceCardExp.value = '08/29';
  if (ui.marketplaceCardCvv) ui.marketplaceCardCvv.value = '324';
  if (ui.marketplaceLoadCardBtn) {
    ui.marketplaceLoadCardBtn.disabled = true;
    ui.marketplaceLoadCardBtn.style.opacity = '0.5';
    ui.marketplaceLoadCardBtn.textContent = 'Datos cargados';
  }
  if (ui.marketplaceConfirmBtn) {
    ui.marketplaceConfirmBtn.disabled = false;
    ui.marketplaceConfirmBtn.style.opacity = '1';
  }
}

function confirmMarketplacePurchase() {
  if (!selectedMarketplaceProduct || !ui.marketplaceConfirmBtn || ui.marketplaceConfirmBtn.disabled) return;

  if (statsState.money < selectedMarketplaceProduct.price) {
    showToast('No tenés saldo suficiente');
    return;
  }

  ui.marketplaceConfirmBtn.disabled = true;
  ui.marketplaceConfirmBtn.style.opacity = '0.5';
  ui.marketplaceConfirmBtn.textContent = 'Procesando...';

  setTimeout(() => {
    statsState.money = Math.max(0, statsState.money - selectedMarketplaceProduct.price);
    day4State.purchasedProduct = { ...selectedMarketplaceProduct };
    updateStats(0);
    showMarketplaceSuccessModal(selectedMarketplaceProduct);
    if (missionsState.currentMissionId === 'buyInMarketplace' && !missionsState.completed) {
      completeMission('buyInMarketplace');
    }
  }, 2000);
}

function showMarketplaceScamModal(product) {
  if (!ui.marketplaceScamModal) return;
  if (ui.marketplaceScamText) {
    ui.marketplaceScamText.textContent = `Pagaste $${product.price.toLocaleString('es-AR')} al vendedor "${product.seller}", pero nunca envió el producto.`;
  }
  if (ui.marketplaceScamImpact) {
    ui.marketplaceScamImpact.innerHTML = `
      <span class="impact-badge neg">Dinero -$${product.price.toLocaleString('es-AR')}</span>
      <span class="impact-badge neg">Calma -20%</span>
      <span class="impact-badge neg">Felicidad -10%</span>
    `;
  }
  ui.marketplaceScamModal.setAttribute('aria-hidden', 'false');
  selectedMarketplaceProduct = null;
}

function showMarketplaceSuccessModal(product) {
  if (!ui.marketplaceSuccessModal) return;
  if (ui.marketplaceSuccessText) {
    ui.marketplaceSuccessText.textContent = `Compraste la muñeca de calidad ${product.quality} por $${product.price.toLocaleString('es-AR')}. El pedido llegará pronto.`;
  }
  ui.marketplaceSuccessModal.setAttribute('aria-hidden', 'false');
  selectedMarketplaceProduct = null;
}

function triggerMarketpl4ceHack() {
  day4State.wasHacked = true;
  statsState.calm = Math.max(0, statsState.calm - 30);
  statsState.happiness = Math.max(0, statsState.happiness - 20);
  updateStats(0);
  if (ui.marketpl4ceHackModal) {
    ui.marketpl4ceHackModal.setAttribute('aria-hidden', 'false');
  }
}

function restartDay4() {
  if (ui.marketpl4ceHackModal) ui.marketpl4ceHackModal.setAttribute('aria-hidden', 'true');
  if (ui.postAssaultScamModal) ui.postAssaultScamModal.setAttribute('aria-hidden', 'true');
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');
  if (ui.damageOverlay) ui.damageOverlay.classList.remove('is-active');

  cinematicState.active = false;
  cinematicState.onEnd = null;
  dayTransitionState.active = false;

  statsState.fatigue = 0;
  statsState.money = day4InitialMoney.value;
  statsState.happiness = 80;
  statsState.calm = 75;
  updateStats(0);

  missionsState.currentMissionId = null;
  missionsState.active = false;
  missionsState.completed = false;
  if (ui.missionsContainer) ui.missionsContainer.setAttribute('aria-hidden', 'true');

  day4State.purchasedProduct = null;
  day4State.wasHacked = false;
  day4State.awaitingDelivery = false;
  day4State.deliveryResolved = false;

  casinoState.currentBet = 5000;
  casinoState.spinning = false;
  casinoState.bankrupt = false;
  if (ui.casinoBankruptModal) ui.casinoBankruptModal.setAttribute('aria-hidden', 'true');

  installedApps.marketplace = false;
  installedApps.marketpl4ce = false;
  installedApps.mercadolibre = false;
  installedApps.playstore = false;
  installedApps.casino = false;
  updatePhoneHomeApps();

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

  doorState.living.open = false;
  hideDay4Characters();
  selectedMarketplaceProduct = null;

  setTimeOfDay('dia', 0.0);
  camera.position.set(4.2, 0.72, 3.45);
  lookEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);

  if (typeof sleepToNextDayFn === 'function') {
    setTimeout(() => {
      gameState.currentDay = 4;
      if (ui.dayCounter) ui.dayCounter.textContent = 'Día 4';
      startDay4();
    }, 400);
  }
}

function startFraudDrain() {
  fraudDrainState.active = true;
  fraudDrainState.startMoney = statsState.money;
  fraudDrainState.targetMoney = Math.max(0, statsState.money - 40000);
  fraudDrainState.elapsed = 0;
  fraudDrainState.lastAlert = 0;
  fraudDrainState.isDay3Scam = false;
  if (ui.fraudOverlay) ui.fraudOverlay.classList.add('is-active');
  playAlertSound();
}

function startFraudDrainDay3() {
  fraudDrainState.active = true;
  fraudDrainState.startMoney = statsState.money;
  fraudDrainState.targetMoney = Math.max(0, statsState.money - 40000);
  fraudDrainState.elapsed = 0;
  fraudDrainState.lastAlert = 0;
  fraudDrainState.isDay3Scam = true;
  if (ui.fraudOverlay) ui.fraudOverlay.classList.add('is-active');
  playAlertSound();
}

function updateFraudDrain(dt) {
  if (!fraudDrainState.active) return;
  fraudDrainState.elapsed += dt;
  const progress = Math.min(1, fraudDrainState.elapsed / fraudDrainState.duration);
  const target = fraudDrainState.targetMoney !== undefined ? fraudDrainState.targetMoney : 0;
  const newMoney = Math.max(target, Math.round(THREE.MathUtils.lerp(fraudDrainState.startMoney, target, progress)));
  statsState.money = newMoney;
  updateStats(0);

  if (fraudDrainState.elapsed - fraudDrainState.lastAlert > 0.6) {
    playAlertSound();
    fraudDrainState.lastAlert = fraudDrainState.elapsed;
  }

  if (progress >= 1) {
    statsState.money = target;
    fraudDrainState.active = false;
    if (fraudDrainState.isDay3Scam) {
      triggerDay3PhishingAlert();
    } else {
      triggerBadEndingAppFraud();
    }
  }
}

function triggerBadEndingAppFraud() {
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');
  if (ui.gameOverModal) ui.gameOverModal.setAttribute('aria-hidden', 'false');
  statsState.calm = Math.max(0, statsState.calm - 30);
  statsState.happiness = Math.max(0, statsState.happiness - 20);
  updateStats(0);
}

function triggerDay3PhishingAlert() {
  if (ui.fraudOverlay) ui.fraudOverlay.classList.remove('is-active');
  if (ui.phishingModal) ui.phishingModal.setAttribute('aria-hidden', 'false');
  statsState.calm = Math.max(0, statsState.calm - 20);
  statsState.happiness = Math.max(0, statsState.happiness - 15);
  updateStats(0);
}

function resetBrowserApp() {
  if (ui.browserSearchInput) ui.browserSearchInput.value = '';
  if (ui.browserGoogleLogo) ui.browserGoogleLogo.style.display = 'block';
  if (ui.browserSearchResults) {
    ui.browserSearchResults.classList.add('is-hidden');
    ui.browserSearchResults.innerHTML = '';
  }
  if (ui.browserFakePortal) ui.browserFakePortal.classList.add('is-hidden');
  if (ui.browserRealPortal) ui.browserRealPortal.classList.add('is-hidden');
}

function submitBrowserSearch(query) {
  if (!ui.browserSearchResults) return;

  if (ui.browserGoogleLogo) ui.browserGoogleLogo.style.display = 'none';
  if (ui.browserFakePortal) ui.browserFakePortal.classList.add('is-hidden');
  if (ui.browserRealPortal) ui.browserRealPortal.classList.add('is-hidden');

  ui.browserSearchResults.classList.remove('is-hidden');
  ui.browserSearchResults.innerHTML = '';

  const cleanQuery = (query || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (cleanQuery.includes('banco') && cleanQuery.includes('nacion')) {
    // Render search results
    ui.browserSearchResults.innerHTML = `
      <div class="search-result-item" data-result="fake-1">
        <span class="search-result-url">www.banco-nacion-soporte-ayuda.com</span>
        <span class="search-result-title">Banco Naciòn - Soporte y Ayuda</span>
        <span class="search-result-desc">Atención al cliente BNA. Resuelve tus problemas de tarjeta de débito y crédito aquí de forma rápida.</span>
      </div>
      <div class="search-result-item" data-result="fake-2">
        <span class="search-result-url">bancocentral-soporte-nacion.online</span>
        <span class="search-result-title">BNA - Consultas de Saldo y Bloqueos</span>
        <span class="search-result-desc">Soporte oficial para el desbloqueo de tarjetas del Banco Nación Argentina. Comunicate ahora.</span>
      </div>
      <div class="search-result-item" data-result="fake-3">
        <span class="search-result-url">www.banco-nasion.net</span>
        <span class="search-result-title">Banco Nasion - Trámites Online</span>
        <span class="search-result-desc">Acceso rápido a canales de atención al cliente para desbloquear tu tarjeta de coordenadas y Token.</span>
      </div>
      <div class="search-result-item" data-result="real">
        <span class="search-result-url">www.bna.com.ar</span>
        <span class="search-result-title">Banco de la Nación Argentina - Sitio Oficial</span>
        <span class="search-result-desc">Portal oficial del Banco de la Nación Argentina. Trámites, canales de atención al cliente y consultas oficiales de forma segura.</span>
      </div>
    `;

    // Add click listeners to results
    const items = ui.browserSearchResults.querySelectorAll('.search-result-item');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = item.getAttribute('data-result');
        if (type.startsWith('fake')) {
          ui.browserSearchResults.classList.add('is-hidden');
          if (ui.browserFakePortal) ui.browserFakePortal.classList.remove('is-hidden');
        } else if (type === 'real') {
          if (!day3Scammed.value) {
            showToast('Acceso denegado: Tarjeta inhabilitada temporalmente en portal oficial por bloqueo. Debe contactar al soporte técnico.');
          } else {
            ui.browserSearchResults.classList.add('is-hidden');
            if (ui.browserRealPortal) ui.browserRealPortal.classList.remove('is-hidden');
          }
        }
      });
    });
  } else {
    ui.browserSearchResults.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 0.85rem;">
        No se encontraron resultados para "${query}".<br><br>
        <i>Consejo: Intente buscando "Banco Nación"</i>
      </div>
    `;
  }
}

function updateStats(dt) {
  if (!visualFatigueDisabled) {
    if (phoneState.active) {
      const fatigueRate = isUberMazeRunning() ? 0.4 : 1;
      statsState.fatigue += dt * fatigueRate;
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
  if (phoneState.active && phoneState.wakeTimer > 0.25) {
    updatePhoneUISize();
  }
  updateStats(dt);
  updateMissions(dt);
  updateCinematic(dt);
  updateFraudDrain(dt);
  updateTimeOfDay(dt);
  updateUberMaze(dt);
  updateUberMapPin(dt);
  updateTraffic(dt, camera);

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
    
    // Ocultar modal
    if (ui.gameOverModal) ui.gameOverModal.setAttribute('aria-hidden', 'true');
    
    // Limpiar el estado de los botones de la app falsa por si acaso
    if (ui.fakemlConfirmBtn) {
      ui.fakemlConfirmBtn.disabled = false;
      ui.fakemlConfirmBtn.style.opacity = '1';
      ui.fakemlConfirmBtn.textContent = 'Confirmar Pago';
    }
    
    // Desinstalar app falsa
    installedApps.mercad0libre = false;
    updatePhoneHomeApps();
    
    // Reiniciar misión de descarga
    setMission('downloadMercadoLibre', 'Descargar MercadoLibre', 'Entrá a la Play Store y descargá la app oficial de MercadoLibre.');
    
    // Volver a la pantalla de inicio
    switchPhoneView('phoneHomeView');
  });
}



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
    setVisualFatigueDisabled(ui.settingFatigue.checked);
    if (visualFatigueDisabled) {
      statsState.fatigue = 0;
    }
    updateStats(0);
  });
}

if (ui.settingWifi) {
  ui.settingWifi.addEventListener('change', (e) => {
    e.stopPropagation();
    phoneState.wifiEnabled = ui.settingWifi.checked;
  });
}

const playstoreSearchInput = document.getElementById('playstoreSearchInput');
if (playstoreSearchInput) {
  playstoreSearchInput.addEventListener('input', (e) => {
    e.stopPropagation();
    renderPlayStore(e.target.value);
  });
}

initKeyboard();

if (ui.browserSearchInput) {
  ui.browserSearchInput.addEventListener('click', (e) => {
    e.stopPropagation();
    showKeyboard(ui.browserSearchInput, (val) => {
      submitBrowserSearch(val);
    });
  });
}

if (ui.btnBrowserFakeChat) {
  ui.btnBrowserFakeChat.addEventListener('click', (e) => {
    e.stopPropagation();
    switchPhoneView('phoneMessagesView');
    openContactChat('soporteBna');

    if (conversations.soporteBna.length === 0) {
      addMessageToConversation('soporteBna', 'outgoing', 'Hola, mi tarjeta fue rechazada en MercadoLibre y me dijeron que hable con ustedes.');
      setTimeout(() => {
        addMessageToConversation(
          'soporteBna',
          'incoming',
          'Hola, estimada Marta. Vemos el bloqueo preventivo en su cuenta BNA. Para solucionarlo rápido, por favor confírmenos los 16 números de su tarjeta y el código de seguridad de 3 dígitos atrás.'
        );
        if (ui.phoneChatReplyBox) {
          ui.phoneChatReplyBox.classList.remove('is-hidden');
          ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-soporte-bna-give-data="true">Enviar datos de tarjeta</button>`;
        }
      }, 1500);
    }
  });
}

if (ui.btnBrowserRealChat) {
  ui.btnBrowserRealChat.addEventListener('click', (e) => {
    e.stopPropagation();
    switchPhoneView('phoneMessagesView');
    openContactChat('bancoNacion');

    if (conversations.bancoNacion.length === 0) {
      addMessageToConversation('bancoNacion', 'outgoing', 'Hola, necesito desbloquear mi tarjeta por favor.');
      setTimeout(() => {
        addMessageToConversation(
          'bancoNacion',
          'incoming',
          'Hola Marta. Iniciamos el trámite de desbloqueo. Por seguridad, te enviaremos un código SMS de 4 dígitos a tu celular para confirmar tu identidad.'
        );
        
        setTimeout(() => {
          playNotificationSound();
          addMessageToConversation(
            'bancoNacion',
            'incoming',
            '<strong>💬 BNA SMS:</strong> Tu código de verificación es <strong>8813</strong>. No lo compartas con nadie.'
          );
          if (ui.phoneChatReplyBox) {
            ui.phoneChatReplyBox.classList.remove('is-hidden');
            ui.phoneChatReplyBox.innerHTML = `<button id="sendReplyBtn" class="phone-reply-btn" data-banco-nacion-verify="true">Ingresar código 8813</button>`;
          }
        }, 2000);
      }, 1500);
    }
  });
}

if (ui.btnContinuePhishing) {
  ui.btnContinuePhishing.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.phishingModal) ui.phishingModal.setAttribute('aria-hidden', 'true');

    day3Scammed.value = true;
    setMission('fixBankCard', 'Buscar sitio oficial', 'Vuelve a buscar "Banco Nación" en Google, pero esta vez ingresa únicamente al sitio web oficial (www.bna.com.ar).');

    resetBrowserApp();
    switchPhoneView('phoneBrowserView');
  });
}

// --- DAY 4 EVENT LISTENERS ---
if (ui.marketplaceLoadCardBtn) {
  ui.marketplaceLoadCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    loadMarketplaceCardData();
  });
}

if (ui.marketplaceConfirmBtn) {
  ui.marketplaceConfirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmMarketplacePurchase();
  });
}

if (ui.btnMarketplaceScamContinue) {
  ui.btnMarketplaceScamContinue.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.marketplaceScamModal) ui.marketplaceScamModal.setAttribute('aria-hidden', 'true');
    openMarketplaceProducts();
  });
}

if (ui.btnMarketplaceSuccessContinue) {
  ui.btnMarketplaceSuccessContinue.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.marketplaceSuccessModal) ui.marketplaceSuccessModal.setAttribute('aria-hidden', 'true');
    setMission('awaitingDelivery', 'Esperar el timbre', 'Esperá el timbre: el pedido de Marketplace está en camino.');
    day4State.awaitingDelivery = true;

    if (document.pointerLockElement === canvas) {
      document.requestPointerLock();
    }

    setTimeout(() => {
      playDoorbellSound();
      setMission('attendDelivery', 'Atender la puerta', '¡Timbre! Abrí la puerta para recibir tu pedido.');
    }, 5000);
  });
}

if (ui.btnPostAssaultRestart) {
  ui.btnPostAssaultRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    restartDay4();
  });
}

if (ui.btnMarketpl4ceRewind) {
  ui.btnMarketpl4ceRewind.addEventListener('click', (e) => {
    e.stopPropagation();
    restartDay4();
  });
}

// --- DAY 4: CASINO EVENT LISTENERS ---
if (ui.casinoBetMinus) {
  ui.casinoBetMinus.addEventListener('click', (e) => {
    e.stopPropagation();
    changeCasinoBet(-5000);
  });
}

if (ui.casinoBetPlus) {
  ui.casinoBetPlus.addEventListener('click', (e) => {
    e.stopPropagation();
    changeCasinoBet(5000);
  });
}

if (ui.casinoSpinBtn) {
  ui.casinoSpinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    spinCasino();
  });
}

if (ui.btnCasinoBankruptRestart) {
  ui.btnCasinoBankruptRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    restartDay4();
  });
}

if (ui.btnUberSuccessContinue) {
  ui.btnUberSuccessContinue.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.uberSuccessModal) ui.uberSuccessModal.setAttribute('aria-hidden', 'true');
    resetUberMaze();
    resetUberMapPin();
    switchPhoneView('phoneHomeView');
    if (phoneState.active) togglePhone();
    
    // Fade out transition overlay to show the room again
    if (ui.dayTransitionOverlay) {
      ui.dayTransitionOverlay.style.transition = 'opacity 1s ease';
      ui.dayTransitionOverlay.style.opacity = '0';
      ui.dayTransitionOverlay.setAttribute('aria-hidden', 'true');
    }

    if (ui.missionsContainer) ui.missionsContainer.setAttribute('aria-hidden', 'false');
    if (ui.missionTitle) ui.missionTitle.textContent = 'Cumpleaños de Clara';
    if (ui.missionText) ui.missionText.textContent = 'Marta llegó a tiempo y pudo compartir el cumpleaños con su nieta.';
    if (ui.missionCard) ui.missionCard.classList.add('is-completed');
    addMessageToConversation('clara', 'incoming', '¡Abuela! ¡Llegaste! 🎉 Gracias por venir a mi cumpleaños, sos la mejor. ¡Te quiero muchísimo! ❤️🎂');
  });
}

if (ui.btnUberFailRestart) {
  ui.btnUberFailRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.uberFailModal) ui.uberFailModal.setAttribute('aria-hidden', 'true');
    resetUberMaze();
    resetUberMapPin();
    uberState.attempts = (uberState.attempts || 1) + 1;
    openUberApp();
  });
}

// Debug skip: ?day=5 inicia directo en el día 5 (solo desarrollo)
(function debugSkipDay() {
  try {
    const params = new URLSearchParams(window.location.search);
    const day = parseInt(params.get('day'), 10);
    if (!(day >= 2 && day <= 5)) return;

    // Saltar intro
    if (ui.introOverlay) {
      ui.introOverlay.classList.add('is-hidden');
      ui.introOverlay.style.display = 'none';
    }
    if (ui.introFade) ui.introFade.style.opacity = '0';
    document.body.classList.remove('intro-active');
    if (martaLoadedModel) martaLoadedModel.visible = false;
    doorState.living.open = false;

    camera.position.set(-0.7, 1.48, -2.3);
    lookEuler.set(0, -Math.PI / 2, 0);
    camera.quaternion.setFromEuler(lookEuler);

    gameState.currentDay = day - 1;
    if (ui.dayCounter) ui.dayCounter.textContent = 'Día ' + (day - 1);
    missionsState.completed = true;

    setTimeout(() => {
      sleepToNextDayFn();
    }, 200);
  } catch (err) {
    console.warn('debug skip failed', err);
  }
})();

// Initialize traffic system (asynchronously loads GLB in background)
initTraffic(scene);

// Start the render loop (scene renders behind intro overlay)
animate();
