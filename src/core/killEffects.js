import { ParticleSystem } from "./particles.js";
import {
  getUnitBoxGeometry,
  getDodecahedronGeometry,
  getIcosahedronGeometry,
  getHeartGeometry,
} from "./shapes.js";

export const KILL_EFFECT_IDS = ["pixels", "confetti", "explosion", "hearts"];

const CONFETTI_COLORS = [0xff4d6d, 0xffd23e, 0x4dd2ff, 0x7cff6b, 0xc77dff, 0xff9f1c];
const EXPLOSION_COLORS = [0xfff1a8, 0xffb347, 0xff6a1f, 0x3a3431];
const FIRE_COLORS = [0xfff1a8, 0xffd27a, 0xffb347];
const HEART_COLORS = [0xff4d8d, 0xff7aa8, 0xff2d55];

function spread(amount) {
  return (Math.random() - 0.5) * 2 * amount;
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const STYLES = {
  pixels: {
    geometry: getUnitBoxGeometry,
    capacity: 400,
    count: 8,
    emit: (origin, size, color) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = between(1.5, 3.5) * Math.sqrt(size);
      return {
        x: origin.x,
        y: origin.y + size * 0.5,
        z: origin.z,
        vx: Math.cos(angle) * speed,
        vy: between(2, 4) * Math.sqrt(size),
        vz: Math.sin(angle) * speed,
        gravity: 12,
        life: between(0.45, 0.6),
        size: 0.15 * size,
        sizeEnd: 0.04 * size,
        color,
        spinX: spread(6),
        spinY: spread(6),
      };
    },
  },
  confetti: {
    geometry: getUnitBoxGeometry,
    capacity: 500,
    count: 16,
    emit: (origin, size) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = between(1.5, 3) * Math.sqrt(size);
      const cardSize = 0.14 * Math.sqrt(size);
      return {
        x: origin.x,
        y: origin.y + size * 0.6,
        z: origin.z,
        vx: Math.cos(angle) * speed,
        vy: between(3, 5.5) * Math.sqrt(size),
        vz: Math.sin(angle) * speed,
        gravity: 5,
        drag: 1.8,
        life: between(1.1, 1.5),
        size: cardSize,
        shapeY: 0.1,
        shapeZ: 0.6,
        color: pick(CONFETTI_COLORS),
        spinX: spread(12),
        spinY: spread(8),
        spinZ: spread(12),
        wobble: 0.8,
        fadeOut: 0.3,
      };
    },
  },
  explosion: {
    layers: [
      {
        geometry: getIcosahedronGeometry,
        additive: true,
        capacity: 300,
        count: 4,
        emit: (origin, size) => ({
          x: origin.x + spread(0.2 * size),
          y: origin.y + 0.4 * size,
          z: origin.z + spread(0.2 * size),
          vy: between(0.8, 1.6) * size,
          drag: 3,
          life: between(0.3, 0.45),
          size: 0.6 * size,
          sizeEnd: 1.5 * size,
          color: 0xfff6d0,
          colorEnd: 0xff5a1a,
          intensity: 2.4,
          fadeOut: 0.8,
        }),
      },
      {
        geometry: getDodecahedronGeometry,
        additive: false,
        capacity: 900,
        count: 9,
        emit: (origin, size) => ({
          x: origin.x + spread(0.18 * size),
          y: origin.y + 0.2 * size,
          z: origin.z + spread(0.18 * size),
          vx: spread(0.25 * size),
          vy: between(2.2, 3.4) * size,
          vz: spread(0.25 * size),
          drag: 2.4,
          life: between(1, 1.4),
          size: 0.35 * size,
          sizeEnd: 0.6 * size,
          color: pick(FIRE_COLORS),
          colorEnd: 0x3a3431,
          intensity: 1.3,
          alpha: 0.95,
          spinX: spread(1.5),
          spinY: spread(1.5),
          fadeOut: 0.5,
        }),
      },
      {
        geometry: getDodecahedronGeometry,
        additive: false,
        capacity: 900,
        count: 12,
        emit: (origin, size) => {
          const angle = Math.random() * Math.PI * 2;
          const outward = between(1.3, 2.1) * size;
          return {
            x: origin.x + Math.cos(angle) * 0.2 * size,
            y: origin.y + 0.7 * size,
            z: origin.z + Math.sin(angle) * 0.2 * size,
            vx: Math.cos(angle) * outward,
            vy: between(3, 3.8) * size,
            vz: Math.sin(angle) * outward,
            drag: 2.3,
            life: between(1.1, 1.6),
            size: 0.45 * size,
            sizeEnd: 0.95 * size,
            color: pick(FIRE_COLORS),
            colorEnd: 0x2e2a28,
            intensity: 1.3,
            alpha: 0.95,
            spinX: spread(1.5),
            spinY: spread(1.5),
            fadeOut: 0.5,
          };
        },
      },
      {
        geometry: getDodecahedronGeometry,
        additive: false,
        capacity: 900,
        count: 10,
        emit: (origin, size) => {
          const angle = Math.random() * Math.PI * 2;
          const speed = between(3.5, 5) * size;
          return {
            x: origin.x,
            y: origin.y + 0.15,
            z: origin.z,
            vx: Math.cos(angle) * speed,
            vy: between(0.1, 0.4),
            vz: Math.sin(angle) * speed,
            drag: 3.2,
            life: between(0.6, 0.9),
            size: 0.25 * size,
            sizeEnd: 0.55 * size,
            color: 0xb8a890,
            colorEnd: 0x6a625c,
            alpha: 0.7,
            fadeOut: 0.7,
          };
        },
      },
    ],
  },
  hearts: {
    geometry: () => getHeartGeometry(0.22),
    capacity: 240,
    count: 7,
    emit: (origin, size) => {
      const heartSize = between(0.22, 0.32) * Math.sqrt(size);
      return {
        x: origin.x + spread(0.3 * size),
        y: origin.y + size * 0.5,
        z: origin.z + spread(0.3 * size),
        vx: spread(0.8),
        vy: between(1.5, 2.5),
        vz: spread(0.8),
        gravity: -0.3,
        drag: 1.2,
        wobble: 1.5,
        life: between(1.1, 1.5),
        size: heartSize * 0.6,
        sizeEnd: heartSize,
        rx: 0,
        ry: spread(0.4),
        rz: spread(0.3),
        spinY: spread(1.5),
        color: pick(HEART_COLORS),
        colorEnd: 0xff9ec0,
        fadeOut: 0.4,
      };
    },
  },
};

function getSystem(scene, key, spec) {
  if (!scene.userData.killEffectSystems) {
    scene.userData.killEffectSystems = new Map();
  }
  const systems = scene.userData.killEffectSystems;
  let system = systems.get(key);
  if (!system) {
    system = new ParticleSystem(scene, {
      geometry: spec.geometry(),
      capacity: spec.capacity,
      additive: spec.additive === true,
    });
    systems.set(key, system);
  }
  return system;
}

function layersOf(style) {
  const spec = STYLES[style];
  return spec.layers ?? [spec];
}

export function spawnKillEffect(scene, position, style = "pixels", options = {}) {
  const key = STYLES[style] ? style : "pixels";
  const size = options.size ?? 1;
  const color = options.color ?? 0xffffff;
  const amount = Math.min(Math.max(size, 1), 3);
  layersOf(key).forEach((layer, index) => {
    const system = getSystem(scene, `${key}:${index}`, layer);
    const count = Math.round(layer.count * amount);
    for (let i = 0; i < count; i++) {
      system.emit(layer.emit(position, size, color));
    }
  });
}

export function updateKillEffects(scene, delta) {
  const systems = scene.userData.killEffectSystems;
  if (!systems) {
    return;
  }
  for (const system of systems.values()) {
    system.update(delta);
  }
}

export function disposeKillEffects(scene) {
  const systems = scene.userData.killEffectSystems;
  if (!systems) {
    return;
  }
  for (const system of systems.values()) {
    system.dispose();
  }
  systems.clear();
}

export function getKillEffectPreviewColors(style) {
  if (style === "confetti") {
    return CONFETTI_COLORS;
  }
  if (style === "explosion") {
    return EXPLOSION_COLORS;
  }
  if (style === "hearts") {
    return HEART_COLORS;
  }
  return null;
}

export const KILL_EFFECT_GEOMETRY = {
  pixels: getUnitBoxGeometry,
  confetti: getUnitBoxGeometry,
  explosion: getDodecahedronGeometry,
  hearts: () => getHeartGeometry(0.22),
};
