import * as THREE from "three";
import { part } from "./instancing.js";
import { PREFABS, jitter, pickFrom } from "./prefabs.js";
import { ZONE } from "./zones.js";

const composeMatrix = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const euler = new THREE.Euler();
const upAxis = new THREE.Vector3(0, 1, 0);

function createStructure(radius) {
  return { parts: [], colliders: [], map: [], zones: [], radius };
}

function include(target, built, x, z, rotationY = 0, size = 1) {
  composeMatrix.compose(
    position.set(x, 0, z),
    quaternion.setFromAxisAngle(upAxis, rotationY),
    scale.set(size, size, size)
  );
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const toLocal = (localX = 0, localZ = 0) => [
    x + (localX * cos + localZ * sin) * size,
    z + (-localX * sin + localZ * cos) * size,
  ];

  for (const entry of built.parts) {
    euler.set(entry.r?.[0] ?? 0, entry.r?.[1] ?? 0, entry.r?.[2] ?? 0);
    partMatrix.compose(
      position.set(entry.p[0], entry.p[1], entry.p[2]),
      quaternion.setFromEuler(euler),
      scale.set(entry.s[0], entry.s[1], entry.s[2])
    );
    partMatrix.premultiply(composeMatrix);
    partMatrix.decompose(position, quaternion, scale);
    euler.setFromQuaternion(quaternion);
    target.parts.push(
      part(entry.g, entry.m, entry.c, [position.x, position.y, position.z], [scale.x, scale.y, scale.z], [euler.x, euler.y, euler.z])
    );
  }
  for (const collider of built.colliders ?? []) {
    const [cx, cz] = toLocal(collider.x, collider.z);
    target.colliders.push({
      ...collider,
      x: cx,
      z: cz,
      circle: collider.circle ? collider.circle * size : undefined,
      box: collider.box ? [collider.box[0] * size, collider.box[1] * size] : undefined,
      rot: (collider.rot ?? 0) + rotationY,
    });
  }
  for (const shape of built.map ?? []) {
    const [cx, cz] = toLocal(shape.x, shape.z);
    target.map.push({
      ...shape,
      x: cx,
      z: cz,
      circle: shape.circle ? shape.circle * size : undefined,
      box: shape.box ? [shape.box[0] * size, shape.box[1] * size] : undefined,
      rot: (shape.rot ?? 0) + rotationY,
      h: (shape.h ?? 1) * size,
    });
  }
}

function block(target, material, color, x, y, z, width, height, depth, rotationY = 0, solid = true) {
  target.parts.push(part("box", material, color, [x, y, z], [width, height, depth], [0, rotationY, 0]));
  if (solid) {
    target.colliders.push({ box: [width / 2, depth / 2], x, z, rot: rotationY });
    target.map.push({ box: [width / 2, depth / 2], x, z, rot: rotationY, color, h: y + height / 2 });
  }
}

function ringPositions(count, radius, rng, jitterAmount = 0.2) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng.float(-jitterAmount, jitterAmount);
    positions.push([Math.cos(angle) * radius, Math.sin(angle) * radius, angle]);
  }
  return positions;
}

function campfire(target, x, z, rng, lit = true) {
  for (const [sx, sz] of ringPositions(6, 0.8, rng)) {
    target.parts.push(part("dodeca", "std", jitter(0x6f6f6f, rng), [x + sx, 0.12, z + sz], 0.35));
  }
  target.parts.push(part("cyl6", "std", 0x5a3d2b, [x, 0.12, z], [0.18, 1.3, 0.18], [0, 0.6, Math.PI / 2]));
  target.parts.push(part("cyl6", "std", 0x5a3d2b, [x, 0.12, z], [0.18, 1.3, 0.18], [0, -0.6, Math.PI / 2]));
  target.parts.push(
    part("cone6", lit ? "glowStrong" : "glow", lit ? 0xff7a26 : 0x7a2a10, [x, lit ? 0.45 : 0.2, z], lit ? [0.5, 0.8, 0.5] : [0.5, 0.25, 0.5])
  );
  target.colliders.push({ circle: 0.9, x, z });
  target.map.push({ circle: 0.9, x, z, color: 0xff7a26, h: 0.4 });
}

function house(target, x, z, rotationY, rng, options = {}) {
  const width = rng.float(3.6, 5);
  const depth = rng.float(3.4, 4.6);
  const height = rng.float(2.3, 3);
  const wallColor = jitter(options.wall ?? pickFrom([0xb08968, 0xc9a27a, 0x9a7a5a, 0xd8c8a8], rng), rng, 0.05);
  const roofColor = options.roof ?? pickFrom([0x6e4a34, 0x7a3b2e, 0x4a5a6a, 0x5a3a2a], rng);
  const local = createStructure(0);
  block(local, "std", wallColor, 0, height / 2, 0, width, height, depth);
  local.parts.push(part("roof", "std", roofColor, [0, height, 0], [width + 0.6, height * 0.9, depth + 0.5], [0, Math.PI / 2, 0]));
  if (options.snowy) {
    local.parts.push(part("roof", "std", 0xf4f9ff, [0, height + 0.15, 0], [width + 0.7, height * 0.75, depth + 0.55], [0, Math.PI / 2, 0]));
  }
  local.parts.push(part("box", "std", 0x3a2414, [0, 0.8, depth / 2 + 0.02], [0.9, 1.6, 0.06]));
  for (const side of [-1, 1]) {
    local.parts.push(part("box", "window", 0xffffff, [side * width * 0.28, height * 0.6, depth / 2 + 0.03], [0.6, 0.6, 0.04]));
  }
  local.parts.push(part("box", "std", 0x6a5a50, [width * 0.3, height + 0.9, 0], [0.5, 1.4, 0.5]));
  include(target, local, x, z, rotationY);
}

function rockRidgeParts(target, rng, color, options = {}) {
  const count = 7 + rng.int(0, 3);
  const bend = rng.float(-0.25, 0.25);
  const gap = rng.int(2, count - 3);
  for (let i = 0; i < count; i++) {
    if (i === gap) {
      continue;
    }
    const t = i / (count - 1) - 0.5;
    const x = t * 18;
    const z = t * t * 18 * bend;
    const size = rng.float(1.8, 3);
    const rock = options.ice ? PREFABS.iceRock(rng) : PREFABS.rock(rng, { color, moss: options.moss && rng.next() < 0.5 });
    include(target, rock, x, z, rng.float(0, Math.PI * 2), size);
  }
}

export const STRUCTURES = {
  stoneCircle: (rng) => {
    const target = createStructure(7);
    for (const [x, z, angle] of ringPositions(8, 5.5, rng, 0.1)) {
      if (rng.next() < 0.15) {
        continue;
      }
      block(target, "std", jitter(0x7d8088, rng), x, 1.2, z, 0.9, rng.float(2, 3), 0.6, -angle);
    }
    block(target, "std", 0x6d7078, 0, 0.3, 0, 2, 0.6, 1.2);
    target.parts.push(part("octa", "glow", 0x7fe0ff, [0, 0.9, 0], [0.3, 0.5, 0.3]));
    return target;
  },

  ruins: (rng, options = {}) => {
    const target = createStructure(7);
    const color = options.color ?? 0x8a8f94;
    for (const [x, z] of ringPositions(6, rng.float(4.5, 5.5), rng, 0.25)) {
      const broken = rng.next() < 0.35;
      block(target, "std", jitter(color, rng), x, broken ? 0.4 : 1.4, z, 0.9, broken ? rng.float(0.5, 0.9) : rng.float(2, 3), 0.9);
    }
    block(target, "std", jitter(color, rng), -1.5, 0.6, -1, 3.5, 1.2, 0.6, rng.float(-0.3, 0.3));
    block(target, "std", jitter(color, rng), 1.8, 1.4, 1.2, 0.8, 2.8, 0.8);
    block(target, "std", jitter(color, rng), 1.8, 1.4, 3.2, 0.8, 2.8, 0.8);
    block(target, "std", jitter(color, rng), 1.8, 3, 2.2, 1, 0.5, 3, 0, false);
    if (options.crystals) {
      include(target, PREFABS.crystalCluster(rng), 0, 0);
    }
    return target;
  },

  cabin: (rng, options = {}) => {
    const target = createStructure(6);
    house(target, 0, 0, 0, rng, {
      wall: options.snowy ? 0x8a6a4a : 0x9a6b3a,
      roof: options.autumn ? 0x8a3b1e : 0x5a3a2a,
      snowy: options.snowy,
    });
    for (let i = 0; i < 3; i++) {
      target.parts.push(part("cyl8", "std", 0x6b4a2b, [3.4, 0.25 + (i === 2 ? 0.4 : 0), 1 + (i % 2) * 0.5 - 0.25], [0.45, 1.8, 0.45], [Math.PI / 2, 0, 0]));
    }
    target.colliders.push({ box: [0.5, 1], x: 3.4, z: 1 });
    include(target, PREFABS.stump(rng), -3.2, 2.2);
    return target;
  },

  well: () => {
    const target = createStructure(3);
    target.parts.push(part("cyl8", "std", 0x7d7d85, [0, 0.45, 0], [1.8, 0.9, 1.8]));
    target.parts.push(part("disc", "decal", 0x1d3a5a, [0, 0.91, 0], [1.4, 1, 1.4]));
    for (const side of [-1, 1]) {
      target.parts.push(part("box", "std", 0x6b4a2b, [side * 0.85, 1.4, 0], [0.15, 1.9, 0.15]));
    }
    target.parts.push(part("roof", "std", 0x7a3b2e, [0, 2.3, 0], [2.4, 1.2, 1.4], [0, Math.PI / 2, 0]));
    target.colliders.push({ circle: 0.95 });
    target.map.push({ circle: 1, color: 0x7d7d85, h: 2.5 });
    return target;
  },

  ancientTree: (rng) => {
    const target = createStructure(5);
    target.parts.push(part("taper6", "std", 0x4a3322, [0, 3, 0], [2.4, 6, 2.4]));
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      target.parts.push(part("cyl6", "std", 0x4a3322, [Math.cos(angle) * 1.4, 0.3, Math.sin(angle) * 1.4], [0.45, 2, 0.45], [Math.sin(angle) * 1.2, 0, -Math.cos(angle) * 1.2]));
    }
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const distance = i === 0 ? 0 : 2;
      target.parts.push(part("ico1", "leaf", jitter(0x2a6a2a, rng), [Math.cos(angle) * distance, 6.8 + rng.float(-0.5, 0.8), Math.sin(angle) * distance], rng.float(3.5, 5)));
    }
    target.colliders.push({ circle: 1.3 });
    target.map.push({ circle: 4, color: 0x2a6a2a, h: 8 });
    return target;
  },

  mushroomRing: (rng, options = {}) => {
    const target = createStructure(4.5);
    for (const [x, z] of ringPositions(11, 3.2, rng, 0.15)) {
      include(target, PREFABS.mushroom(rng, { glow: options.glow }), x, z, 0, 1.6);
    }
    include(target, PREFABS.stump(rng), 0, 0);
    return target;
  },

  pumpkinFarm: (rng) => {
    const target = createStructure(7);
    const halfWidth = 5;
    const halfDepth = 4;
    const fence = 0x8a6035;
    const segments = [
      [0, -halfDepth, halfWidth, 0],
      [-halfWidth, 0, halfDepth, Math.PI / 2],
      [halfWidth, 0, halfDepth, Math.PI / 2],
      [-3.2, halfDepth, 1.8, 0],
      [3.2, halfDepth, 1.8, 0],
    ];
    for (const [x, z, half, rotation] of segments) {
      target.parts.push(part("box", "std", fence, [x, 0.55, z], [half * 2, 0.12, 0.1], [0, rotation, 0]));
      target.parts.push(part("box", "std", fence, [x, 0.9, z], [half * 2, 0.12, 0.1], [0, rotation, 0]));
      target.colliders.push({ box: [half, 0.1], x, z, rot: rotation });
      target.map.push({ box: [half, 0.1], x, z, rot: rotation, color: fence, h: 1 });
      for (let t = -half; t <= half + 0.01; t += 2) {
        const px = x + Math.cos(rotation) * t;
        const pz = z - Math.sin(rotation) * t;
        target.parts.push(part("box", "std", fence, [px, 0.55, pz], [0.15, 1.1, 0.15]));
      }
    }
    for (let row = -1; row <= 1; row++) {
      for (let col = -3; col <= 3; col++) {
        if (rng.next() < 0.7 && !(row === 0 && Math.abs(col) < 1)) {
          include(target, PREFABS.pumpkin(rng), col * 1.3, row * 2.2 + rng.float(-0.2, 0.2));
        }
      }
    }
    target.parts.push(part("cyl5", "std", 0x6b4a2b, [0, 1.1, 0], [0.12, 2.2, 0.12]));
    target.parts.push(part("cyl5", "std", 0x6b4a2b, [0, 1.6, 0], [0.1, 1.6, 0.1], [0, 0, Math.PI / 2]));
    target.parts.push(part("box", "std", 0x8a4a2a, [0, 1.4, 0], [0.6, 0.8, 0.3]));
    target.parts.push(part("sphere", "std", 0xe67e22, [0, 2.3, 0], [0.55, 0.5, 0.55]));
    target.parts.push(part("cone8", "std", 0x5a4a2a, [0, 2.7, 0], [0.8, 0.5, 0.8]));
    target.colliders.push({ circle: 0.25 });
    return target;
  },

  windmill: (rng) => {
    const target = createStructure(5);
    target.parts.push(part("taper6", "std", 0xe8dcc8, [0, 3, 0], [3.6, 6, 3.6]));
    target.parts.push(part("cone6", "std", 0x7a3b2e, [0, 6.9, 0], [3.4, 1.8, 3.4]));
    target.parts.push(part("box", "std", 0x3a2414, [0, 0.9, 1.72], [1, 1.8, 0.1]));
    target.parts.push(part("cyl6", "std", 0x5a3a22, [0, 5, 1.9], [0.3, 0.6, 0.3], [Math.PI / 2, 0, 0]));
    const spin = rng.float(0, Math.PI);
    for (let i = 0; i < 4; i++) {
      const angle = spin + (i * Math.PI) / 2;
      target.parts.push(part("box", "std", 0xd8c8a8, [Math.sin(angle) * 1.9, 5 + Math.cos(angle) * 1.9, 2.15], [0.55, 3.6, 0.06], [0, 0, -angle]));
    }
    target.colliders.push({ circle: 1.8 });
    target.map.push({ circle: 1.9, color: 0xe8dcc8, h: 7 });
    return target;
  },

  hayField: (rng) => {
    const target = createStructure(6);
    for (let i = 0; i < 7; i++) {
      include(target, PREFABS.hayBale(rng), rng.float(-5, 5), rng.float(-5, 5), rng.float(0, Math.PI));
    }
    target.parts.push(part("box", "std", 0x8a6035, [0, 0.8, 0], [2.4, 0.6, 1.4]));
    for (const side of [-1, 1]) {
      target.parts.push(part("torus", "std", 0x3a2414, [0, 0.45, side * 0.75], 1.1));
    }
    target.parts.push(part("box", "std", 0xd8b54a, [0, 1.25, 0], [2.2, 0.4, 1.2]));
    target.colliders.push({ box: [1.2, 0.8] });
    target.map.push({ box: [1.2, 0.8], color: 0x8a6035, h: 1.5 });
    return target;
  },

  iglooCamp: (rng) => {
    const target = createStructure(6);
    target.parts.push(part("dome", "std", 0xf4f9ff, [0, 0, 0], [4.4, 3, 4.4]));
    target.parts.push(part("cyl8", "std", 0xe8f2fa, [0, 0, 2.3], [1.5, 1.4, 1.5], [Math.PI / 2, 0, 0]));
    target.parts.push(part("box", "std", 0x1a2a3a, [0, 0.4, 3.05], [0.8, 0.8, 0.05]));
    target.colliders.push({ circle: 2.2 });
    target.colliders.push({ box: [0.75, 0.7], z: 2.3 });
    target.map.push({ circle: 2.2, color: 0xf4f9ff, h: 1.5 });
    campfire(target, 3.8, 1.5, rng);
    const snowmanX = -3.5;
    const snowmanZ = 2;
    target.parts.push(part("sphere", "std", 0xffffff, [snowmanX, 0.45, snowmanZ], 0.9));
    target.parts.push(part("sphere", "std", 0xffffff, [snowmanX, 1.15, snowmanZ], 0.65));
    target.parts.push(part("sphere", "std", 0xffffff, [snowmanX, 1.7, snowmanZ], 0.45));
    target.parts.push(part("cone6", "std", 0xff7a1a, [snowmanX, 1.72, snowmanZ + 0.3], [0.08, 0.3, 0.08], [Math.PI / 2, 0, 0]));
    target.parts.push(part("cyl8", "std", 0x1a1a1a, [snowmanX, 2.05, snowmanZ], [0.4, 0.35, 0.4]));
    target.colliders.push({ circle: 0.45, x: snowmanX, z: snowmanZ });
    return target;
  },

  iceSpikeField: (rng) => {
    const target = createStructure(6);
    for (let i = 0; i < 10; i++) {
      include(target, PREFABS.iceSpike(rng), rng.float(-5, 5), rng.float(-5, 5), 0, rng.float(0.8, 1.6));
    }
    return target;
  },

  oasis: (rng) => {
    const target = createStructure(7);
    target.zones.push({ circle: 3.6, zone: ZONE.WATER });
    for (const [x, z, angle] of ringPositions(4, 5, rng, 0.4)) {
      include(target, PREFABS.palm(rng), x, z, -angle + Math.PI);
    }
    for (const [x, z] of ringPositions(5, 4.2, rng, 0.5)) {
      include(target, PREFABS.bush(rng, { palette: [0x3f9e4d, 0x4aa84a] }), x, z);
    }
    return target;
  },

  pyramid: (rng) => {
    const target = createStructure(6.5);
    const color = 0xd4b07a;
    [8, 6, 4, 2].forEach((size, index) => {
      target.parts.push(part("box", "std", jitter(color, rng, 0.05), [0, index * 1.2 + 0.6, 0], [size, 1.2, size]));
    });
    target.parts.push(part("cone4", "glow", 0xffd27a, [0, 5.3, 0], [1.4, 1, 1.4], [0, Math.PI / 4, 0]));
    target.colliders.push({ box: [4, 4] });
    target.map.push({ box: [4, 4], color, h: 5 });
    return target;
  },

  obeliskRing: (rng, options = {}) => {
    const target = createStructure(6);
    const color = options.color ?? 0xc9a870;
    for (const [x, z] of ringPositions(5, 5, rng, 0.05)) {
      const height = rng.float(3, 4.2);
      block(target, "std", jitter(color, rng, 0.05), x, height / 2, z, 0.8, height, 0.8);
      target.parts.push(part("cone4", options.crystal ? "glow" : "std", options.crystal ? 0x9f7bff : color, [x, height + 0.3, z], [0.9, 0.6, 0.9], [0, Math.PI / 4, 0]));
    }
    block(target, "std", color, 0, 0.4, 0, 1.6, 0.8, 1.6);
    return target;
  },

  ribcage: () => {
    const target = createStructure(7);
    const bone = 0xe8e0cc;
    for (let i = 0; i < 7; i++) {
      const z = -4 + i * 1.3;
      const size = 1 - Math.abs(i - 3) * 0.1;
      target.parts.push(part("box", "std", bone, [0, 0.25, z], [0.5, 0.5, 0.9]));
      target.parts.push(part("arc", "std", bone, [0, 0, z], [2.8 * size, 2.6 * size, 1.4]));
      target.colliders.push({ circle: 0.25, x: 1.35 * size, z });
      target.colliders.push({ circle: 0.25, x: -1.35 * size, z });
    }
    target.parts.push(part("dodeca", "std", bone, [0, 0.7, 5.3], [1.8, 1.4, 2]));
    target.parts.push(part("box", "std", 0x2a2a2a, [0.4, 0.9, 6.1], [0.35, 0.35, 0.2]));
    target.parts.push(part("box", "std", 0x2a2a2a, [-0.4, 0.9, 6.1], [0.35, 0.35, 0.2]));
    target.colliders.push({ circle: 0.9, z: 5.3 });
    target.map.push({ box: [1.4, 5], color: bone, h: 2 });
    return target;
  },

  sandstoneArch: (rng) => {
    const target = createStructure(5);
    const color = jitter(0xc98a5a, rng, 0.05);
    block(target, "std", color, -2.6, 2, 0, 1.5, 4, 1.5);
    block(target, "std", color, 2.6, 2, 0, 1.5, 4, 1.5);
    block(target, "std", color, 0, 4.5, 0, 6.8, 1.2, 1.6, 0, false);
    return target;
  },

  mesa: (rng) => {
    const target = createStructure(6);
    const bands = [0xc98a5a, 0xb8764a, 0xd9a070, 0xa8663e];
    let width = rng.float(7, 9);
    let depth = rng.float(5, 7);
    let y = 0;
    for (let layer = 0; layer < 4; layer++) {
      const height = rng.float(1, 1.8);
      target.parts.push(part("box", "std", bands[layer], [rng.float(-0.3, 0.3), y + height / 2, rng.float(-0.3, 0.3)], [width, height, depth], [0, rng.float(-0.1, 0.1), 0]));
      y += height;
      width *= rng.float(0.8, 0.92);
      depth *= rng.float(0.8, 0.92);
    }
    const baseWidth = target.parts[0].s[0];
    const baseDepth = target.parts[0].s[2];
    target.colliders.push({ box: [baseWidth / 2, baseDepth / 2] });
    target.map.push({ box: [baseWidth / 2, baseDepth / 2], color: bands[0], h: y });
    return target;
  },

  rockRidge: (rng, options = {}) => {
    const target = createStructure(10);
    rockRidgeParts(target, rng, options.color ?? 0x6f6f6f, options);
    return target;
  },

  stiltHut: () => {
    const target = createStructure(5);
    const wood = 0x5a4430;
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      target.parts.push(part("cyl6", "std", wood, [x, 0.9, z], [0.28, 1.8, 0.28]));
      target.colliders.push({ circle: 0.16, x, z });
    }
    target.parts.push(part("box", "std", 0x6b5038, [0, 1.85, 0], [4.4, 0.25, 4.4]));
    target.parts.push(part("box", "std", 0x7a6048, [0, 3.05, 0], [3.2, 2.2, 3.2]));
    target.parts.push(part("roof", "std", 0x4a5a3a, [0, 4.15, 0], [3.9, 2, 3.7], [0, Math.PI / 2, 0]));
    target.parts.push(part("box", "window", 0xffffff, [0, 3.2, 1.62], [0.7, 0.6, 0.04]));
    for (const side of [-1, 1]) {
      target.parts.push(part("box", "std", wood, [side * 0.35, 0.95, 2.6], [0.1, 1.9, 0.1], [-0.35, 0, 0]));
    }
    for (let rung = 0; rung < 4; rung++) {
      target.parts.push(part("box", "std", wood, [0, 0.35 + rung * 0.42, 2.85 - rung * 0.15], [0.8, 0.07, 0.07]));
    }
    target.map.push({ box: [2.2, 2.2], color: 0x6b5038, h: 5 });
    return target;
  },

  witchHut: (rng) => {
    const target = createStructure(5);
    block(target, "std", 0x4a3a2e, 0, 1.2, 0, 3.2, 2.4, 3, 0.12);
    target.parts.push(part("cone6", "std", 0x2a2438, [0, 3.4, 0], [4.4, 2.6, 4.4], [0.1, 0, -0.12]));
    target.parts.push(part("box", "window", 0xffffff, [0, 1.3, 1.52], [0.6, 0.5, 0.04], [0, 0.12, 0]));
    target.parts.push(part("cyl8", "std", 0x1a1a1a, [2.8, 0.45, 1.2], [1.2, 0.8, 1.2]));
    target.parts.push(part("disc", "glowStrong", 0x6bff3a, [2.8, 0.86, 1.2], [1, 1, 1]));
    target.colliders.push({ circle: 0.6, x: 2.8, z: 1.2 });
    include(target, PREFABS.bones(rng), -2.6, 1.8);
    include(target, PREFABS.mushroom(rng, { glow: true }), -2.4, -1.6, 0, 1.5);
    return target;
  },

  sunkenRuins: (rng) => {
    const target = createStructure(6);
    target.zones.push({ circle: 4, zone: ZONE.WATER });
    for (const [x, z] of ringPositions(5, 3.4, rng, 0.3)) {
      const height = rng.float(0.8, 2.4);
      target.parts.push(part("box", "std", jitter(0x5a6a5a, rng), [x, height / 2 - 0.2, z], [0.9, height, 0.9], [rng.float(-0.2, 0.2), 0, rng.float(-0.2, 0.2)]));
      target.colliders.push({ circle: 0.5, x, z });
    }
    return target;
  },

  obsidianAltar: (rng) => {
    const target = createStructure(6);
    target.zones.push({ circle: 2, zone: ZONE.LAVA });
    for (const [x, z, angle] of ringPositions(6, 4.2, rng, 0.05)) {
      include(target, PREFABS.obsidian(rng), x, z, angle, rng.float(1.2, 1.6));
    }
    return target;
  },

  ventField: (rng) => {
    const target = createStructure(6);
    for (let i = 0; i < 3; i++) {
      include(target, PREFABS.vent(rng), rng.float(-4, 4), rng.float(-4, 4));
    }
    for (let i = 0; i < 2; i++) {
      include(target, PREFABS.basalt(rng), rng.float(-5, 5), rng.float(-5, 5), rng.float(0, 3));
    }
    return target;
  },

  basaltField: (rng) => {
    const target = createStructure(8);
    for (let i = 0; i < 6; i++) {
      include(target, PREFABS.basalt(rng), rng.float(-6, 6), rng.float(-6, 6), rng.float(0, 3), rng.float(1, 1.6));
    }
    return target;
  },

  crystalGarden: (rng) => {
    const target = createStructure(6);
    include(target, PREFABS.crystalSpire(rng), 0, 0);
    for (const [x, z] of ringPositions(6, 4.5, rng, 0.3)) {
      include(target, PREFABS.crystalCluster(rng), x, z, rng.float(0, 3));
    }
    return target;
  },

  geode: (rng) => {
    const target = createStructure(6);
    for (const [x, z, angle] of ringPositions(9, 3.8, rng, 0.05)) {
      if (rng.next() < 0.2) {
        continue;
      }
      target.parts.push(part("dodeca", "std", jitter(0x8a86a8, rng), [x, 0.9, z], [1.8, 2.2, 1.4], [0, -angle, 0]));
      target.colliders.push({ circle: 0.8, x, z });
    }
    for (let i = 0; i < 3; i++) {
      include(target, PREFABS.crystalCluster(rng, { scale: 1.3 }), rng.float(-1.5, 1.5), rng.float(-1.5, 1.5), rng.float(0, 3));
    }
    return target;
  },

  village: (rng, options = {}) => {
    const target = createStructure(9);
    const spots = [[-5.5, -4], [5, -5], [-4.5, 5], [5.5, 4.5]];
    const houses = 2 + rng.int(0, 2);
    for (let i = 0; i < houses; i++) {
      const [x, z] = spots[i];
      house(target, x + rng.float(-0.6, 0.6), z + rng.float(-0.6, 0.6), Math.atan2(-x, -z) + Math.PI, rng, options);
    }
    include(target, STRUCTURES.well(rng), 0, 0);
    include(target, PREFABS.lantern(), 2, 0);
    return target;
  },

  abandonedCamp: (rng) => {
    const target = createStructure(8);
    const fabrics = [0x9a4a3a, 0xb09a6a, 0x5a7a4a, 0x6a5a8a];
    for (const [x, z, angle] of ringPositions(2 + rng.int(0, 1), 4.6, rng, 0.4)) {
      const fabric = pickFrom(fabrics, rng);
      target.parts.push(part("cone4", "std", fabric, [x, 1, z], [2.8, 2, 2.8], [0, -angle + Math.PI / 4, 0]));
      target.parts.push(part("cyl5", "std", 0x5a3d2b, [x, 1.5, z], [0.08, 3, 0.08]));
      target.parts.push(part("box", "std", 0x1a1410, [x - Math.cos(angle) * 0.9, 0.5, z - Math.sin(angle) * 0.9], [0.7, 1, 0.05], [0, -angle + Math.PI / 2, 0]));
      target.colliders.push({ circle: 1.2, x, z });
      target.map.push({ circle: 1.3, x, z, color: fabric, h: 2 });
    }
    campfire(target, 0, 0, rng, false);
    for (let i = 0; i < 3; i++) {
      const angle = rng.float(0, Math.PI * 2);
      include(target, rng.next() < 0.6 ? PREFABS.crate(rng) : PREFABS.barrel(rng), Math.cos(angle) * 6.3, Math.sin(angle) * 6.3, rng.float(0, 3));
    }
    for (const side of [-1, 1]) {
      target.parts.push(part("cyl8", "std", 0x6b4a2b, [side * 2.2, 0.25, 0.6], [0.5, 2, 0.5], [0, 0, Math.PI / 2]));
    }
    target.parts.push(part("cyl5", "std", 0x5a3d2b, [-2.5, 2, -3], [0.1, 4, 0.1]));
    target.parts.push(part("box", "std", 0x8a2a2a, [-2, 3.5, -3], [1, 0.6, 0.04], [0, 0, -0.1]));
    target.colliders.push({ circle: 0.1, x: -2.5, z: -3 });
    target.poi = "camp";
    return target;
  },
};

export const BIOME_STRUCTURES = {
  forest: [
    ["stoneCircle", 2],
    ["ruins", 2],
    ["cabin", 2],
    ["well", 1],
    ["ancientTree", 2],
    ["mushroomRing", 1],
    ["village", 1.5],
    ["rockRidge", 2.5, { moss: true }],
  ],
  autumn: [
    ["pumpkinFarm", 2.5],
    ["windmill", 2],
    ["hayField", 2],
    ["cabin", 1.5, { autumn: true }],
    ["ruins", 1, { color: 0x7a7a6a }],
    ["village", 1.5, { roof: 0x8a3b1e }],
    ["rockRidge", 2, { color: 0x7a6a5a, moss: true }],
  ],
  snow: [
    ["iglooCamp", 2.5],
    ["iceSpikeField", 2],
    ["cabin", 2, { snowy: true }],
    ["village", 1, { snowy: true }],
    ["ruins", 1, { color: 0x9aa8b4 }],
    ["rockRidge", 2.5, { ice: true }],
  ],
  desert: [
    ["oasis", 2],
    ["pyramid", 1.5],
    ["obeliskRing", 1.5],
    ["ribcage", 2],
    ["sandstoneArch", 1.5],
    ["mesa", 3],
  ],
  swamp: [
    ["stiltHut", 2.5],
    ["witchHut", 2],
    ["sunkenRuins", 2],
    ["mushroomRing", 2, { glow: true }],
  ],
  volcanic: [
    ["obsidianAltar", 2],
    ["ventField", 2.5],
    ["ruins", 1.5, { color: 0x3a3230 }],
    ["basaltField", 3],
  ],
  crystal: [
    ["crystalGarden", 3],
    ["geode", 2.5],
    ["obeliskRing", 1.5, { color: 0xb8b4d8, crystal: true }],
    ["ruins", 1.5, { color: 0xa8a4c8, crystals: true }],
  ],
};

export function pickStructure(biome, rng) {
  const table = BIOME_STRUCTURES[biome];
  if (!table) {
    return null;
  }
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [name, weight, options] of table) {
    roll -= weight;
    if (roll <= 0) {
      return STRUCTURES[name](rng, options);
    }
  }
  return null;
}
