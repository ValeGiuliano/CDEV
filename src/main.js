import './styles.css';
import * as THREE from 'three';
import { createIcons, PhoneCall, MessageSquareWarning, Landmark, Users, MapPin, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide';

createIcons({
  icons: {
    PhoneCall,
    MessageSquareWarning,
    Landmark,
    Users,
    MapPin,
    RotateCcw,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
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
scene.background = new THREE.Color(0x182323);
scene.fog = new THREE.Fog(0x182323, 10, 32);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(-0.85, 1.58, 3.25);
scene.add(camera);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const lookEuler = new THREE.Euler(-0.08, -0.28, 0, 'YXZ');
const moveState = {
  forward: false,
  back: false,
  left: false,
  right: false,
};
const moveImpulseUntil = {
  forward: 0,
  back: 0,
  left: 0,
  right: 0,
};
const player = {
  velocity: new THREE.Vector3(),
  walkBob: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

const state = {
  scenario: 'reset',
  risk: 12,
  visualStress: 0.12,
  targetVisualStress: 0.12,
  phonePulse: 0,
  phoneReveal: 0,
  targetPhoneReveal: 0,
  outdoor: false,
  lastKey: null,
  introActive: true,
  introStartedAt: null,
  introDone: false,
};

const ui = {
  app: document.querySelector('#app'),
  riskFill: document.querySelector('#riskFill'),
  riskValue: document.querySelector('#riskValue'),
  phoneScreen: document.querySelector('#phoneScreen'),
  screenLabel: document.querySelector('#screenLabel'),
  screenTitle: document.querySelector('#screenTitle'),
  screenBody: document.querySelector('#screenBody'),
  eventKicker: document.querySelector('#eventKicker'),
  eventTitle: document.querySelector('#eventTitle'),
  eventDescription: document.querySelector('#eventDescription'),
  pressureValue: document.querySelector('#pressureValue'),
  privacyValue: document.querySelector('#privacyValue'),
  trustValue: document.querySelector('#trustValue'),
  doorPrompt: document.querySelector('#doorPrompt'),
  introOverlay: document.querySelector('#introOverlay'),
  introTitle: document.querySelector('#introTitle'),
  introText: document.querySelector('#introText'),
  skipIntro: document.querySelector('#skipIntro'),
};

const scenarios = {
  reset: {
    risk: 12,
    label: 'Inicio',
    title: 'Telefono en reposo',
    body: 'La casa esta tranquila. Las notificaciones esperan en silencio.',
    kicker: 'Hogar',
    eventTitle: 'Rutina cotidiana',
    description: 'La experiencia muestra como llamadas, mensajes y tramites digitales pueden transformarse en presion, confusion o exposicion a fraudes.',
    pressure: 'Baja',
    privacy: 'Media',
    trust: 'Alta',
    colorA: '#183233',
    colorB: '#1e2628',
    warning: null,
  },
  call: {
    risk: 74,
    label: 'Llamada entrante',
    title: 'Numero desconocido',
    body: 'Una voz apura una decision: “hay un problema con su cuenta”. El tiempo se vuelve presion.',
    kicker: 'Riesgo de fraude',
    eventTitle: 'Urgencia fabricada',
    description: 'El telefono invade el living con tono insistente, luces rojas y un mensaje que pide actuar antes de pensar.',
    pressure: 'Alta',
    privacy: 'Alta',
    trust: 'Critica',
    colorA: '#3a1818',
    colorB: '#772b2a',
    warning: 'NO COMPARTIR CODIGOS',
  },
  sms: {
    risk: 68,
    label: 'Mensaje',
    title: 'Enlace sospechoso',
    body: 'El SMS promete desbloquear una entrega. El enlace parece oficial, pero no lo es.',
    kicker: 'Phishing',
    eventTitle: 'Interfaz confusa',
    description: 'La mesa se llena de papeles y claves: el entorno muestra como un mensaje breve puede pedir demasiada confianza.',
    pressure: 'Media',
    privacy: 'Alta',
    trust: 'Alta',
    colorA: '#223241',
    colorB: '#76592a',
    warning: 'ENLACE NO VERIFICADO',
  },
  bank: {
    risk: 83,
    label: 'Banco digital',
    title: 'Codigo de seguridad',
    body: 'La pantalla exige pasos, claves y confirmaciones. Un error puede exponer dinero o datos.',
    kicker: 'Tramite sensible',
    eventTitle: 'Sobrecarga de pasos',
    description: 'El telefono proyecta paneles bancarios sobre la habitacion para representar contrasenas, tokens y decisiones dificiles.',
    pressure: 'Alta',
    privacy: 'Critica',
    trust: 'Critica',
    colorA: '#132f2b',
    colorB: '#284d3f',
    warning: 'DATOS SENSIBLES',
  },
  family: {
    risk: 39,
    label: 'Contacto',
    title: 'Pedido de ayuda',
    body: 'Un mensaje familiar puede ser real o una suplantacion. La confianza tambien necesita verificacion.',
    kicker: 'Suplantacion',
    eventTitle: 'Confianza emocional',
    description: 'Retratos y recuerdos se iluminan: el riesgo no siempre parece tecnico, tambien puede parecer cercano.',
    pressure: 'Media',
    privacy: 'Media',
    trust: 'Alta',
    colorA: '#273042',
    colorB: '#4d355f',
    warning: 'VERIFICAR IDENTIDAD',
  },
  street: {
    risk: 57,
    label: 'Fuera de casa',
    title: 'Telefono en la calle',
    body: 'Ruido, brillo solar y apuro reducen la atencion. Las decisiones digitales salen del hogar.',
    kicker: 'Mundo exterior',
    eventTitle: 'Barrio y distracciones',
    description: 'La pared se abre hacia la vereda: notificaciones, transito y carteles compiten por la atencion.',
    pressure: 'Media',
    privacy: 'Alta',
    trust: 'Media',
    colorA: '#1b3343',
    colorB: '#4a633d',
    warning: 'ATENCION DIVIDIDA',
  },
};

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
  warmLight: new THREE.MeshStandardMaterial({ color: 0xffc46e, emissive: 0xffa83d, emissiveIntensity: 1.1 }),
  warning: new THREE.MeshStandardMaterial({ color: 0xff6b5f, emissive: 0xff2d2d, emissiveIntensity: 0.8, transparent: true, opacity: 0 }),
  street: new THREE.MeshStandardMaterial({ map: textures.street, roughness: 0.84 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0xcbd7d0, roughness: 0.86, side: THREE.DoubleSide }),
  tile: new THREE.MeshStandardMaterial({ color: 0xb8c5bd, roughness: 0.82 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0x53675d, roughness: 0.72 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc9926e, roughness: 0.72 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x6d6b65, roughness: 0.85 }),
  sonShirt: new THREE.MeshStandardMaterial({ color: 0x2f5d7c, roughness: 0.78 }),
  martaDress: new THREE.MeshStandardMaterial({ color: 0x7d536a, roughness: 0.82 }),
};

const room = new THREE.Group();
const alerts = new THREE.Group();
const outdoor = new THREE.Group();
const exterior = new THREE.Group();
scene.add(room, alerts, outdoor, exterior);

function mesh(geometry, material, position, rotation = [0, 0, 0], cast = true, receive = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
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
room.add(mesh(new THREE.PlaneGeometry(4.1, 7.2), materials.floor, [3.95, 0.004, -7.5], [-Math.PI / 2, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(12, 12), materials.plaster, [0, 4.18, 0], [Math.PI / 2, 0, 0], false, false));
room.add(mesh(new THREE.PlaneGeometry(4.1, 7.2), materials.plaster, [3.95, 4.18, -7.5], [Math.PI / 2, 0, 0], false, false));
room.add(mesh(new THREE.PlaneGeometry(5.4, 4.2), materials.wall, [-3.3, 2.1, -6], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(0.66, 4.2), materials.wall, [2.63, 2.1, -6], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(0.34, 4.2), materials.wall, [5.83, 2.1, -6], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(2.86, 1.24), materials.wall, [4.35, 0.62, -6], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(2.86, 0.58), materials.wall, [4.35, 3.91, -6], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(12, 4.2), materials.wall, [-6, 2.1, 0], [0, Math.PI / 2, 0], false));
room.add(mesh(new THREE.PlaneGeometry(12, 4.2), materials.wall, [6, 2.1, 0], [0, -Math.PI / 2, 0], false));
room.add(mesh(new THREE.PlaneGeometry(4.1, 4.2), materials.plaster, [1.9, 2.1, -11.1], [0, 0, 0], false));
room.add(mesh(new THREE.PlaneGeometry(7.2, 4.2), materials.plaster, [5.98, 2.1, -7.5], [0, -Math.PI / 2, 0], false));
room.add(mesh(new THREE.PlaneGeometry(5.1, 4.2), materials.plaster, [1.9, 2.1, -8.55], [0, Math.PI / 2, 0], false));
const windowGlass = mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x7fb4d6, emissiveIntensity: 0.08, roughness: 0.18, transparent: true, opacity: 0.22, depthWrite: false }), [4.35, 2.45, -5.98], [0, 0, 0], false, false);
room.add(windowGlass);
addBox(room, [2.95, 0.08, 0.08], materials.wood, [4.35, 3.58, -5.94]);
addBox(room, [2.95, 0.08, 0.08], materials.wood, [4.35, 1.32, -5.94]);
addBox(room, [0.08, 2.28, 0.08], materials.wood, [2.86, 2.45, -5.94]);
addBox(room, [0.08, 2.28, 0.08], materials.wood, [5.84, 2.45, -5.94]);
addBox(room, [0.06, 2.16, 0.06], materials.wood, [4.35, 2.45, -5.93]);
addBox(room, [2.78, 0.06, 0.06], materials.wood, [4.35, 2.45, -5.93]);
const sunPatch = mesh(new THREE.PlaneGeometry(2.5, 4.2), new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }), [3.35, 0.026, -1.45], [-Math.PI / 2, 0, 0.24], false, false);
room.add(sunPatch);

const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x9fd0ec, side: THREE.DoubleSide });
exterior.add(mesh(new THREE.PlaneGeometry(14, 7), skyMaterial, [4.3, 3.1, -14], [0, 0, 0], false, false));
exterior.add(mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: 0x4f7d55, roughness: 0.9 }), [4.2, -0.015, -9.7], [-Math.PI / 2, 0, 0], false));
exterior.add(mesh(new THREE.PlaneGeometry(8, 1.1), new THREE.MeshStandardMaterial({ color: 0x8b8f8e, roughness: 0.8 }), [4.25, 0.005, -7.45], [-Math.PI / 2, 0, 0], false));
exterior.add(mesh(new THREE.PlaneGeometry(8, 0.42), new THREE.MeshStandardMaterial({ color: 0xd4d0be, roughness: 0.75 }), [4.25, 0.01, -6.72], [-Math.PI / 2, 0, 0], false));
for (let i = 0; i < 6; i += 1) {
  addBox(exterior, [0.55, 0.025, 0.08], new THREE.MeshBasicMaterial({ color: 0xf1e6b0 }), [1.6 + i * 1.05, 0.026, -7.45]);
}
exterior.add(mesh(new THREE.PlaneGeometry(3.8, 1.2), new THREE.MeshBasicMaterial({ color: 0xddefff, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), [1.2, 4.15, -13.9], [0, 0, -0.08], false, false));
exterior.add(mesh(new THREE.PlaneGeometry(2.8, 0.85), new THREE.MeshBasicMaterial({ color: 0xf5fbff, transparent: true, opacity: 0.68, side: THREE.DoubleSide }), [6.1, 3.75, -13.85], [0, 0, 0.04], false, false));
for (let i = 0; i < 5; i += 1) {
  const tree = new THREE.Group();
  tree.position.set(1.4 + i * 1.35, 0, -8.8 - (i % 2) * 1.1);
  exterior.add(tree);
  addRoundedCylinder(tree, 0.07, 0.85, new THREE.MeshStandardMaterial({ color: 0x5b3f2b, roughness: 0.86 }), [0, 0.42, 0], [0, 0, 0], 12);
  addRoundedCylinder(tree, 0.42 + (i % 2) * 0.08, 0.9, new THREE.MeshStandardMaterial({ color: [0x315f3e, 0x3f7552, 0x557a3f][i % 3], roughness: 0.92 }), [0, 1.13, 0], [0, 0, 0], 18);
}
for (let i = 0; i < 3; i += 1) {
  const house = addBox(exterior, [1.45, 1.05, 0.7], new THREE.MeshStandardMaterial({ color: [0xb9c8c1, 0xc6b39b, 0xa7bac3][i], roughness: 0.82 }), [1.7 + i * 2.4, 0.52, -12.4]);
  addBox(house, [1.58, 0.18, 0.82], new THREE.MeshStandardMaterial({ color: 0x684737, roughness: 0.75 }), [0, 0.62, 0]);
  addBox(house, [0.26, 0.24, 0.02], new THREE.MeshBasicMaterial({ color: 0xffdf91 }), [-0.34, 0.12, 0.36]);
  addBox(house, [0.26, 0.24, 0.02], new THREE.MeshBasicMaterial({ color: 0xffdf91 }), [0.34, 0.12, 0.36]);
}
const featureTree = new THREE.Group();
featureTree.position.set(4.95, 0, -7.05);
exterior.add(featureTree);
addRoundedCylinder(featureTree, 0.09, 1.2, new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.82 }), [0, 0.6, 0], [0, 0, 0], 14);
addRoundedCylinder(featureTree, 0.58, 1.0, new THREE.MeshStandardMaterial({ color: 0x2f6f45, roughness: 0.9 }), [0, 1.45, 0], [0, 0, 0], 22);
const featureHouse = addBox(exterior, [1.9, 1.25, 0.7], new THREE.MeshStandardMaterial({ color: 0xd0c2a6, roughness: 0.8 }), [3.45, 0.62, -9.3]);
addBox(featureHouse, [2.05, 0.22, 0.82], new THREE.MeshStandardMaterial({ color: 0x744332, roughness: 0.75 }), [0, 0.73, 0]);
addBox(featureHouse, [0.32, 0.28, 0.02], new THREE.MeshBasicMaterial({ color: 0xffe29b }), [-0.46, 0.18, 0.36]);
addBox(featureHouse, [0.32, 0.28, 0.02], new THREE.MeshBasicMaterial({ color: 0xffe29b }), [0.46, 0.18, 0.36]);
addBox(room, [0.08, 4.2, 0.1], materials.wood, [2.28, 2.1, -5.94]);
addBox(room, [0.08, 4.2, 0.1], materials.wood, [6.0, 2.1, -5.94]);
addBox(room, [3.72, 0.08, 0.1], materials.wood, [4.14, 4.18, -5.94]);
addBox(room, [3.72, 0.08, 0.1], materials.wood, [4.14, 0.04, -5.94]);

const livingDoorGroup = new THREE.Group();
livingDoorGroup.position.set(-0.04, 0, -6.03);
room.add(livingDoorGroup);
addBox(livingDoorGroup, [1.35, 2.1, 0.13], materials.wood, [0.675, 1.05, 0]);
addBox(livingDoorGroup, [0.05, 0.05, 0.04], materials.metal, [1.18, 1.03, 0.08]);
addBox(room, [0.14, 2.1, 0.16], materials.wood, [1.48, 1.05, -6.03]);
addBox(room, [0.14, 2.1, 0.16], materials.wood, [-0.04, 1.05, -6.03]);
addBox(room, [1.5, 0.14, 0.16], materials.wood, [0.72, 2.08, -6.03]);

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

const phoneGroup = new THREE.Group();
phoneGroup.position.set(0.92, 0.96, 0.08);
phoneGroup.rotation.set(-0.12, -0.45, 0.05);
phoneGroup.name = 'Telefono';
phoneGroup.visible = false;
room.add(phoneGroup);
addBox(phoneGroup, [0.48, 0.065, 0.86], materials.dark, [0, 0, 0]);
const phoneGlow = addBox(phoneGroup, [0.4, 0.071, 0.68], new THREE.MeshStandardMaterial({ color: 0x1d4446, emissive: 0x2cc7c0, emissiveIntensity: 0.22, roughness: 0.45 }), [0, 0.006, 0]);
phoneGlow.name = 'PantallaTelefono';

const handPhone = new THREE.Group();
handPhone.position.set(0, -0.18, -0.72);
handPhone.rotation.set(-0.52, -0.18, 0.08);
handPhone.scale.setScalar(0.56);
handPhone.visible = false;
scene.add(handPhone);
const hand = addBox(handPhone, [0.32, 0.16, 0.18], new THREE.MeshStandardMaterial({ color: 0xc9926e, roughness: 0.76 }), [-0.08, -0.04, 0.08]);
hand.rotation.z = -0.18;
addBox(handPhone, [0.38, 0.055, 0.68], materials.dark, [0.08, 0.06, -0.08], [-0.08, 0, 0]);
const handPhoneGlow = addBox(handPhone, [0.31, 0.059, 0.54], new THREE.MeshStandardMaterial({ color: 0x183233, emissive: 0x2cc7c0, emissiveIntensity: 0.85, roughness: 0.46 }), [0.08, 0.064, -0.08], [-0.08, 0, 0]);
const heldPhoneFace = mesh(new THREE.PlaneGeometry(0.46, 0.74), new THREE.MeshBasicMaterial({ color: 0x0b0f10, side: THREE.DoubleSide }), [0.08, 0.11, 0.18], [0, 0, 0], false, false);
const heldPhoneScreen = mesh(new THREE.PlaneGeometry(0.35, 0.56), new THREE.MeshBasicMaterial({ color: 0x2cc7c0, side: THREE.DoubleSide }), [0.08, 0.11, 0.19], [0, 0, 0], false, false);
handPhone.add(heldPhoneFace, heldPhoneScreen);

for (let i = 0; i < 3; i++) {
  const frame = addBox(room, [0.72, 0.52, 0.045], materials.wood, [-5.97, 1.55 + i * 0.62, -2.7 + i * 0.62], [0, Math.PI / 2, 0]);
  const photo = addBox(room, [0.58, 0.38, 0.05], new THREE.MeshStandardMaterial({ color: [0x7e9caa, 0x9f8262, 0x8f668a][i], roughness: 0.7 }), [-5.94, 1.55 + i * 0.62, -2.7 + i * 0.62], [0, Math.PI / 2, 0]);
  photo.userData.baseEmissive = 0;
  frame.userData.familyAsset = true;
}

const lamp = new THREE.Group();
lamp.position.set(2.8, 0, -2.5);
room.add(lamp);
addRoundedCylinder(lamp, 0.18, 0.08, materials.metal, [0, 0.06, 0]);
addRoundedCylinder(lamp, 0.045, 1.25, materials.metal, [0, 0.68, 0]);
addRoundedCylinder(lamp, 0.36, 0.45, materials.warmLight, [0, 1.38, 0], [0, 0, 0], 36);

const kitchen = new THREE.Group();
kitchen.position.set(3.95, 0, -8.25);
room.add(kitchen);
addBox(kitchen, [1.85, 0.78, 0.55], materials.cabinet, [0.05, 0.39, -0.88]);
addBox(kitchen, [1.95, 0.08, 0.62], materials.metal, [0.05, 0.82, -0.88]);
addBox(kitchen, [0.48, 0.09, 0.36], new THREE.MeshStandardMaterial({ color: 0x27383a, metalness: 0.2, roughness: 0.34 }), [-0.45, 0.88, -0.88]);
addRoundedCylinder(kitchen, 0.055, 0.42, materials.metal, [-0.58, 1.08, -0.9], [0.65, 0, 0], 18);
addBox(kitchen, [0.78, 1.35, 0.62], new THREE.MeshStandardMaterial({ color: 0xd6ddd8, roughness: 0.48 }), [1.45, 0.68, -0.92]);
addBox(kitchen, [0.72, 0.04, 0.58], materials.metal, [1.45, 1.22, -0.58]);
addBox(kitchen, [1.62, 0.34, 0.28], materials.wood, [-0.1, 1.42, -0.92]);
for (let i = 0; i < 4; i++) {
  addBox(kitchen, [0.18, 0.24, 0.18], new THREE.MeshStandardMaterial({ color: [0xa63d40, 0x3d746c, 0xd8b86d, 0x6d8b78][i], roughness: 0.72 }), [-0.78 + i * 0.32, 1.07, -1.08]);
}

const entry = new THREE.Group();
entry.position.set(1.4, 0, -10.55);
room.add(entry);
const entryDoorGroup = new THREE.Group();
entryDoorGroup.position.set(-0.56, 0, 0);
entry.add(entryDoorGroup);
addBox(entryDoorGroup, [1.05, 2.0, 0.14], new THREE.MeshStandardMaterial({ color: 0x4a3829, roughness: 0.62 }), [0.525, 1, 0]);
addRoundedCylinder(entryDoorGroup, 0.045, 0.055, materials.metal, [0.88, 1.03, 0.08], [Math.PI / 2, 0, 0], 18);
addBox(entry, [1.2, 0.06, 0.5], materials.rug, [0, 0.035, 0.62]);

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

function createPerson({ shirt, hair, skirt = false }) {
  const person = new THREE.Group();
  const body = addRoundedCylinder(person, 0.22, 0.7, shirt, [0, 0.95, 0], [0, 0, 0], 22);
  body.scale.x = skirt ? 1.18 : 1;
  addRoundedCylinder(person, 0.18, 0.24, materials.skin, [0, 1.42, 0], [0, 0, 0], 22);
  addRoundedCylinder(person, 0.19, 0.12, hair, [0, 1.57, 0], [0, 0, 0], 22);
  const leftArm = addRoundedCylinder(person, 0.045, 0.56, materials.skin, [-0.28, 0.98, 0.02], [0.2, 0, 0.24], 12);
  const rightArm = addRoundedCylinder(person, 0.045, 0.56, materials.skin, [0.28, 0.98, 0.02], [0.2, 0, -0.24], 12);
  addRoundedCylinder(person, 0.055, 0.64, new THREE.MeshStandardMaterial({ color: 0x343638, roughness: 0.8 }), [-0.09, 0.35, 0], [0, 0, 0], 12);
  addRoundedCylinder(person, 0.055, 0.64, new THREE.MeshStandardMaterial({ color: 0x343638, roughness: 0.8 }), [0.09, 0.35, 0], [0, 0, 0], 12);
  person.userData = { leftArm, rightArm };
  return person;
}

const introGroup = new THREE.Group();
scene.add(introGroup);

const introSon = createPerson({ shirt: materials.sonShirt, hair: new THREE.MeshStandardMaterial({ color: 0x30241f, roughness: 0.85 }) });
introSon.position.set(0.78, 0, -6.95);
introSon.rotation.y = 0;
introGroup.add(introSon);

const introMarta = createPerson({ shirt: materials.martaDress, hair: materials.hair, skirt: true });
introMarta.position.set(-1.7, 0, -4.25);
introMarta.rotation.y = -0.15;
introMarta.visible = false;
introGroup.add(introMarta);

const doorbell = new THREE.Group();
doorbell.position.set(1.72, 1.28, -5.86);
introGroup.add(doorbell);
addBox(doorbell, [0.16, 0.22, 0.05], new THREE.MeshStandardMaterial({ color: 0x222829, roughness: 0.45 }), [0, 0, 0]);
const doorbellLight = addRoundedCylinder(doorbell, 0.04, 0.02, new THREE.MeshStandardMaterial({ color: 0xf8d56b, emissive: 0xf8d56b, emissiveIntensity: 0.8 }), [0, 0, 0.04], [Math.PI / 2, 0, 0], 18);

const introGiftPhone = new THREE.Group();
introGroup.add(introGiftPhone);
addBox(introGiftPhone, [0.24, 0.42, 0.04], materials.dark, [0, 0, 0], [0, 0, 0]);
const introGiftScreen = addBox(introGiftPhone, [0.19, 0.32, 0.045], new THREE.MeshBasicMaterial({ color: 0x2cc7c0 }), [0, 0, 0.004]);

const introHands = new THREE.Group();
introHands.visible = false;
camera.add(introHands);
const introLeftHand = addRoundedCylinder(introHands, 0.032, 0.44, materials.skin, [-0.2, -0.48, -0.92], [1.0, 0, -0.48], 12);
const introRightHand = addRoundedCylinder(introHands, 0.032, 0.44, materials.skin, [0.2, -0.48, -0.92], [1.0, 0, 0.48], 12);
const introHeldPhone = new THREE.Group();
introHeldPhone.position.set(0, -0.36, -1.16);
introHeldPhone.rotation.set(-0.08, 0, 0);
introHands.add(introHeldPhone);
addBox(introHeldPhone, [0.25, 0.42, 0.045], materials.dark, [0, 0, 0]);
const introHeldScreen = addBox(introHeldPhone, [0.2, 0.33, 0.05], new THREE.MeshBasicMaterial({ color: 0x6bc7b8 }), [0, 0, 0.004]);

const introTextSteps = [
  { at: 0, title: 'Un regalo nuevo', text: 'A Marta, su hijo le regaló un celular.' },
  { at: 2.3, title: 'El timbre', text: 'Una tarde, su hijo llega a casa y toca el timbre.' },
  { at: 5.3, title: 'La puerta', text: 'Marta abre. Él trae el teléfono preparado para ella.' },
  { at: 8.3, title: 'Primer contacto', text: 'Marta recibe el celular. Desde ahora, ese objeto también trae decisiones, dudas y riesgos.' },
];

function makeTextSprite(text, options = {}) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = options.background || 'rgba(20,24,24,.86)';
  ctx.roundRect(12, 34, c.width - 24, c.height - 68, 22);
  ctx.fill();
  ctx.strokeStyle = options.border || 'rgba(255,255,255,.18)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = options.color || '#f4efe7';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > c.width - 96 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, c.width / 2, c.height / 2 - (lines.length - 1) * 22 + i * 44));
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 1.4, 1);
  sprite.userData.targetOpacity = 0;
  return sprite;
}

const warningSprites = [
  makeTextSprite('NO COMPARTIR CODIGOS', { background: 'rgba(90,20,20,.88)', border: 'rgba(255,110,96,.75)' }),
  makeTextSprite('ENLACE NO VERIFICADO', { background: 'rgba(81,61,22,.9)', border: 'rgba(247,178,103,.8)' }),
  makeTextSprite('DATOS SENSIBLES', { background: 'rgba(13,62,57,.9)', border: 'rgba(107,199,184,.8)' }),
  makeTextSprite('VERIFICAR IDENTIDAD', { background: 'rgba(56,38,77,.9)', border: 'rgba(206,158,255,.76)' }),
  makeTextSprite('ATENCION DIVIDIDA', { background: 'rgba(27,55,78,.9)', border: 'rgba(117,190,240,.75)' }),
];
warningSprites.forEach((sprite, i) => {
  sprite.position.set(-1.8 + i * 0.9, 2.2 + (i % 2) * 0.24, -1.45 - i * 0.32);
  alerts.add(sprite);
});

const alertRings = [];
for (let i = 0; i < 5; i++) {
  const ring = mesh(new THREE.TorusGeometry(0.48 + i * 0.18, 0.012, 12, 72), materials.warning.clone(), [0.92, 1.02 + i * 0.02, 0.08], [-Math.PI / 2, 0, 0], false, false);
  ring.userData.phase = i * 0.18;
  alertRings.push(ring);
  alerts.add(ring);
}

const codeBlocks = [];
for (let i = 0; i < 10; i++) {
  const block = addBox(alerts, [0.1 + Math.random() * 0.18, 0.04, 0.04], materials.warning.clone(), [1.6 + Math.random() * 1.7, 0.95 + Math.random() * 1.4, -0.7 + Math.random() * 1.8], [0, Math.random() * Math.PI, 0]);
  block.material.opacity = 0;
  block.userData.home = block.position.clone();
  codeBlocks.push(block);
}

outdoor.visible = false;
outdoor.add(mesh(new THREE.PlaneGeometry(12, 10), materials.street, [3.2, 0.018, -7.4], [-Math.PI / 2, 0, 0], false));
for (let i = 0; i < 5; i++) {
  const building = addBox(outdoor, [1.2 + Math.random() * 1.2, 2.2 + Math.random() * 1.8, 0.9], new THREE.MeshStandardMaterial({ color: [0x8aa1a7, 0xa88d6a, 0x6d8b78, 0xa97363][i % 4], roughness: 0.86 }), [-2.6 + i * 1.45, 1.1, -9.5]);
  for (let w = 0; w < 3; w++) {
    addBox(building, [0.18, 0.22, 0.02], new THREE.MeshStandardMaterial({ color: 0xf4cf86, emissive: 0xf2b75e, emissiveIntensity: 0.28 }), [-0.32 + w * 0.32, 0.36, 0.47]);
  }
}
addBox(outdoor, [0.12, 2.1, 0.12], materials.metal, [4.7, 1.05, -5.7]);
addBox(outdoor, [0.96, 0.48, 0.08], new THREE.MeshStandardMaterial({ color: 0x2d5267, roughness: 0.5, emissive: 0x16303d, emissiveIntensity: 0.2 }), [4.7, 2.08, -5.7]);

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

const phoneLight = new THREE.PointLight(0x37ddd2, 0.7, 5);
phoneLight.position.set(0.9, 1.25, 0.1);
scene.add(phoneLight);

const dangerLight = new THREE.PointLight(0xff5750, 0, 7);
dangerLight.position.set(0.5, 2.3, -1);
scene.add(dangerLight);

const doorState = {
  living: { open: false, group: livingDoorGroup, position: new THREE.Vector3(0.72, 0, -6.03), label: 'puerta del pasillo' },
  entry: { open: false, group: entryDoorGroup, position: new THREE.Vector3(1.4, 0, -10.55), label: 'puerta de entrada' },
};

const playerRadius = 0.28;

function inRect(x, z, rect) {
  return x > rect.minX + playerRadius && x < rect.maxX - playerRadius && z > rect.minZ + playerRadius && z < rect.maxZ - playerRadius;
}

function isPositionAllowed(x, z) {
  const living = { minX: -5.65, maxX: 5.65, minZ: -5.78, maxZ: 5.65 };
  const hall = { minX: -0.2, maxX: 5.65, minZ: -10.8, maxZ: -5.55 };
  const outside = { minX: -5.45, maxX: 5.45, minZ: -14.2, maxZ: -10.12 };

  if (inRect(x, z, living)) {
    if (z < -5.34 && x > -0.08 && x < 1.5) return doorState.living.open;
    if (z < -5.34 && (x <= -0.08 || x >= 1.5)) return false;
    return true;
  }

  if (inRect(x, z, hall)) {
    if (z > -5.98 && x > -0.08 && x < 1.5) return doorState.living.open;
    if (z > -5.98 && (x <= -0.08 || x >= 1.5)) return false;
    if (z < -10.18 && x > 0.84 && x < 1.95) return doorState.entry.open;
    if (z < -10.18) return false;
    return true;
  }

  if (state.outdoor && doorState.entry.open && inRect(x, z, outside)) return true;
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
  const fallback = state.outdoor ? new THREE.Vector3(1.4, 1.58, -9.8) : new THREE.Vector3(-0.85, 1.58, 3.25);
  camera.position.x = fallback.x;
  camera.position.z = fallback.z;
}

function setLookFromEuler() {
  camera.quaternion.setFromEuler(lookEuler);
}

function kickPlayerVelocity(direction, strength = 1.1) {
  const forward = new THREE.Vector3(-Math.sin(lookEuler.y), 0, -Math.cos(lookEuler.y));
  const right = new THREE.Vector3(Math.cos(lookEuler.y), 0, -Math.sin(lookEuler.y));
  if (direction === 'forward') player.velocity.addScaledVector(forward, strength);
  if (direction === 'back') player.velocity.addScaledVector(forward, -strength);
  if (direction === 'right') player.velocity.addScaledVector(right, strength);
  if (direction === 'left') player.velocity.addScaledVector(right, -strength);
  player.velocity.clampLength(0, 2.2);
}

function nudgePlayer(direction, amount = 0.08) {
  const forward = new THREE.Vector3(-Math.sin(lookEuler.y), 0, -Math.cos(lookEuler.y));
  const right = new THREE.Vector3(Math.cos(lookEuler.y), 0, -Math.sin(lookEuler.y));
  const next = camera.position.clone();
  if (direction === 'forward') next.addScaledVector(forward, amount);
  if (direction === 'back') next.addScaledVector(forward, -amount);
  if (direction === 'right') next.addScaledVector(right, amount);
  if (direction === 'left') next.addScaledVector(right, -amount);
  resolveMovement(next.x, next.z);
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

function toggleNearbyDoor() {
  const nearby = getNearbyDoor();
  if (!nearby) return;
  nearby.door.open = !nearby.door.open;
}

function updateDoors(dt) {
  let livingTarget = 0;
  if (state.introActive && getIntroTime() > 3.7) livingTarget = -Math.PI * 0.52;
  else if (doorState.living.open) livingTarget = -Math.PI * 0.52;
  doorState.living.group.rotation.y += (livingTarget - doorState.living.group.rotation.y) * Math.min(1, dt * 7);
  const entryTarget = doorState.entry.open ? Math.PI * 0.52 : 0;
  doorState.entry.group.rotation.y += (entryTarget - doorState.entry.group.rotation.y) * Math.min(1, dt * 7);

  const nearby = getNearbyDoor();
  if (nearby) {
    ui.doorPrompt.textContent = `E ${nearby.door.open ? 'Cerrar' : 'Abrir'} ${nearby.door.label}`;
    ui.doorPrompt.classList.add('is-visible');
  } else {
    ui.doorPrompt.classList.remove('is-visible');
  }
}

function easeInOut(t) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function getIntroTime() {
  if (state.introStartedAt === null) return 0;
  return clock.getElapsedTime() - state.introStartedAt;
}

function finishIntro() {
  state.introActive = false;
  state.introDone = true;
  introGroup.visible = false;
  introHands.visible = false;
  livingDoorGroup.visible = true;
  ui.introOverlay.classList.add('is-hidden');
  ui.app.classList.remove('is-intro');
  doorState.entry.open = false;
  doorState.living.open = false;
  camera.position.set(-0.85, 1.58, 3.25);
  lookEuler.set(-0.08, -0.28, 0);
  player.velocity.set(0, 0, 0);
  setLookFromEuler();
  document.body.focus();
}

function updateIntro(dt) {
  if (!state.introActive) return;
  const t = getIntroTime();

  const currentStep = introTextSteps.reduce((active, step) => (t >= step.at ? step : active), introTextSteps[0]);
  ui.introTitle.textContent = currentStep.title;
  ui.introText.textContent = currentStep.text;
  livingDoorGroup.visible = t < 4.65;

  const camA = new THREE.Vector3(-1.1, 1.55, -3.88);
  const camB = new THREE.Vector3(0.42, 1.52, -4.5);
  const camC = new THREE.Vector3(1.48, 1.48, -5.12);
  const introTargetA = new THREE.Vector3(0.58, 1.08, -6.62);
  const introTargetB = new THREE.Vector3(0.74, 1.1, -6.92);
  const introCameraTarget = new THREE.Vector3().lerpVectors(introTargetA, introTargetB, easeInOut((t - 4.2) / 3.2));
  if (t < 4.5) {
    camera.position.lerpVectors(camA, camB, easeInOut(t / 4.5));
  } else {
    camera.position.lerpVectors(camB, camC, easeInOut((t - 4.5) / 5.2));
  }
  camera.lookAt(introCameraTarget);
  lookEuler.setFromQuaternion(camera.quaternion);

  const bellPulse = t > 1.8 && t < 3.2 ? 1 + Math.sin(t * 18) * 0.55 : 0.45;
  doorbellLight.material.emissiveIntensity = bellPulse;
  introSon.userData.rightArm.rotation.set(0.95, 0.08, -1.2 + Math.sin(t * 18) * 0.14);

  const martaWalk = easeInOut((t - 3.4) / 2.4);
  introMarta.position.x = THREE.MathUtils.lerp(-1.7, -0.36, martaWalk);
  introMarta.position.z = THREE.MathUtils.lerp(-4.25, -5.1, martaWalk);
  introMarta.rotation.y = -0.05 + martaWalk * 0.12 + Math.sin(t * 0.8) * 0.04;

  const offer = easeInOut((t - 6.6) / 2.2);
  introSon.userData.leftArm.rotation.set(1.1, 0.08, 0.9 - offer * 1.35);
  introMarta.userData.rightArm.rotation.set(0.85, 0, -0.24 - offer * 0.72);
  const from = new THREE.Vector3(0.46, 1.12, -6.5);
  const to = new THREE.Vector3(0.12, 1.08, -5.46);
  introGiftPhone.position.lerpVectors(from, to, offer);
  introGiftPhone.rotation.set(0.08, -0.12, Math.sin(t * 2) * 0.05);
  introGiftScreen.material.color.set(t > 8.1 ? 0x6bc7b8 : 0x2cc7c0);
  introGiftPhone.visible = t < 8.65;

  const receive = easeInOut((t - 8.25) / 1.35);
  introHands.visible = receive > 0.02;
  introHands.position.y = THREE.MathUtils.lerp(0.32, 0, receive);
  introHands.position.z = THREE.MathUtils.lerp(-0.22, 0, receive);
  introHands.rotation.x = THREE.MathUtils.lerp(0.24, 0, receive);
  introHands.scale.setScalar(THREE.MathUtils.lerp(0.82, 1, receive));
  introLeftHand.rotation.z = -0.48 - receive * 0.14;
  introRightHand.rotation.z = 0.48 + receive * 0.14;
  introHeldScreen.material.color.set(t > 9.2 ? 0x8de8d9 : 0x6bc7b8);

  if (t > 12.2) finishIntro();
}

function updateVisionStress(dt, elapsed) {
  state.visualStress += (state.targetVisualStress - state.visualStress) * Math.min(1, dt * 2.4);
  const stress = THREE.MathUtils.clamp(state.visualStress, 0, 1);
  const riskPulse = state.risk / 100;

  document.documentElement.style.setProperty('--vision-blur', `${(stress * 4.8).toFixed(2)}px`);
  document.documentElement.style.setProperty('--vision-brightness', (1 - stress * 0.18).toFixed(3));
  document.documentElement.style.setProperty('--vision-contrast', (1 + stress * 0.28).toFixed(3));
  document.documentElement.style.setProperty('--vision-saturate', (1 - stress * 0.34).toFixed(3));
  document.documentElement.style.setProperty('--vision-vignette', (0.12 + stress * 0.68).toFixed(3));
  document.documentElement.style.setProperty('--vision-noise', (0.04 + stress * 0.34).toFixed(3));
  document.documentElement.style.setProperty('--vision-alert', (riskPulse * stress).toFixed(3));

  const targetFov = 52 - stress * 14;
  if (Math.abs(camera.fov - targetFov) > 0.02) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 2.2);
    camera.updateProjectionMatrix();
  }

  scene.fog.near = 8 - stress * 4.3;
  scene.fog.far = 28 - stress * 13.5;
  renderer.toneMappingExposure = 1.05 - stress * 0.18 + Math.sin(elapsed * 11) * stress * riskPulse * 0.035;
}

function updateFirstPerson(dt, elapsed) {
  if (state.introActive) {
    player.velocity.set(0, 0, 0);
    return;
  }
  const movement = new THREE.Vector3();
  const forward = new THREE.Vector3(-Math.sin(lookEuler.y), 0, -Math.cos(lookEuler.y));
  const right = new THREE.Vector3(Math.cos(lookEuler.y), 0, -Math.sin(lookEuler.y));

  const now = performance.now();
  if (moveState.forward || moveImpulseUntil.forward > now) movement.add(forward);
  if (moveState.back || moveImpulseUntil.back > now) movement.sub(forward);
  if (moveState.right || moveImpulseUntil.right > now) movement.add(right);
  if (moveState.left || moveImpulseUntil.left > now) movement.sub(right);

  const stress = THREE.MathUtils.clamp(state.visualStress, 0, 1);
  const speed = 2.45 - stress * 0.42;
  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed);
    player.velocity.lerp(movement, Math.min(1, dt * 5.5));
    player.walkBob += dt * (6.2 - stress * 1.35);
  } else {
    player.velocity.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, dt * 6.5));
  }

  const nextX = camera.position.x + player.velocity.x * dt;
  const nextZ = camera.position.z + player.velocity.z * dt;
  resolveMovement(nextX, nextZ);

  const bob = Math.sin(player.walkBob) * Math.min(0.052, player.velocity.length() * 0.024);
  const stressWobble = Math.sin(elapsed * 2.2) * stress * 0.018 + Math.sin(elapsed * 9.2) * stress * (state.risk / 100) * 0.006;
  camera.position.y = 1.58 + bob + stressWobble;
  lookEuler.z = Math.sin(elapsed * 3.1) * stress * 0.018;
  setLookFromEuler();
}

function applyScenario(name) {
  const data = scenarios[name] || scenarios.reset;
  state.scenario = name;
  state.risk = data.risk;
  state.phonePulse = 1;
  state.targetPhoneReveal = name === 'reset' ? 0 : 1;
  state.phoneReveal = name === 'reset' ? Math.min(state.phoneReveal, 0.15) : Math.max(state.phoneReveal, 0.78);
  state.outdoor = name === 'street';
  outdoor.visible = state.outdoor;
  const scenarioStress = data.risk / 100;
  state.targetVisualStress = name === 'reset'
    ? 0.12
    : Math.min(1, Math.max(state.targetVisualStress, scenarioStress * 0.72) + 0.08);
  if (name === 'reset') {
    state.visualStress = Math.min(state.visualStress, 0.32);
  } else {
    state.visualStress = Math.min(state.targetVisualStress, state.visualStress + 0.2);
  }
  if (name === 'street' && camera.position.z > -3.6) {
    camera.position.set(2.75, 1.58, -6.8);
    lookEuler.y = 0.1;
    lookEuler.x = -0.08;
  }
  if (name === 'reset' && camera.position.z < -10.7) {
    camera.position.set(-0.85, 1.58, 3.25);
    lookEuler.y = -0.28;
    lookEuler.x = -0.13;
  }
  clampPlayerToBounds();

  ui.riskFill.style.width = `${data.risk}%`;
  ui.riskValue.textContent = `${data.risk}%`;
  ui.screenLabel.textContent = data.label;
  ui.screenTitle.textContent = data.title;
  ui.screenBody.textContent = data.body;
  ui.eventKicker.textContent = data.kicker;
  ui.eventTitle.textContent = data.eventTitle;
  ui.eventDescription.textContent = data.description;
  ui.pressureValue.textContent = data.pressure;
  ui.privacyValue.textContent = data.privacy;
  ui.trustValue.textContent = data.trust;
  ui.phoneScreen.style.background = `linear-gradient(155deg, ${data.colorA}, ${data.colorB})`;

  warningSprites.forEach((sprite) => {
    sprite.userData.targetOpacity = sprite.material.map ? 0 : 0;
    sprite.material.opacity = 0;
  });

  const warningIndex = ['call', 'sms', 'bank', 'family', 'street'].indexOf(name);
  if (warningIndex >= 0) warningSprites[warningIndex].userData.targetOpacity = 1;

  const danger = Math.max(0, (data.risk - 20) / 80);
  dangerLight.intensity = danger * 2.4;
  phoneGlow.material.emissive.set(name === 'reset' ? 0x2cc7c0 : 0xff7b5e);
  phoneGlow.material.emissiveIntensity = 0.25 + danger * 1.15;
  handPhoneGlow.material.color.set(data.colorA);
  handPhoneGlow.material.emissive.set(name === 'reset' ? 0x2cc7c0 : 0xff7b5e);
  handPhoneGlow.material.emissiveIntensity = 0.85 + danger * 2.1;
  heldPhoneScreen.material.color.set(name === 'reset' ? 0x2cc7c0 : data.colorB);
}

document.querySelectorAll('[data-scenario]').forEach((button) => {
  button.addEventListener('click', () => applyScenario(button.dataset.scenario));
});

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
  state.lastKey = {
    code: event.code,
    key: event.key,
    active,
  };
  if (active && isDoorKey(event)) {
    event.preventDefault();
    toggleNearbyDoor();
    return;
  }
  const key = getMoveDirection(event);
  if (!key) return;
  event.preventDefault();
  moveState[key] = active;
  if (active) {
    moveImpulseUntil[key] = performance.now() + 900;
    kickPlayerVelocity(key);
    nudgePlayer(key);
  }
}

document.addEventListener('keydown', (event) => handleMoveKey(event, true), { capture: true });
document.addEventListener('keyup', (event) => handleMoveKey(event, false), { capture: true });
window.addEventListener('keydown', (event) => handleMoveKey(event, true), { capture: true });
window.addEventListener('keyup', (event) => handleMoveKey(event, false), { capture: true });

function bindWalkButton(id, direction) {
  const button = document.querySelector(`#${id}`);
  const setActive = (active) => {
    moveState[direction] = active;
    if (active) {
      moveImpulseUntil[direction] = performance.now() + 900;
      kickPlayerVelocity(direction);
      nudgePlayer(direction);
    }
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
  if (state.introActive) return;
  canvas.focus();
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(phoneGroup.children, true)[0];
  if (hit) {
    const next = state.scenario === 'call' ? 'sms' : state.scenario === 'sms' ? 'bank' : 'call';
    applyScenario(next);
  }
  player.dragging = true;
  player.lastX = event.clientX;
  player.lastY = event.clientY;
});

ui.skipIntro.addEventListener('click', finishIntro);

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

applyScenario('reset');
state.introStartedAt = clock.getElapsedTime();
ui.app.classList.add('is-intro');
window.__experienceDebug = {
  finishIntro,
  setMove: (direction, active) => {
    if (direction in moveState) moveState[direction] = active;
  },
  walkFor: (seconds = 0.7) => {
    moveState.forward = true;
    const steps = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < steps; i += 1) updateFirstPerson(1 / 60, performance.now() / 1000 + i / 60);
    moveState.forward = false;
  },
  getState: () => ({
    scenario: state.scenario,
    introActive: state.introActive,
    introTime: getIntroTime(),
    risk: state.risk,
    visualStress: state.visualStress,
    targetVisualStress: state.targetVisualStress,
    phoneReveal: state.phoneReveal,
    phoneVisible: handPhone.visible,
    phoneProjection: handPhone.position.clone().project(camera),
    lastKey: state.lastKey,
    doors: {
      living: doorState.living.open,
      entry: doorState.entry.open,
    },
    camera: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    look: {
      x: lookEuler.x,
      y: lookEuler.y,
    },
    move: { ...moveState },
  }),
};

function animate() {
  const elapsed = clock.getElapsedTime();
  const dt = clock.getDelta();
  updateIntro(dt);
  updateVisionStress(dt, elapsed);
  updateFirstPerson(dt, elapsed);
  updateDoors(dt);

  state.phonePulse = Math.max(0, state.phonePulse - dt * 0.85);
  const riskPulse = state.risk / 100;
  state.phoneReveal += (state.targetPhoneReveal - state.phoneReveal) * Math.min(1, dt * 5.2);
  handPhone.visible = state.phoneReveal > 0.025;
  camera.updateMatrixWorld(true);
  const handOffset = new THREE.Vector3(0.16, -0.34 + state.phoneReveal * 0.24 + Math.sin(elapsed * 7) * 0.008 * riskPulse, -1.18);
  handPhone.position.copy(camera.localToWorld(handOffset));
  const handRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6 + state.phoneReveal * 0.18, -0.18 + Math.sin(elapsed * 2) * 0.012 * riskPulse, 0.08, 'XYZ'));
  handPhone.quaternion.copy(camera.quaternion).multiply(handRotation);

  const phoneWorld = new THREE.Vector3();
  handPhone.getWorldPosition(phoneWorld);
  phoneLight.position.copy(phoneWorld);
  phoneLight.intensity = state.phoneReveal * (0.45 + riskPulse * 1.15 + Math.sin(elapsed * 8) * 0.12 * riskPulse);

  alertRings.forEach((ring) => {
    const wave = (elapsed * 0.38 + ring.userData.phase) % 1;
    const scale = 0.5 + wave * (1.6 + riskPulse);
    ring.position.copy(phoneWorld);
    ring.position.y += 0.08;
    ring.scale.setScalar(scale);
    ring.material.opacity = state.scenario === 'reset' ? 0 : (1 - wave) * riskPulse * 0.56;
    ring.rotation.set(camera.rotation.x - Math.PI / 2, camera.rotation.y, ring.rotation.z + dt * (0.4 + riskPulse));
  });

  codeBlocks.forEach((block, i) => {
    block.position.y = block.userData.home.y + Math.sin(elapsed * 1.5 + i) * 0.12;
    block.rotation.y += dt * (0.25 + riskPulse);
    block.material.opacity = ['sms', 'bank'].includes(state.scenario) ? 0.18 + riskPulse * 0.44 : 0;
  });

  warningSprites.forEach((sprite, i) => {
    sprite.material.opacity += (sprite.userData.targetOpacity - sprite.material.opacity) * Math.min(1, dt * 5);
    sprite.position.y += Math.sin(elapsed * 1.2 + i) * 0.0009;
  });

  const familyGlow = state.scenario === 'family' ? 0.45 + Math.sin(elapsed * 3) * 0.2 : 0;
  room.traverse((child) => {
    if (child.isMesh && child.material && child.material.color && child.geometry.type === 'BoxGeometry') {
      if (child.userData.familyAsset) child.material.emissiveIntensity = familyGlow;
    }
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
