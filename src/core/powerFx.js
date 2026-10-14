import * as THREE from "three";
import { ParticleSystem } from "./particles.js";
import {
  getUnitBoxGeometry,
  getOctahedronGeometry,
  getDodecahedronGeometry,
  getIcosahedronGeometry,
  getDiscGeometry,
} from "./shapes.js";

const SYSTEM_SPECS = {
  sparks: { geometry: getUnitBoxGeometry, additive: true, capacity: 700 },
  glow: { geometry: getIcosahedronGeometry, additive: true, capacity: 300 },
  smoke: { geometry: getDodecahedronGeometry, additive: false, capacity: 320 },
  debris: { geometry: getDodecahedronGeometry, additive: false, capacity: 260 },
  shards: { geometry: getOctahedronGeometry, additive: false, capacity: 300 },
  decals: { geometry: getDiscGeometry, additive: false, capacity: 80 },
  glowDecals: { geometry: getDiscGeometry, additive: true, capacity: 80 },
};

const sphereGeometry = new THREE.SphereGeometry(1, 20, 14);
const domeGeometry = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const pillarGeometry = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
const ringGeometry = new THREE.RingGeometry(0.86, 1, 48);
ringGeometry.rotateX(-Math.PI / 2);

export function spread(amount) {
  return (Math.random() - 0.5) * 2 * amount;
}

export function between(min, max) {
  return min + Math.random() * (max - min);
}

export function fxSystem(scene, key) {
  if (!scene.userData.powerFxSystems) {
    scene.userData.powerFxSystems = new Map();
  }
  const systems = scene.userData.powerFxSystems;
  let system = systems.get(key);
  if (!system) {
    const spec = SYSTEM_SPECS[key];
    system = new ParticleSystem(scene, {
      geometry: spec.geometry(),
      capacity: spec.capacity,
      additive: spec.additive,
    });
    systems.set(key, system);
  }
  return system;
}

export function updatePowerFx(scene, delta) {
  const systems = scene.userData.powerFxSystems;
  if (!systems) {
    return;
  }
  for (const system of systems.values()) {
    system.update(delta);
  }
}

export function disposePowerFx(scene) {
  const systems = scene.userData.powerFxSystems;
  if (!systems) {
    return;
  }
  for (const system of systems.values()) {
    system.dispose();
  }
  systems.clear();
}

export function emitBurst(scene, key, count, build) {
  const system = fxSystem(scene, key);
  for (let index = 0; index < count; index++) {
    system.emit(build(index));
  }
}

export function shake(scene, duration, intensity) {
  scene._triggerScreenShake?.(duration, intensity);
}

function addTimedMesh(scene, mesh, duration, animate) {
  scene.add(mesh);
  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      animate(t, time);
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.material.dispose();
    },
  });
}

function additiveMaterial(color, opacity, side = THREE.FrontSide) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side,
    blending: THREE.AdditiveBlending,
  });
}

export function spawnExpandingSphere(scene, origin, options) {
  const {
    color,
    radius,
    duration = 0.4,
    opacity = 0.7,
    startScale = 0.2,
    y = 0.6,
    dome = false,
  } = options;
  const mesh = new THREE.Mesh(
    dome ? domeGeometry : sphereGeometry,
    additiveMaterial(color, opacity, dome ? THREE.DoubleSide : THREE.FrontSide)
  );
  mesh.position.set(origin.x, dome ? 0.02 : y, origin.z);
  mesh.scale.setScalar(startScale);
  addTimedMesh(scene, mesh, duration, (t) => {
    const eased = 1 - Math.pow(1 - t, 3);
    mesh.scale.setScalar(startScale + (radius - startScale) * eased);
    if (dome) {
      mesh.scale.y *= 0.55;
    }
    mesh.material.opacity = opacity * (1 - t) * (1 - t);
  });
}

export function spawnGroundRing(scene, origin, options) {
  const { color, radius, duration = 0.5, opacity = 0.9, startRadius = 0.2 } = options;
  const mesh = new THREE.Mesh(ringGeometry, additiveMaterial(color, opacity, THREE.DoubleSide));
  mesh.position.set(origin.x, 0.06, origin.z);
  addTimedMesh(scene, mesh, duration, (t) => {
    const eased = 1 - Math.pow(1 - t, 2.5);
    mesh.scale.setScalar(startRadius + (radius - startRadius) * eased);
    mesh.material.opacity = opacity * (1 - t);
  });
}

export function spawnLightPillar(scene, origin, options) {
  const { color, radius = 0.8, height = 8, duration = 0.6, opacity = 0.6 } = options;
  const mesh = new THREE.Mesh(pillarGeometry, additiveMaterial(color, opacity, THREE.DoubleSide));
  mesh.position.set(origin.x, height / 2, origin.z);
  mesh.scale.set(radius, height, radius);
  addTimedMesh(scene, mesh, duration, (t) => {
    const width = radius * (1 - t * 0.7);
    mesh.scale.set(width, height, width);
    mesh.material.opacity = opacity * (1 - t);
  });
}

export function spawnScorch(scene, origin, radius, color = 0x1a120e, life = 2.4) {
  fxSystem(scene, "decals").emit({
    x: origin.x,
    y: 0.025 + Math.random() * 0.01,
    z: origin.z,
    rx: 0,
    ry: Math.random() * Math.PI,
    rz: 0,
    life,
    size: radius * 2,
    color,
    alpha: 0.7,
    fadeOut: 0.5,
  });
}

export function spawnGroundGlow(scene, origin, radius, color, life = 0.8, intensity = 1.6) {
  fxSystem(scene, "glowDecals").emit({
    x: origin.x,
    y: 0.04,
    z: origin.z,
    rx: 0,
    ry: 0,
    rz: 0,
    life,
    size: radius * 2,
    sizeEnd: radius * 2.3,
    color,
    intensity,
    alpha: 0.8,
    fadeOut: 0.8,
  });
}

export function spawnExplosion(scene, origin, options = {}) {
  const {
    radius = 3,
    color = 0xff7a26,
    hotColor = 0xfff1a8,
    smokeColor = 0x3a3431,
    debrisColor = 0x3a2e28,
    power = 1,
  } = options;
  const size = Math.max(radius / 3, 0.5);

  spawnExpandingSphere(scene, origin, {
    color: hotColor,
    radius: radius * 0.45,
    duration: 0.18,
    opacity: 1,
    y: 0.8 * size,
  });
  spawnExpandingSphere(scene, origin, {
    color,
    radius: radius * 0.8,
    duration: 0.45,
    opacity: 0.7,
    y: 0.7 * size,
  });
  spawnGroundRing(scene, origin, { color, radius: radius * 1.05, duration: 0.45 });
  spawnGroundGlow(scene, origin, radius * 0.8, color, 0.5, 2);
  spawnScorch(scene, origin, radius * 0.55);

  emitBurst(scene, "glow", Math.round(10 * power), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(1, 3.5) * size;
    return {
      x: origin.x + spread(0.3 * size),
      y: 0.6 * size,
      z: origin.z + spread(0.3 * size),
      vx: Math.cos(angle) * speed,
      vy: between(1.5, 4) * size,
      vz: Math.sin(angle) * speed,
      drag: 3.5,
      gravity: -1,
      life: between(0.35, 0.6),
      size: between(0.6, 1) * size,
      sizeEnd: 0.1,
      color: hotColor,
      colorEnd: color,
      intensity: 2.2,
      fadeOut: 0.7,
    };
  });

  emitBurst(scene, "sparks", Math.round(26 * power), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(5, 12) * Math.sqrt(size);
    return {
      x: origin.x,
      y: 0.5,
      z: origin.z,
      vx: Math.cos(angle) * speed,
      vy: between(2, 7),
      vz: Math.sin(angle) * speed,
      gravity: 14,
      drag: 1.2,
      life: between(0.35, 0.7),
      size: between(0.06, 0.12),
      sizeEnd: 0.02,
      shapeZ: 3,
      rx: 0,
      ry: Math.PI / 2 - angle,
      rz: 0,
      color: hotColor,
      colorEnd: color,
      intensity: 2.6,
    };
  });

  emitBurst(scene, "smoke", Math.round(9 * power), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(0.8, 2.2) * size;
    return {
      x: origin.x + spread(0.5 * size),
      y: between(0.3, 0.9) * size,
      z: origin.z + spread(0.5 * size),
      vx: Math.cos(angle) * speed,
      vy: between(0.8, 1.8),
      vz: Math.sin(angle) * speed,
      drag: 1.8,
      gravity: -0.5,
      life: between(0.9, 1.5),
      size: 0.5 * size,
      sizeEnd: 1.4 * size,
      color: smokeColor,
      colorEnd: 0x18161a,
      alpha: 0.75,
      spinX: spread(1.5),
      spinY: spread(1.5),
      fadeOut: 0.7,
    };
  });

  emitBurst(scene, "debris", Math.round(8 * power), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(3, 7) * Math.sqrt(size);
    return {
      x: origin.x,
      y: 0.4,
      z: origin.z,
      vx: Math.cos(angle) * speed,
      vy: between(4, 8),
      vz: Math.sin(angle) * speed,
      gravity: 18,
      life: between(0.6, 0.9),
      size: between(0.12, 0.28) * Math.sqrt(size),
      color: debrisColor,
      spinX: spread(10),
      spinY: spread(10),
      fadeOut: 0.3,
    };
  });

  shake(scene, 0.22 + 0.08 * size, 0.18 + 0.12 * size);
}
