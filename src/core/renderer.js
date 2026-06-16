import * as THREE from 'three';

export const canvas = document.querySelector('#experience');
document.body.tabIndex = 0;
document.body.focus();
canvas.tabIndex = 0;

export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xabe3f8);
scene.fog = new THREE.Fog(0xabe3f8, 12, 45);

export const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(-0.85, 1.58, 3.25);
scene.add(camera);

export const clock = new THREE.Clock();
export const lookEuler = new THREE.Euler(-0.08, -0.28, 0, 'YXZ');

const ambient = new THREE.HemisphereLight(0xfff6e8, 0x3b4b48, 1.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff0c4, 5.0);
sun.position.set(2, 5.5, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 25;
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);

const interiorBounce = new THREE.DirectionalLight(0xfff8f0, 1.1);
interiorBounce.position.set(-1, 3, -1);
scene.add(interiorBounce);

const kitchenLight = new THREE.PointLight(0xffdca8, 2.0, 12);
kitchenLight.position.set(-3.5, 2.0, 4.5);
scene.add(kitchenLight);

const windowLight = new THREE.RectAreaLight(0xdff7ff, 4.2, 2.8, 2.2);
windowLight.position.set(2.5, 2.3, 1.0);
windowLight.lookAt(0, 1.5, 0);
scene.add(windowLight);

export function initResizeListener(onResize) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (onResize) onResize();
  });
}

export const timeOfDayState = {
  current: 'dia',
  target: 'dia',
  transitionProgress: 1.0,
  transitionDuration: 3.0,
};

const configs = {
  dia: {
    sunColor: new THREE.Color(0xfff0c4),
    sunIntensity: 5.0,
    sunPosition: new THREE.Vector3(2, 5.5, 2.5),
    ambientColorSky: new THREE.Color(0xfff6e8),
    ambientColorGround: new THREE.Color(0x3b4b48),
    ambientIntensity: 1.25,
    windowColor: new THREE.Color(0xdff7ff),
    windowIntensity: 4.2,
    skyColor: new THREE.Color(0xabe3f8),
    fogNear: 12,
    fogFar: 45,
  },
  tarde: {
    sunColor: new THREE.Color(0xff7a45),
    sunIntensity: 2.5,
    sunPosition: new THREE.Vector3(5, 2.5, 1.5),
    ambientColorSky: new THREE.Color(0xffd8b3),
    ambientColorGround: new THREE.Color(0x302520),
    ambientIntensity: 0.9,
    windowColor: new THREE.Color(0xffaa66),
    windowIntensity: 2.5,
    skyColor: new THREE.Color(0xfa8d62),
    fogNear: 10,
    fogFar: 40,
  },
  noche: {
    sunColor: new THREE.Color(0x7dd3fc),
    sunIntensity: 0.3,
    sunPosition: new THREE.Vector3(-2, 6, -2.5),
    ambientColorSky: new THREE.Color(0x1e293b),
    ambientColorGround: new THREE.Color(0x0b0f19),
    ambientIntensity: 0.25,
    windowColor: new THREE.Color(0x1e3a8a),
    windowIntensity: 0.5,
    skyColor: new THREE.Color(0x0c0f1d),
    fogNear: 6,
    fogFar: 30,
  }
};

let prevConfig = { ...configs.dia };
let targetConfig = { ...configs.dia };

export function setTimeOfDay(time, duration = 3.0) {
  if (!configs[time]) return;

  prevConfig = {
    sunColor: sun.color.clone(),
    sunIntensity: sun.intensity,
    sunPosition: sun.position.clone(),
    ambientColorSky: ambient.color.clone(),
    ambientColorGround: ambient.groundColor.clone(),
    ambientIntensity: ambient.intensity,
    windowColor: windowLight.color.clone(),
    windowIntensity: windowLight.intensity,
    skyColor: scene.background.clone(),
    fogNear: scene.fog ? scene.fog.near : 12,
    fogFar: scene.fog ? scene.fog.far : 45,
  };

  targetConfig = configs[time];
  timeOfDayState.current = timeOfDayState.target;
  timeOfDayState.target = time;

  if (duration <= 0) {
    timeOfDayState.transitionProgress = 1.0;
    sun.color.copy(targetConfig.sunColor);
    sun.intensity = targetConfig.sunIntensity;
    sun.position.copy(targetConfig.sunPosition);
    ambient.color.copy(targetConfig.ambientColorSky);
    ambient.groundColor.copy(targetConfig.ambientColorGround);
    ambient.intensity = targetConfig.ambientIntensity;
    windowLight.color.copy(targetConfig.windowColor);
    windowLight.intensity = targetConfig.windowIntensity;
    scene.background.copy(targetConfig.skyColor);
    if (scene.fog) {
      scene.fog.color.copy(targetConfig.skyColor);
      scene.fog.near = targetConfig.fogNear;
      scene.fog.far = targetConfig.fogFar;
    }
  } else {
    timeOfDayState.transitionProgress = 0.0;
    timeOfDayState.transitionDuration = duration;
  }
}

export function updateTimeOfDay(dt) {
  if (timeOfDayState.transitionProgress >= 1.0) return;

  timeOfDayState.transitionProgress += dt / timeOfDayState.transitionDuration;
  if (timeOfDayState.transitionProgress > 1.0) {
    timeOfDayState.transitionProgress = 1.0;
  }

  const t = timeOfDayState.transitionProgress;
  const ease = t * t * (3 - 2 * t);

  sun.color.lerpColors(prevConfig.sunColor, targetConfig.sunColor, ease);
  sun.intensity = THREE.MathUtils.lerp(prevConfig.sunIntensity, targetConfig.sunIntensity, ease);
  sun.position.lerpVectors(prevConfig.sunPosition, targetConfig.sunPosition, ease);

  ambient.color.lerpColors(prevConfig.ambientColorSky, targetConfig.ambientColorSky, ease);
  ambient.groundColor.lerpColors(prevConfig.ambientColorGround, targetConfig.ambientColorGround, ease);
  ambient.intensity = THREE.MathUtils.lerp(prevConfig.ambientIntensity, targetConfig.ambientIntensity, ease);

  windowLight.color.lerpColors(prevConfig.windowColor, targetConfig.windowColor, ease);
  windowLight.intensity = THREE.MathUtils.lerp(prevConfig.windowIntensity, targetConfig.windowIntensity, ease);

  scene.background.lerpColors(prevConfig.skyColor, targetConfig.skyColor, ease);
  if (scene.fog) {
    scene.fog.color.copy(scene.background);
    scene.fog.near = THREE.MathUtils.lerp(prevConfig.fogNear, targetConfig.fogNear, ease);
    scene.fog.far = THREE.MathUtils.lerp(prevConfig.fogFar, targetConfig.fogFar, ease);
  }
}
