import './styles.css';
import * as THREE from 'three';
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
};
textures.floor.repeat.set(5, 5);
textures.wall.repeat.set(3, 2);
textures.rug.repeat.set(1, 1);
textures.street.repeat.set(3, 6);

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
};

const room = new THREE.Group();
const outdoor = new THREE.Group();
const exterior = new THREE.Group();
scene.add(room, outdoor, exterior);

function mesh(geometry, material, position, rotation = [0, 0, 0], cast = true, receive = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function createCutoutWall(width, height, position, material, totalWidth = 12, totalHeight = 4.2, startX = -6, startY = 0) {
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
  return mesh(geom, material, position, [0, 0, 0], false);
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
room.add(createCutoutWall(5.89, 4.2, [-3.055, 2.1, -6], materials.wall));
room.add(createCutoutWall(1.41, 4.2, [2.255, 2.1, -6], materials.wall));
room.add(createCutoutWall(1.66, 1.96, [0.72, 3.22, -6], materials.wall));
room.add(createCutoutWall(0.34, 4.2, [5.83, 2.1, -6], materials.wall));
room.add(createCutoutWall(2.86, 1.24, [4.35, 0.62, -6], materials.wall));
room.add(createCutoutWall(2.86, 0.58, [4.35, 3.91, -6], materials.wall));
room.add(mesh(new THREE.PlaneGeometry(12, 4.2), materials.wall, [-6, 2.1, 0], [0, Math.PI / 2, 0], false));
room.add(mesh(new THREE.PlaneGeometry(12, 4.2), materials.wall, [6, 2.1, 0], [0, -Math.PI / 2, 0], false));
const windowGlass = mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.12, roughness: 0.15, transparent: true, opacity: 0.25, depthWrite: false }), [4.35, 2.45, -5.98], [0, 0, 0], false, false);
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
const sunPatch = mesh(new THREE.PlaneGeometry(2.5, 4.2), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }), [3.35, 0.026, -1.45], [-Math.PI / 2, 0, 0.24], false, false);
room.add(sunPatch);

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
  addBox(room, [0.72, 0.52, 0.045], materials.wood, [-5.97, 1.55 + i * 0.62, -2.7 + i * 0.62], [0, Math.PI / 2, 0]);
  addBox(room, [0.58, 0.38, 0.05], new THREE.MeshStandardMaterial({ color: [0x7e9caa, 0x9f8262, 0x8f668a][i], roughness: 0.7 }), [-5.94, 1.55 + i * 0.62, -2.7 + i * 0.62], [0, Math.PI / 2, 0]);
}

const lamp = new THREE.Group();
lamp.position.set(2.8, 0, -2.5);
room.add(lamp);
addRoundedCylinder(lamp, 0.18, 0.08, materials.metal, [0, 0.06, 0]);
addRoundedCylinder(lamp, 0.045, 1.25, materials.metal, [0, 0.68, 0]);
addRoundedCylinder(lamp, 0.36, 0.45, materials.warmLight, [0, 1.38, 0], [0, 0, 0], 36);

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

const ambient = new THREE.HemisphereLight(0xfff6e8, 0x3b4b48, 1.9);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff0c4, 3.6);
sun.position.set(6.2, 6.4, -3.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 24;
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
scene.add(sun);

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

function startCinematic(sequence) {
  cinematicState.active = true;
  cinematicState.currentStep = 0;
  cinematicState.timer = 0;
  cinematicState.sequence = sequence;
  cinematicState.waitingForSpace = false;

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
      cinematicState.waitingForSpace = true;
      if (ui.cinematicPrompt) ui.cinematicPrompt.classList.add('is-visible');
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

function toggleNearbyDoor() {
  const nearby = getNearbyDoor();
  if (!nearby) return;
  nearby.door.open = !nearby.door.open;

  if (nearby.id === 'living' && nearby.door.open && missionsState.currentMissionId === 'doorbell' && !missionsState.completed) {
    startCinematic(cutsceneLiving);
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

setTimeout(() => {
  setMission('doorbell', 'Atiende la puerta', 'Alguien toca el timbre. Ve a abrir la puerta de entrada.');
}, 1000);

animate();
