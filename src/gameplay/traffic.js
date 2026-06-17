import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCarEngineSound } from '../audio/sounds.js';

let sceneRef = null;
let carTemplates = [];
let activeCars = [];
let spawnTimer = 5.0; // spawn first car 5 seconds after start
let loaded = false;

export function initTraffic(scene) {
  sceneRef = scene;
  carTemplates = [];
  activeCars = [];
  spawnTimer = 4.0 + Math.random() * 6.0; // spawn first car in 4-10 seconds
  loaded = false;

  const loader = new GLTFLoader();
  loader.load(
    '/low_poly_cars.glb',
    (gltf) => {
      let rootNode = null;
      gltf.scene.traverse((child) => {
        if (child.name === 'RootNode') {
          rootNode = child;
        }
      });

      if (!rootNode) {
        console.error('RootNode not found in low_poly_cars.glb');
        return;
      }

      rootNode.children.forEach((carGroup) => {
        const car = carGroup.clone();
        
        // Set rotation order to YXZ so Y rotation (yaw) is applied before X rotation (pitch)
        car.rotation.order = 'YXZ';
        car.rotation.x = -Math.PI / 2;
        car.updateMatrixWorld(true);

        // Measure raw bounding box to see if it's aligned along Z
        const rawBox = new THREE.Box3().setFromObject(car);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);

        if (rawSize.z > rawSize.x) {
          // Adjust rotation so the car faces +X (using Math.PI / 2 to point the front forward)
          car.rotation.y = Math.PI / 2;
          car.updateMatrixWorld(true);
        }

        // Measure final bounding box for centering and scaling
        const box = new THREE.Box3().setFromObject(car);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const centered = new THREE.Group();
        car.position.sub(center);
        centered.add(car);
        
        // Normalize size so that length along X is ~3.8 units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 3.8 / maxDim;
        centered.scale.setScalar(scaleFactor);
        
        // Store yOffset in userData to lift the car above ground when spawned
        const yOffset = (size.y * scaleFactor) / 2;
        centered.userData.yOffset = yOffset;

        // Enable shadows
        centered.traverse((childNode) => {
          if (childNode.isMesh) {
            childNode.castShadow = true;
            childNode.receiveShadow = true;
            if (childNode.material) {
              childNode.material.side = THREE.DoubleSide;
            }
          }
        });
        
        carTemplates.push(centered);
      });

      console.log(`Traffic system initialized with ${carTemplates.length} car templates.`);
      loaded = true;
    },
    undefined,
    (err) => {
      console.error('Error loading low_poly_cars.glb:', err);
    }
  );
}

export function updateTraffic(dt, camera) {
  if (!loaded || !sceneRef) return;

  // Spawning logic
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    // If a car is already in play, delay spawning the next one to keep it calm ("muy tranquilo")
    if (activeCars.length >= 1) {
      spawnTimer = 5.0 + Math.random() * 8.0;
    } else {
      spawnCar();
      spawnTimer = 16.0 + Math.random() * 14.0; // next car in 16-30s
    }
  }

  // Update existing cars
  const cameraPos = camera.position;
  for (let i = activeCars.length - 1; i >= 0; i--) {
    const car = activeCars[i];
    
    // Move car
    car.mesh.position.x += car.direction * car.speed * dt;
    
    // Update spatial audio
    if (car.sound) {
      car.sound.updatePosition(car.mesh.position, cameraPos);
    }
    
    // Check out of bounds (road is 40 units long, so -35 to 35)
    if ((car.direction === 1 && car.mesh.position.x > 35) || 
        (car.direction === -1 && car.mesh.position.x < -35)) {
      
      // Stop and clean up sound
      if (car.sound) car.sound.stop();
      
      // Remove mesh
      sceneRef.remove(car.mesh);
      
      // Remove from array
      activeCars.splice(i, 1);
    }
  }
}

function spawnCar() {
  if (carTemplates.length === 0 || !sceneRef) return;

  // Decide direction and lane
  // Lane 1: Z = -16.53 (Further lane, goes Left to Right: direction = 1)
  // Lane 2: Z = -12.53 (Closer lane, goes Right to Left: direction = -1)
  const direction = Math.random() < 0.5 ? 1 : -1;
  const zPos = direction === 1 ? -16.53 : -12.53;
  const xPos = direction === 1 ? -35 : 35;
  const rotationY = direction === 1 ? 0 : Math.PI;

  // Pick random car template
  const templateIdx = Math.floor(Math.random() * carTemplates.length);
  const template = carTemplates[templateIdx];
  const carMesh = template.clone();

  // Position and rotate (use yOffset from template to make it sit exactly on top of the road)
  const yOffset = template.userData.yOffset || 0.4;
  carMesh.position.set(xPos, 0.015 + yOffset, zPos);
  carMesh.rotation.y = rotationY;

  sceneRef.add(carMesh);

  // Synthesize procedural spatial audio engine sound
  const sound = createCarEngineSound();
  
  activeCars.push({
    mesh: carMesh,
    speed: 6.5 + Math.random() * 2.5, // 6.5 to 9.0 units/sec
    direction: direction,
    sound: sound
  });

  console.log(`Spawned car model ${templateIdx} on lane Z=${zPos} moving direction=${direction}`);
}
