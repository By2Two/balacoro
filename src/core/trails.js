import * as THREE from "three";
import { ParticleSystem } from "./particles.js";
import {
  getUnitBoxGeometry,
  getOctahedronGeometry,
  getIcosahedronGeometry,
  getDodecahedronGeometry,
  getHexagonGeometry,
  getStarGeometry,
} from "./shapes.js";

export const TRAIL_OPTIONS = [
  { id: "fire", label: "FIRE TRAIL", price: 1000000 },
  { id: "ice", label: "ICE TRAIL", price: 1000000 },
  { id: "poison", label: "POISON TRAIL", price: 1000000 },
  { id: "lightning", label: "LIGHTNING TRAIL", price: 1000000 },
  { id: "shadow", label: "SHADOW TRAIL", price: 1000000 },
  { id: "rainbow", label: "RAINBOW TRAIL", price: 1000000 },
];

export const TRAIL_PREVIEW_COLORS = {
  fire: [0xffe27a, 0xffc23b, 0xff9a1f, 0xff4a00],
  ice: [0xffffff, 0xcff3ff, 0x9be8ff, 0x62c4ff],
  poison: [0x9bff5a, 0x59d13a, 0x2e8b22, 0xc8ff7a],
  lightning: [0xfff7b0, 0xffffff, 0x9adfff, 0x4a7dff],
  shadow: [0x2a1b3d, 0x1a1424, 0x9a5cff, 0x0d0d14],
  rainbow: [0xff4d6d, 0xffd23e, 0x4dd2ff, 0x7cff6b, 0xc77dff],
};

const hueColor = new THREE.Color();

function spread(amount) {
  return (Math.random() - 0.5) * 2 * amount;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

function groundDecal(x, z, { size, color, colorEnd, alpha, life }) {
  const decalSize = size * between(0.8, 1.25);
  return {
    x: x + spread(0.3),
    y: 0.02 + Math.random() * 0.01,
    z: z + spread(0.3),
    rx: 0,
    ry: Math.random() * Math.PI,
    rz: 0,
    life,
    size: decalSize,
    sizeEnd: decalSize * 1.12,
    color,
    colorEnd,
    alpha,
    fadeOut: 0.45,
  };
}

const TRAIL_DEFS = {
  fire: {
    layers: [
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 140,
        rate: 42,
        idleRate: 12,
        burst: 40,
        spawn: (x, z) => ({
          x: x + spread(0.22),
          y: between(0.12, 0.28),
          z: z + spread(0.22),
          vx: spread(0.3),
          vy: between(1.2, 2),
          vz: spread(0.3),
          gravity: -0.6,
          drag: 1.2,
          life: between(0.45, 0.75),
          size: between(0.24, 0.34),
          sizeEnd: 0.04,
          color: pick([0xffe27a, 0xffc23b, 0xff9a1f]),
          colorEnd: 0xff2a00,
          intensity: 1.8,
          spinX: spread(4),
          spinY: spread(4),
          flicker: 0.25,
          wobble: 0.6,
          fadeOut: 0.6,
        }),
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 50,
        rate: 7,
        idleRate: 2,
        burst: 16,
        spawn: (x, z) => ({
          x: x + spread(0.2),
          y: between(0.2, 0.4),
          z: z + spread(0.2),
          vx: spread(1.2),
          vy: between(2.5, 4),
          vz: spread(1.2),
          gravity: 5,
          life: between(0.5, 0.8),
          size: 0.06,
          sizeEnd: 0.03,
          shapeY: 2.2,
          color: 0xfff3b0,
          colorEnd: 0xff6a00,
          intensity: 2.5,
        }),
      },
    ],
  },
  ice: {
    layers: [
      {
        geometry: getOctahedronGeometry,
        additive: false,
        capacity: 100,
        rate: 26,
        idleRate: 6,
        burst: 30,
        spawn: (x, z) => ({
          x: x + spread(0.3),
          y: between(0.15, 0.45),
          z: z + spread(0.3),
          vx: spread(0.4),
          vy: between(0.4, 0.8),
          vz: spread(0.4),
          gravity: 1.4,
          drag: 0.8,
          life: between(0.9, 1.3),
          size: between(0.15, 0.22),
          sizeEnd: 0.04,
          color: pick([0xffffff, 0xcff3ff, 0x9be8ff]),
          colorEnd: 0x62c4ff,
          alpha: 0.95,
          spinX: spread(3),
          spinY: spread(3),
          fadeOut: 0.5,
        }),
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 40,
        rate: 9,
        idleRate: 3,
        burst: 12,
        spawn: (x, z) => ({
          x: x + spread(0.4),
          y: between(0.2, 0.7),
          z: z + spread(0.4),
          vy: 0.2,
          life: between(0.4, 0.7),
          size: 0.07,
          sizeEnd: 0.02,
          color: 0xe8fbff,
          intensity: 2.2,
          flicker: 0.9,
        }),
      },
      {
        geometry: getHexagonGeometry,
        additive: false,
        ground: true,
        capacity: 50,
        rate: 7,
        idleRate: 0,
        burst: 8,
        spawn: (x, z) =>
          groundDecal(x, z, {
            size: 0.7,
            color: 0xdff6ff,
            colorEnd: 0xa9dcff,
            alpha: 0.55,
            life: 2.4,
          }),
      },
    ],
  },
  poison: {
    layers: [
      {
        geometry: getIcosahedronGeometry,
        additive: false,
        capacity: 100,
        rate: 22,
        idleRate: 6,
        burst: 24,
        spawn: (x, z) => ({
          x: x + spread(0.25),
          y: between(0.12, 0.3),
          z: z + spread(0.25),
          vy: between(0.5, 0.9),
          gravity: -0.2,
          drag: 0.6,
          wobble: 1.2,
          life: between(0.8, 1.2),
          size: 0.08,
          sizeEnd: between(0.22, 0.3),
          color: pick([0x9bff5a, 0x59d13a, 0x2e8b22]),
          colorEnd: 0xc8ff7a,
          alpha: 0.85,
          fadeOut: 0.25,
        }),
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 36,
        rate: 6,
        idleRate: 2,
        burst: 10,
        spawn: (x, z) => ({
          x: x + spread(0.35),
          y: between(0.15, 0.5),
          z: z + spread(0.35),
          vy: 0.6,
          wobble: 1,
          life: 0.7,
          size: 0.06,
          sizeEnd: 0.02,
          color: 0x7dff3a,
          intensity: 1.8,
          flicker: 0.4,
        }),
      },
      {
        geometry: getHexagonGeometry,
        additive: false,
        ground: true,
        capacity: 30,
        rate: 4,
        idleRate: 0,
        burst: 6,
        spawn: (x, z) =>
          groundDecal(x, z, {
            size: 0.6,
            color: 0x3f9e2a,
            colorEnd: 0x2e6b1f,
            alpha: 0.5,
            life: 1.8,
          }),
      },
    ],
  },
  lightning: {
    layers: [
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 120,
        rate: 45,
        idleRate: 12,
        burst: 50,
        spawn: (x, z) => ({
          x: x + spread(0.3),
          y: between(0.15, 0.6),
          z: z + spread(0.3),
          vx: spread(3),
          vy: spread(2.5),
          vz: spread(3),
          gravity: 3,
          drag: 3,
          life: between(0.15, 0.35),
          size: 0.12,
          sizeEnd: 0.04,
          shapeX: 0.25,
          shapeY: 0.25,
          shapeZ: 2.4,
          color: pick([0xfff7b0, 0xffffff, 0x9adfff]),
          colorEnd: 0x4a7dff,
          intensity: 2.4,
          flicker: 0.7,
        }),
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 24,
        rate: 5,
        idleRate: 1.5,
        burst: 8,
        spawn: (x, z) => ({
          x: x + spread(0.25),
          y: between(0.2, 0.5),
          z: z + spread(0.25),
          life: between(0.1, 0.15),
          size: 0.28,
          sizeEnd: 0.02,
          color: 0xe6f4ff,
          intensity: 3,
          flicker: 0.5,
        }),
      },
    ],
  },
  shadow: {
    layers: [
      {
        geometry: getDodecahedronGeometry,
        additive: false,
        capacity: 110,
        rate: 24,
        idleRate: 8,
        burst: 30,
        spawn: (x, z) => ({
          x: x + spread(0.25),
          y: between(0.1, 0.3),
          z: z + spread(0.25),
          vx: spread(0.2),
          vy: between(0.25, 0.5),
          vz: spread(0.2),
          drag: 1.8,
          wobble: 0.5,
          life: between(1, 1.4),
          size: 0.22,
          sizeEnd: 0.62,
          color: pick([0x2a1b3d, 0x1a1424, 0x0d0d14]),
          colorEnd: 0x050508,
          alpha: 0.78,
          spinX: spread(1),
          spinY: spread(1),
          fadeOut: 0.7,
        }),
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 36,
        rate: 7,
        idleRate: 3,
        burst: 12,
        spawn: (x, z) => ({
          x: x + spread(0.3),
          y: between(0.2, 0.5),
          z: z + spread(0.3),
          vy: 0.8,
          wobble: 1.5,
          life: 0.8,
          size: 0.07,
          sizeEnd: 0.02,
          color: 0x9a5cff,
          colorEnd: 0x3a1a7a,
          intensity: 1.6,
        }),
      },
    ],
  },
  rainbow: {
    layers: [
      {
        geometry: () => getStarGeometry(5, 0.45, 0.18),
        additive: true,
        capacity: 110,
        rate: 24,
        idleRate: 6,
        burst: 30,
        spawn: (x, z, time) => {
          hueColor.setHSL((time * 0.5 + Math.random() * 0.08) % 1, 1, 0.6);
          const color = hueColor.getHex();
          hueColor.multiplyScalar(0.35);
          return {
            x: x + spread(0.3),
            y: between(0.15, 0.45),
            z: z + spread(0.3),
            vx: spread(0.35),
            vy: between(0.6, 1),
            vz: spread(0.35),
            gravity: 0.6,
            drag: 0.8,
            life: between(0.7, 1),
            size: between(0.2, 0.28),
            sizeEnd: 0.05,
            color,
            colorEnd: hueColor.getHex(),
            intensity: 1.7,
            spinZ: spread(5),
            flicker: 0.15,
            fadeOut: 0.6,
          };
        },
      },
      {
        geometry: getUnitBoxGeometry,
        additive: true,
        capacity: 36,
        rate: 8,
        idleRate: 3,
        burst: 12,
        spawn: (x, z) => ({
          x: x + spread(0.4),
          y: between(0.2, 0.7),
          z: z + spread(0.4),
          vy: 0.3,
          life: between(0.4, 0.7),
          size: 0.07,
          sizeEnd: 0.02,
          color: 0xffffff,
          intensity: 2.5,
          flicker: 0.9,
        }),
      },
    ],
  },
};

export function getTrailDefinitions(accessoryIds = []) {
  return accessoryIds.map((id) => TRAIL_DEFS[id]).filter(Boolean);
}

export class TrailEmitter {
  constructor(scene, defs, options = {}) {
    this.wind = options.wind ?? null;
    this.time = 0;
    this.lastPosition = null;
    this.layers = [];
    for (const def of defs) {
      for (const spec of def.layers) {
        this.layers.push({
          spec,
          accumulator: Math.random(),
          system: new ParticleSystem(scene, {
            geometry: spec.geometry(),
            capacity: spec.capacity,
            additive: spec.additive,
          }),
        });
      }
    }
  }

  _emit(layer, fromX, fromZ, toX, toZ) {
    const t = Math.random();
    const options = layer.spec.spawn(
      fromX + (toX - fromX) * t,
      fromZ + (toZ - fromZ) * t,
      this.time
    );
    if (this.wind && !layer.spec.ground) {
      options.vx = (options.vx ?? 0) + this.wind.x;
      options.vz = (options.vz ?? 0) + this.wind.z;
    }
    layer.system.emit(options);
  }

  update(delta, position, isMoving) {
    this.time += delta;
    const fromX = this.lastPosition?.x ?? position.x;
    const fromZ = this.lastPosition?.z ?? position.z;

    for (const layer of this.layers) {
      const rate = isMoving ? layer.spec.rate : (layer.spec.idleRate ?? 0);
      layer.accumulator += rate * delta;
      while (layer.accumulator >= 1) {
        layer.accumulator -= 1;
        this._emit(layer, fromX, fromZ, position.x, position.z);
      }
      layer.system.update(delta);
    }

    if (!this.lastPosition) {
      this.lastPosition = new THREE.Vector3();
    }
    this.lastPosition.copy(position);
  }

  burst(from, to) {
    for (const layer of this.layers) {
      for (let i = 0; i < (layer.spec.burst ?? 0); i++) {
        this._emit(layer, from.x, from.z, to.x, to.z);
      }
    }
  }

  dispose() {
    for (const layer of this.layers) {
      layer.system.dispose();
    }
    this.layers = [];
  }
}
