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
