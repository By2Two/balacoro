import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getBudCount } from "./enemyTraits.js";

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const DOWN_ROTATION = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  Math.PI
);
const LOCAL_GROUND_Y = -0.46;

const spikeGeometry = new THREE.ConeGeometry(0.09, 0.3, 5);
const hornGeometry = new THREE.ConeGeometry(0.08, 0.34, 5);
const plateGeometry = new THREE.BoxGeometry(0.06, 0.3, 0.34);
const tailGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
const tailTipGeometry = new THREE.ConeGeometry(0.09, 0.24, 5);
tailTipGeometry.rotateX(-Math.PI / 2);
const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.32, 4);
const antennaTipGeometry = new THREE.SphereGeometry(0.05, 6, 5);
const eyeGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.14);
const scleraGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
const browGeometry = new THREE.BoxGeometry(0.22, 0.055, 0.08);
const mouthGeometry = new THREE.BoxGeometry(1, 0.06, 0.08);
const toothGeometry = new THREE.ConeGeometry(0.035, 0.1, 4);
const fangGeometry = new THREE.ConeGeometry(0.05, 0.19, 4);
const spotGeometry = new THREE.IcosahedronGeometry(0.1, 0);
const bellyGeometry = new THREE.SphereGeometry(0.3, 7, 5);
const legUnitGeometry = new THREE.CylinderGeometry(0.065, 0.045, 1, 5);
legUnitGeometry.translate(0, -0.5, 0);
const footGeometry = new THREE.BoxGeometry(0.13, 0.06, 0.18);
const armGeometry = new THREE.CylinderGeometry(0.075, 0.055, 0.36, 5);
armGeometry.translate(0, -0.18, 0);
const clawGeometry = new THREE.ConeGeometry(0.03, 0.12, 4);
const budGeometry = new THREE.IcosahedronGeometry(0.15, 1);
const seamGeometry = new THREE.TorusGeometry(0.62, 0.04, 5, 28);
seamGeometry.rotateY(Math.PI / 2);
const fuseGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.36, 6);
fuseGeometry.translate(0, 0.18, 0);
const fuseCapGeometry = new THREE.CylinderGeometry(0.13, 0.15, 0.1, 8);
const sparkGeometry = new THREE.IcosahedronGeometry(0.09, 0);
const cannonMountGeometry = new THREE.CylinderGeometry(0.24, 0.3, 0.14, 10);
const cannonBarrelGeometry = new THREE.CylinderGeometry(0.15, 0.19, 0.62, 10);
cannonBarrelGeometry.translate(0, 0.31, 0);
const cannonBandGeometry = new THREE.TorusGeometry(0.19, 0.035, 5, 14);
cannonBandGeometry.rotateX(Math.PI / 2);
const cannonBoreGeometry = new THREE.CircleGeometry(0.12, 12);
cannonBoreGeometry.rotateX(-Math.PI / 2);
const ribGeometry = new THREE.TorusGeometry(0.34, 0.028, 4, 10, Math.PI * 0.75);
ribGeometry.rotateZ(-Math.PI * 0.375);
const lowerToothGeometry = new THREE.ConeGeometry(0.04, 0.13, 4);
const wingGeometry = (() => {
  const geometry = new THREE.BufferGeometry();
  const rootFront = [0, 0, 0.12];
  const rootBack = [0, 0, -0.14];
  const tip = [0.62, 0.2, -0.1];
  const trailing = [0.4, -0.02, -0.36];
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [...rootFront, ...tip, ...rootBack, ...rootBack, ...tip, ...trailing],
      3
    )
  );
  geometry.computeVertexNormals();
  return geometry;
})();

export const MOUTH_TYPES = ["none", "teeth", "fangs"];
export const EYE_STYLES = ["bead", "googly", "slit"];
export const PATTERN_TYPES = ["none", "spots", "belly"];

function pick(options) {
  return options[Math.floor(Math.random() * options.length)];
}

export const eyeDayMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
});
export const eyeNightMaterial = new THREE.MeshBasicMaterial({
  color: 0xff2222,
});
const hornMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9d0c0,
  flatShading: true,
});
const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1b24,
  flatShading: true,
});
const plateMaterial = new THREE.MeshStandardMaterial({
  color: 0x30303c,
  flatShading: true,
});
const scleraMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1efe4,
  flatShading: true,
});
const reptileScleraMaterial = new THREE.MeshStandardMaterial({
  color: 0xffc83a,
  emissive: 0x3a2400,
  flatShading: true,
});
const mouthMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a0509,
  flatShading: true,
});
const wingMaterial = new THREE.MeshStandardMaterial({
  color: 0x22202c,
  flatShading: true,
  side: THREE.DoubleSide,
});
const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0x3c3f48,
  metalness: 0.6,
  roughness: 0.45,
  flatShading: true,
});
const boreMaterial = new THREE.MeshBasicMaterial({ color: 0x050505 });
const boneMaterial = new THREE.MeshStandardMaterial({
  color: 0xc9bfa5,
  flatShading: true,
});
const gumMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a0d14,
  emissive: 0x220205,
  flatShading: true,
});
const sparkMaterial = new THREE.MeshBasicMaterial({
  color: 0xffb020,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const toneMaterialCache = new Map();
function getToneMaterial(bodyMaterial, tone) {
  const key = `${tone}_${bodyMaterial.color.getHex()}_${bodyMaterial.emissive.getHex()}`;
  let material = toneMaterialCache.get(key);
  if (!material) {
    const hsl = { h: 0, s: 0, l: 0 };
    bodyMaterial.color.getHSL(hsl);
    const color =
      tone === "belly"
        ? new THREE.Color().setHSL(hsl.h, hsl.s * 0.55, Math.min(hsl.l * 1.35 + 0.12, 0.85))
        : new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 1.1, 1), hsl.l * 0.5);
    material = new THREE.MeshStandardMaterial({
      color,
      emissive: bodyMaterial.emissive.clone().multiplyScalar(0.6),
      flatShading: true,
    });
    toneMaterialCache.set(key, material);
  }
  return material;
}

const BODY_BASES = [
  () => new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
  () => new THREE.IcosahedronGeometry(0.62, 1),
  () => new THREE.OctahedronGeometry(0.62, 1),
  () => new THREE.DodecahedronGeometry(0.6, 0),
  () => {
    const geometry = new THREE.CapsuleGeometry(0.38, 0.5, 3, 8);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  },
  (rand) => new THREE.ConeGeometry(0.5, 1, 4 + Math.floor(rand() * 4)),
  (rand) =>
    new THREE.CylinderGeometry(
      0.3 + rand() * 0.15,
      0.38 + rand() * 0.15,
      0.9,
      6 + Math.floor(rand() * 3)
    ),
  (rand) =>
    new THREE.SphereGeometry(
      0.6,
      7 + Math.floor(rand() * 3),
      5 + Math.floor(rand() * 3)
    ),
];

function mulberry32(state) {
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DIFFICULTY_LAP_LENGTH = 6;
export const DIFFICULTY_COLOR_LAPS = 5;
const DIFFICULTY_FADE_LEVELS = 5;
const DIFFICULTY_LAPS_END = DIFFICULTY_LAP_LENGTH * DIFFICULTY_COLOR_LAPS;
export const DIFFICULTY_COLOR_MAX_LEVEL =
  DIFFICULTY_LAPS_END + DIFFICULTY_FADE_LEVELS;
export const SKULL_CRAZE_START = DIFFICULTY_COLOR_MAX_LEVEL - 6;

function difficultyColor(level) {
  const color = new THREE.Color();
  const clamped = Math.max(level, 0);
  if (clamped < DIFFICULTY_LAPS_END) {
    const lap = Math.floor(clamped / DIFFICULTY_LAP_LENGTH);
    const step = clamped % DIFFICULTY_LAP_LENGTH;
    color.setHSL(
      0.66 * (1 - step / (DIFFICULTY_LAP_LENGTH - 1)),
      1,
      0.5 - lap * 0.08
    );
  } else {
    const fade = Math.min(
      (clamped - DIFFICULTY_LAPS_END) / DIFFICULTY_FADE_LEVELS,
      1
    );
    color.setHSL(0, 1, 0.13 * (1 - fade));
  }
  return color;
}

export function getDifficultyColor(difficulty) {
  return difficultyColor(difficulty);
}

export function getDifficultyColorStyle(difficulty) {
  const color = difficultyColor(difficulty);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.5));
  return `#${color.getHexString()}`;
}

const bodyMaterialCache = new Map();
export function getBodyMaterial(difficulty, elite = false) {
  const key = `${difficulty}_${elite ? 1 : 0}`;
  let material = bodyMaterialCache.get(key);
  if (!material) {
    const color = difficultyColor(difficulty);
    let emissive = new THREE.Color(0x000000);
    if (elite) {
      emissive = color.clone().multiplyScalar(0.55);
    } else if (difficulty > 10) {
      emissive = color
        .clone()
        .multiplyScalar(Math.min(0.15 + (difficulty - 10) * 0.03, 0.7));
    }
    material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive,
    });
    bodyMaterialCache.set(key, material);
  }
  return material;
}

const ARCHETYPES = {
  swarm: {
    weight: 5,
    speed: [0.9, 1.15],
    health: [0.9, 1.2],
    damage: [0.9, 1.1],
    size: [0.9, 1.1],
    deform: [0.88, 1.12],
    stretch: { x: [0.85, 1.15], y: [0.85, 1.15], z: [0.85, 1.15] },
    bases: [0, 1, 2, 3, 4, 5, 6, 7],
    parts: () => ({
      spikes: Math.floor(Math.random() * 4),
      legs: Math.floor(Math.random() * 3) * 2,
      tailSegments:
        Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 0,
      plates: 0,
      horns: Math.random() < 0.15,
      antennae: Math.random() < 0.35,
      mouth: pick(MOUTH_TYPES),
      eyeStyle: pick(EYE_STYLES),
      pattern: pick(PATTERN_TYPES),
      wings: Math.random() < 0.2,
      arms: false,
      brows: Math.random() < 0.15,
    }),
  },
  runner: {
    weight: 2,
    speed: [1.6, 2.1],
    health: [0.35, 0.6],
    damage: [0.75, 0.95],
    size: [0.68, 0.85],
    deform: [0.94, 1.08],
    stretch: { x: [0.75, 0.9], y: [0.7, 0.9], z: [1.05, 1.35] },
    bases: [1, 4, 5, 7],
    parts: () => ({
      spikes: Math.floor(Math.random() * 2),
      legs: 4 + Math.floor(Math.random() * 2) * 2,
      tailSegments: 3 + Math.floor(Math.random() * 3),
      plates: 0,
      horns: false,
      antennae: Math.random() < 0.7,
      mouth: Math.random() < 0.6 ? "fangs" : "teeth",
      eyeStyle: Math.random() < 0.5 ? "slit" : "bead",
      pattern: Math.random() < 0.5 ? "spots" : "none",
      wings: Math.random() < 0.25,
      arms: false,
      brows: false,
    }),
  },
  tank: {
    weight: 2,
    speed: [0.45, 0.65],
    health: [2.6, 4],
    damage: [1.1, 1.4],
    size: [1.25, 1.5],
    deform: [0.82, 1.18],
    stretch: { x: [1.05, 1.25], y: [0.85, 1.1], z: [1, 1.2] },
    bases: [0, 2, 3, 6],
    parts: () => ({
      spikes: 3 + Math.floor(Math.random() * 4),
      legs: Math.floor(Math.random() * 2) * 2,
      tailSegments: 0,
      plates: 2 + Math.floor(Math.random() * 3),
      horns: Math.random() < 0.3,
      antennae: false,
      mouth: pick(["none", "teeth"]),
      eyeStyle: pick(["bead", "googly"]),
      pattern: Math.random() < 0.6 ? "belly" : "spots",
      wings: false,
      arms: Math.random() < 0.3,
      brows: Math.random() < 0.5,
    }),
  },
  brute: {
    weight: 1.5,
    speed: [0.8, 1],
    health: [1.4, 1.9],
    damage: [1.8, 2.4],
    size: [1.1, 1.3],
    deform: [0.85, 1.15],
    stretch: { x: [1, 1.2], y: [1, 1.25], z: [0.9, 1.1] },
    bases: [0, 2, 3, 6],
    parts: () => ({
      spikes: 2 + Math.floor(Math.random() * 3),
      legs: 2 + Math.floor(Math.random() * 2) * 2,
      tailSegments: Math.random() < 0.3 ? 2 : 0,
      plates: Math.floor(Math.random() * 3),
      horns: true,
      antennae: false,
      mouth: Math.random() < 0.6 ? "fangs" : "teeth",
      eyeStyle: pick(["bead", "slit"]),
      pattern: pick(PATTERN_TYPES),
      wings: false,
      arms: Math.random() < 0.75,
      brows: true,
    }),
  },
  splitter: {
    weight: 1.5,
    speed: [0.8, 1],
    health: [1.3, 1.7],
    damage: [0.9, 1.1],
    size: [1.05, 1.25],
    deform: [0.95, 1.05],
    stretch: { x: [1, 1.15], y: [0.8, 0.95], z: [1, 1.15] },
    bases: [1, 7],
    parts: () => ({
      spikes: 0,
      legs: 0,
      tailSegments: 0,
      plates: 0,
      horns: false,
      antennae: false,
      mouth: pick(["none", "teeth"]),
      eyeStyle: pick(["googly", "bead"]),
      pattern: "none",
      wings: false,
      arms: false,
      brows: false,
      seam: true,
      buds: getBudCount(0),
    }),
  },
  bomber: {
    weight: 1.2,
    speed: [1.25, 1.45],
    health: [0.55, 0.8],
    damage: [0.8, 1],
    size: [0.85, 1],
    deform: [0.96, 1.04],
    stretch: { x: [0.95, 1.05], y: [0.95, 1.05], z: [0.95, 1.05] },
    bases: [1, 7],
    parts: () => ({
      spikes: 0,
      legs: 2,
      tailSegments: 0,
      plates: 0,
      horns: false,
      antennae: false,
      mouth: "teeth",
      eyeStyle: pick(["googly", "slit"]),
      pattern: "none",
      wings: false,
      arms: false,
      brows: true,
      fuse: true,
    }),
  },
  stalker: {
    weight: 1.1,
    speed: [1.1, 1.3],
    health: [0.8, 1.1],
    damage: [1.4, 1.7],
    size: [0.95, 1.1],
    deform: [0.78, 1.22],
    stretch: { x: [0.72, 0.85], y: [1.2, 1.4], z: [0.8, 0.95] },
    bases: [1, 4, 7],
    parts: () => ({
      spikes: 4 + Math.floor(Math.random() * 3),
      legs: 2,
      tailSegments: 0,
      plates: 0,
      horns: false,
      antennae: false,
      mouth: "maw",
      eyeStyle: Math.random() < 0.5 ? "googly" : "slit",
      pattern: "spots",
      wings: false,
      arms: true,
      longArms: true,
      brows: false,
      ribs: true,
    }),
  },
  mortar: {
    weight: 1.1,
    speed: [0.55, 0.75],
    health: [1.3, 1.7],
    damage: [0.9, 1.1],
    size: [1.05, 1.2],
    deform: [0.9, 1.1],
    stretch: { x: [1.05, 1.2], y: [0.85, 1], z: [1, 1.15] },
    bases: [0, 3, 6],
    parts: () => ({
      spikes: 0,
      legs: 4,
      tailSegments: 0,
      plates: 2,
      horns: false,
      antennae: false,
      mouth: pick(["none", "teeth"]),
      eyeStyle: pick(["bead", "googly"]),
      pattern: "belly",
      wings: false,
      arms: false,
      brows: true,
      cannon: true,
    }),
  },
};

function randRange([min, max]) {
  return min + Math.random() * (max - min);
}

function pickArchetype() {
  const archetypeEntries = Object.entries(ARCHETYPES);
  const totalWeight = archetypeEntries.reduce(
    (sum, [, spec]) => sum + spec.weight,
    0
  );
  let remainingWeight = Math.random() * totalWeight;
  for (const [archetypeName, spec] of archetypeEntries) {
    remainingWeight -= spec.weight;
    if (remainingWeight <= 0) {
      return archetypeName;
    }
  }
  return "swarm";
}

function pickEyeCount() {
  const roll = Math.random();
  if (roll < 0.5) {
    return 2;
  }
  if (roll < 0.7) {
    return 1;
  }
  if (roll < 0.9) {
    return 3;
  }
  return 4;
}

export const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);

export function generateGenome(isBoss, forcedArchetype) {
  const archetype =
    forcedArchetype ??
    (isBoss ? (Math.random() < 0.5 ? "tank" : "brute") : pickArchetype());
  const spec = ARCHETYPES[archetype];

  return {
    archetype,
    coreSeed: Math.floor(Math.random() * 0xffffffff),
    speedMult: randRange(spec.speed),
    healthMult: randRange(spec.health),
    damageMult: randRange(spec.damage),
    sizeMult: randRange(spec.size),
    deformRange: spec.deform,
    baseIndex: spec.bases[Math.floor(Math.random() * spec.bases.length)],
    stretch: {
      x: randRange(spec.stretch.x),
      y: randRange(spec.stretch.y),
      z: randRange(spec.stretch.z),
    },
    eyeCount:
      archetype === "stalker"
        ? 4
        : archetype === "splitter" || archetype === "bomber" || archetype === "mortar"
          ? 2
          : pickEyeCount(),
    eyeScale: 0.75 + Math.random() * 0.7,
    parts: spec.parts(),
  };
}

function vertexHash(x, y, z, seed) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177) ^
    seed;
  h = Math.imul(h ^ (h >>> 13), 144665);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function createCoreGeometry(genome, rand) {
  const geometry = BODY_BASES[genome.baseIndex](rand);
  const [deformMin, deformMax] = genome.deformRange;

  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const mirroredX = Math.abs(vertex.x);
    const coarse = vertexHash(
      Math.round(mirroredX * 3),
      Math.round(vertex.y * 3),
      Math.round(vertex.z * 3),
      genome.coreSeed
    );
    const fine = vertexHash(
      Math.round(mirroredX * 997),
      Math.round(vertex.y * 997),
      Math.round(vertex.z * 997),
      genome.coreSeed ^ 0x9e3779b9
    );
    const blended = coarse * 0.7 + fine * 0.3;
    vertex.multiplyScalar(deformMin + blended * (deformMax - deformMin));
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

const EYE_LAYOUTS = {
  1: [[0, 0.2]],
  2: [
    [-0.2, 0.18],
    [0.2, 0.18],
  ],
  3: [
    [-0.22, 0.12],
    [0.22, 0.12],
    [0, 0.3],
  ],
  4: [
    [-0.2, 0.08],
    [0.2, 0.08],
    [-0.2, 0.3],
    [0.2, 0.3],
  ],
};

const clawsGeometry = (() => {
  const pieces = [-1, 0, 1].map((offset) => {
    const piece = clawGeometry.clone();
    piece.rotateX(Math.PI * 0.85);
    piece.translate(offset * 0.045, -0.4, 0.02);
    return piece;
  });
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) {
    piece.dispose();
  }
  return merged;
})();

function createSurfaceProbe(geometry) {
  const mesh = new THREE.Mesh(geometry, probeMaterial);
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();

  const cast = (originX, originY, originZ, dirX, dirY, dirZ) => {
    origin.set(originX, originY, originZ);
    direction.set(dirX, dirY, dirZ).normalize();
    raycaster.set(origin, direction);
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit) {
      return null;
    }
    const normal = hit.face
      ? hit.face.normal.clone()
      : direction.clone().negate();
    return { point: hit.point.clone(), normal };
  };

  const radial = (x, y, z) => {
    const outward = new THREE.Vector3(x, y, z);
    if (outward.lengthSq() < 1e-6) {
      outward.set(0, 1, 0);
    }
    outward.normalize();
    return (
      cast(
        outward.x * 3,
        outward.y * 3,
        outward.z * 3,
        -outward.x,
        -outward.y,
        -outward.z
      ) ?? { point: outward.clone().multiplyScalar(0.5), normal: outward }
    );
  };

  const front = (x, y) => cast(x, y, 3, 0, 0, -1) ?? radial(x, y, 0.5);

  return { cast, radial, front };
}

function createStaticBatch() {
  const buckets = new Map();
  const matrix = new THREE.Matrix4();

  const add = (material, geometry, position, quaternion, scale) => {
    matrix.compose(position, quaternion, scale);
    const transformed = geometry.clone().applyMatrix4(matrix);
    const flat = transformed.index ? transformed.toNonIndexed() : transformed;
    if (flat !== transformed) {
      transformed.dispose();
    }
    let list = buckets.get(material);
    if (!list) {
      list = [];
      buckets.set(material, list);
    }
    list.push(flat);
  };

  const build = () => {
    const meshes = [];
    for (const [material, list] of buckets) {
      const merged = mergeGeometries(list, false);
      for (const piece of list) {
        piece.dispose();
      }
      if (merged) {
        meshes.push(new THREE.Mesh(merged, material));
      }
    }
    return meshes;
  };

  return { add, build };
}

function facingRotation(normal) {
  const facing = normal.clone().add(FORWARD).normalize();
  return {
    facing,
    rotation: new THREE.Quaternion().setFromUnitVectors(FORWARD, facing),
  };
}

export function animateMonsterParts(animatedParts, time, speed) {
  for (const part of animatedParts) {
    const swing = Math.sin(
      time * speed * (part.kind === "wing" ? 2.5 : 1) + part.phase
    );
    if (part.kind === "leg") {
      part.mesh.rotation.x = swing * 0.6;
    } else if (part.kind === "tail") {
      part.mesh.position.x = swing * part.amplitude;
      part.mesh.rotation.y = swing * 0.35;
    } else if (part.kind === "antenna") {
      part.mesh.rotation.z = part.baseRotZ + swing * 0.18;
    } else if (part.kind === "arm") {
      part.mesh.rotation.x = part.baseRotX + swing * 0.4;
    } else if (part.kind === "wing") {
      part.mesh.rotation.z = part.side * (0.15 + swing * 0.6);
    } else if (part.kind === "bud") {
      part.mesh.scale.setScalar(part.baseScale * (1 + swing * 0.22));
    } else if (part.kind === "spark") {
      part.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
      part.mesh.rotation.y += 0.4;
    }
  }
}

export function buildMonsterBody(genome, bodyMaterial) {
  const rand = mulberry32(genome.coreSeed);
  const parts = genome.parts ?? {};
  const stretchX = genome.stretch?.x ?? 1;
  const stretchY = genome.stretch?.y ?? 1;
  const group = new THREE.Group();
  const coreGeometry = createCoreGeometry(genome, rand);
  const core = new THREE.Mesh(coreGeometry, bodyMaterial);
  group.add(core);

  const probe = createSurfaceProbe(coreGeometry);
  const batch = createStaticBatch();
  const pupilBatch = createStaticBatch();
  const ownedGeometries = [];
  const flashEntries = [{ mesh: core, material: bodyMaterial }];
  const animatedParts = [];
  const eyes = [];

  const eyeStyle = parts.eyeStyle ?? "bead";
  const layout = EYE_LAYOUTS[genome.eyeCount] ?? EYE_LAYOUTS[2];
  const countFactor = { 1: 1.7, 2: 1, 3: 0.85, 4: 0.72 }[genome.eyeCount] ?? 1;
  const eyeSize = genome.eyeScale * countFactor;
  const spread = 0.55 + eyeSize * 0.45;
  let lowestEyeY = Infinity;
  const topEyeY = Math.max(...layout.map(([, y]) => y));

  for (const [x, y] of layout) {
    const size = eyeSize * (0.92 + rand() * 0.16);
    const hit = probe.front(x * spread, y);
    const { facing, rotation } = facingRotation(hit.normal);
    const scaleX = size / stretchX;
    const scaleY = size / stretchY;

    if (eyeStyle === "bead") {
      pupilBatch.add(
        eyeDayMaterial,
        eyeGeometry,
        hit.point.clone().addScaledVector(facing, 0.02),
        rotation,
        new THREE.Vector3(scaleX, scaleY, 1)
      );
    } else {
      batch.add(
        eyeStyle === "slit" ? reptileScleraMaterial : scleraMaterial,
        scleraGeometry,
        hit.point.clone().addScaledVector(facing, 0.01),
        rotation,
        new THREE.Vector3(scaleX, scaleY, 1)
      );
      const pupilPosition = hit.point.clone().addScaledVector(facing, 0.05);
      if (eyeStyle === "googly") {
        pupilPosition.x += (rand() - 0.5) * 0.05 * scaleX;
        pupilPosition.y += (rand() - 0.5) * 0.05 * scaleY;
      }
      pupilBatch.add(
        eyeDayMaterial,
        eyeGeometry,
        pupilPosition,
        rotation,
        eyeStyle === "slit"
          ? new THREE.Vector3(scaleX * 0.28, scaleY * 1.1, 0.6)
          : new THREE.Vector3(scaleX * 0.6, scaleY * 0.6, 0.6)
      );
    }
    lowestEyeY = Math.min(lowestEyeY, y - 0.1 * size);
  }

  if (parts.brows) {
    const topRow = layout.filter(([, y]) => y === topEyeY);
    const browXs =
      topRow.length === 1
        ? [-0.1 * eyeSize, 0.1 * eyeSize]
        : topRow.map(([x]) => x * spread);
    const browY = topEyeY + eyeSize * 0.1 + 0.07;
    for (const browX of browXs) {
      const side = Math.sign(browX);
      const hit = probe.front(browX, browY);
      const { facing, rotation } = facingRotation(hit.normal);
      rotation.multiply(
        new THREE.Quaternion().setFromAxisAngle(FORWARD, side * 0.4)
      );
      batch.add(
        darkMaterial,
        browGeometry,
        hit.point.clone().addScaledVector(facing, 0.03),
        rotation,
        new THREE.Vector3(
          (topRow.length === 1 ? 0.6 : 1) * (eyeSize / stretchX),
          1 / stretchY,
          1
        )
      );
    }
  }

  const mouth = parts.mouth ?? "none";
  if (mouth === "maw") {
    const mouthY = Math.max(lowestEyeY - 0.2, -0.3);
    const width = ((0.2 + 0.1 * spread) / stretchX) * 1.7;
    const half = 0.095 / stretchY;
    const center = probe.front(0, mouthY);
    const { facing, rotation } = facingRotation(center.normal);
    batch.add(
      gumMaterial,
      mouthGeometry,
      center.point.clone().addScaledVector(facing, 0.01),
      rotation,
      new THREE.Vector3(width, 3.2 / stretchY, 1)
    );
    const toothScale = new THREE.Vector3(1 / stretchX, 1 / stretchY, 1);
    const upperCount = 6;
    for (let i = 0; i < upperCount; i++) {
      const toothX = (i / (upperCount - 1) - 0.5) * width * 0.9;
      const hit = probe.front(toothX, mouthY + half);
      const toothFacing = facingRotation(hit.normal).facing;
      const isFang = i === 1 || i === upperCount - 2;
      const length = isFang ? 0.19 : 0.1;
      const position = hit.point.clone().addScaledVector(toothFacing, 0.03);
      position.y -= (length * 0.4) / stretchY;
      batch.add(
        hornMaterial,
        isFang ? fangGeometry : toothGeometry,
        position,
        DOWN_ROTATION,
        toothScale
      );
    }
    const lowerCount = 5;
    for (let i = 0; i < lowerCount; i++) {
      const toothX = (i / (lowerCount - 1) - 0.5) * width * 0.8 + (rand() - 0.5) * 0.03;
      const hit = probe.front(toothX, mouthY - half);
      const toothFacing = facingRotation(hit.normal).facing;
      const position = hit.point.clone().addScaledVector(toothFacing, 0.03);
      position.y += 0.05 / stretchY;
      batch.add(
        hornMaterial,
        lowerToothGeometry,
        position,
        new THREE.Quaternion(),
        toothScale
      );
    }
  } else if (mouth !== "none") {
    const mouthY = Math.max(lowestEyeY - 0.13, -0.3);
    const width = (0.2 + 0.1 * spread) / stretchX;
    const center = probe.front(0, mouthY);
    const { facing, rotation } = facingRotation(center.normal);
    batch.add(
      mouthMaterial,
      mouthGeometry,
      center.point.clone().addScaledVector(facing, 0.01),
      rotation,
      new THREE.Vector3(width, 1 / stretchY, 1)
    );

    const isFangs = mouth === "fangs";
    const toothCount = isFangs ? 2 : 4 + Math.floor(rand() * 3);
    const toothLength = isFangs ? 0.19 : 0.1;
    for (let i = 0; i < toothCount; i++) {
      const toothX = isFangs
        ? (i === 0 ? -1 : 1) * width * 0.3
        : (i / (toothCount - 1) - 0.5) * width * 0.85;
      const hit = probe.front(toothX, mouthY);
      const toothFacing = facingRotation(hit.normal).facing;
      const position = hit.point.clone().addScaledVector(toothFacing, 0.04);
      position.y -= toothLength * 0.35;
      batch.add(
        hornMaterial,
        isFangs ? fangGeometry : toothGeometry,
        position,
        DOWN_ROTATION,
        new THREE.Vector3(1 / stretchX, 1 / stretchY, 1)
      );
    }
  }

  for (let i = 0; i < (parts.spikes ?? 0); i++) {
    const ridgePosition = parts.spikes > 1 ? i / (parts.spikes - 1) : 0.5;
    const lean = new THREE.Vector3(
      (rand() - 0.5) * 0.2,
      1,
      -(ridgePosition - 0.35) * 0.8
    ).normalize();
    const hit = probe.radial(
      (rand() - 0.5) * 0.1,
      0.55,
      0.35 - ridgePosition * 0.75
    );
    const orient = hit.normal.clone().add(lean).normalize();
    const scale = 0.9 + rand() * 0.5 - Math.abs(ridgePosition - 0.5) * 0.5;
    batch.add(
      darkMaterial,
      spikeGeometry,
      hit.point.clone().addScaledVector(orient, 0.15 * scale - 0.04),
      new THREE.Quaternion().setFromUnitVectors(UP, orient),
      new THREE.Vector3(scale, scale, scale)
    );
  }

  if (parts.horns) {
    for (const side of [-1, 1]) {
      const scale = 1.1 + rand() * 0.5;
      const hit = probe.radial(side * 0.45, 1, 0.3);
      const orient = hit.normal
        .clone()
        .multiplyScalar(0.6)
        .add(new THREE.Vector3(side * 0.55, 0.8, 0.15))
        .normalize();
      batch.add(
        hornMaterial,
        hornGeometry,
        hit.point.clone().addScaledVector(orient, 0.17 * scale - 0.05),
        new THREE.Quaternion().setFromUnitVectors(UP, orient),
        new THREE.Vector3(scale, scale, scale)
      );
    }
  }

  for (let i = 0; i < (parts.plates ?? 0); i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -0.15 + Math.floor(i / 2) * 0.3;
    const hit =
      probe.cast(side * 3, 0.06, z, -side, 0, 0) ??
      probe.radial(side, 0.1, z);
    const orient = hit.normal.clone().setY(hit.normal.y * 0.3).normalize();
    batch.add(
      plateMaterial,
      plateGeometry,
      hit.point.clone().addScaledVector(orient, 0.02),
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        orient
      ),
      new THREE.Vector3(1, 1, 1)
    );
  }

  const pattern = parts.pattern ?? "none";
  if (pattern === "spots") {
    const accent = getToneMaterial(bodyMaterial, "accent");
    const pairCount = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < pairCount; i++) {
      const x = 0.15 + rand() * 0.55;
      const y = 0.35 + rand() * 0.8;
      const z = 0.25 - rand() * 1.1;
      const spotScale = new THREE.Vector3(
        1.1 + rand() * 0.9,
        0.35,
        1.1 + rand() * 0.9
      );
      for (const side of i === 0 ? [0] : [-1, 1]) {
        const hit = probe.radial(side * x, y, z);
        batch.add(
          accent,
          spotGeometry,
          hit.point.clone().addScaledVector(hit.normal, -0.015),
          new THREE.Quaternion().setFromUnitVectors(UP, hit.normal),
          spotScale
        );
      }
    }
  } else if (pattern === "belly") {
    const hit = probe.front(0, Math.max(lowestEyeY - 0.25, -0.28));
    batch.add(
      getToneMaterial(bodyMaterial, "belly"),
      bellyGeometry,
      hit.point.clone().addScaledVector(hit.normal, -0.035),
      new THREE.Quaternion().setFromUnitVectors(UP, hit.normal),
      new THREE.Vector3(1.05 / stretchX, 0.22, 1.1 / stretchY)
    );
  }

  const legPairs = Math.floor((parts.legs ?? 0) / 2);
  const legMatrix = new THREE.Matrix4();
  for (let pair = 0; pair < legPairs; pair++) {
    const z = legPairs > 1 ? -0.25 + (0.5 * pair) / (legPairs - 1) : 0;
    for (const side of [-1, 1]) {
      const below = probe.cast(side * 0.28, -3, z, 0, 1, 0);
      const hipY = below
        ? THREE.MathUtils.clamp(below.point.y + 0.06, -0.3, 0.1)
        : -0.3;
      const lateral = probe.cast(side * 3, hipY + 0.08, z, -side, 0, 0);
      const hipX =
        side *
        Math.max((lateral ? Math.abs(lateral.point.x) : 0.45) * 0.9, 0.16);
      const length = Math.max(hipY - LOCAL_GROUND_Y, 0.14);

      const shin = legUnitGeometry
        .clone()
        .applyMatrix4(legMatrix.makeScale(1, length, 1));
      const foot = footGeometry
        .clone()
        .applyMatrix4(legMatrix.makeTranslation(0, -length + 0.03, 0.04));
      const legGeometry = mergeGeometries([shin, foot]);
      shin.dispose();
      foot.dispose();
      ownedGeometries.push(legGeometry);

      const leg = new THREE.Group();
      leg.position.set(hipX, hipY, z);
      leg.rotation.z = side * 0.12;
      const legMesh = new THREE.Mesh(legGeometry, darkMaterial);
      leg.add(legMesh);
      group.add(leg);
      flashEntries.push({ mesh: legMesh, material: darkMaterial });
      animatedParts.push({
        mesh: leg,
        kind: "leg",
        phase: pair * 1.6 + (side > 0 ? Math.PI : 0),
      });
    }
  }

  const tailSegments = parts.tailSegments ?? 0;
  if (tailSegments > 0) {
    const back = probe.cast(0, 0.05, -3, 0, 0, 1);
    const backZ = back ? back.point.z : -0.45;
    for (let i = 0; i < tailSegments; i++) {
      const segment = new THREE.Mesh(tailGeometry, bodyMaterial);
      segment.scale.setScalar(Math.max(1 - i * 0.16, 0.25));
      segment.position.set(0, 0.05 + i * 0.03, backZ + 0.04 - i * 0.16);
      group.add(segment);
      flashEntries.push({ mesh: segment, material: bodyMaterial });
      animatedParts.push({
        mesh: segment,
        kind: "tail",
        phase: i * 0.7,
        amplitude: 0.04 + i * 0.03,
      });
      if (i === tailSegments - 1) {
        const tip = new THREE.Mesh(tailTipGeometry, darkMaterial);
        tip.position.z = -0.15;
        segment.add(tip);
        flashEntries.push({ mesh: tip, material: darkMaterial });
      }
    }
  }

  if (parts.arms) {
    for (const side of [-1, 1]) {
      const shoulder = probe.cast(side * 3, 0.02, 0.1, -side, 0, 0);
      const arm = new THREE.Group();
      arm.position.set(
        (shoulder ? shoulder.point.x : side * 0.45) - side * 0.03,
        0.02,
        0.1
      );
      arm.rotation.set(-0.55, 0, side * 0.35);
      if (parts.longArms) {
        arm.scale.set(1.15, 1.9, 1.15);
      }
      const armMesh = new THREE.Mesh(armGeometry, bodyMaterial);
      const claws = new THREE.Mesh(clawsGeometry, hornMaterial);
      arm.add(armMesh, claws);
      group.add(arm);
      flashEntries.push(
        { mesh: armMesh, material: bodyMaterial },
        { mesh: claws, material: hornMaterial }
      );
      animatedParts.push({
        mesh: arm,
        kind: "arm",
        phase: side > 0 ? 0 : Math.PI,
        baseRotX: -0.55,
      });
    }
  }

  if (parts.wings) {
    for (const side of [-1, 1]) {
      const root = probe.radial(side * 0.5, 0.7, -0.35);
      const wing = new THREE.Group();
      wing.position.copy(root.point).addScaledVector(root.normal, -0.02);
      wing.scale.x = side;
      const wingMesh = new THREE.Mesh(wingGeometry, wingMaterial);
      wing.add(wingMesh);
      group.add(wing);
      flashEntries.push({ mesh: wingMesh, material: wingMaterial });
      animatedParts.push({ mesh: wing, kind: "wing", phase: 0, side });
    }
  }

  if (parts.antennae) {
    for (const side of [-1, 1]) {
      const root = probe.radial(side * 0.25, 1, 0.3);
      const antenna = new THREE.Group();
      const stalk = new THREE.Mesh(antennaGeometry, darkMaterial);
      stalk.position.y = 0.16;
      const tip = new THREE.Mesh(antennaTipGeometry, hornMaterial);
      tip.position.y = 0.34;
      antenna.add(stalk, tip);
      antenna.position.copy(root.point).addScaledVector(root.normal, -0.02);
      antenna.rotation.z = -side * 0.3;
      group.add(antenna);
      flashEntries.push(
        { mesh: stalk, material: darkMaterial },
        { mesh: tip, material: hornMaterial }
      );
      animatedParts.push({
        mesh: antenna,
        kind: "antenna",
        phase: side * 1.3,
        baseRotZ: -side * 0.3,
      });
    }
  }

  if (parts.seam) {
    const seam = new THREE.Mesh(seamGeometry, darkMaterial);
    core.add(seam);
    flashEntries.push({ mesh: seam, material: darkMaterial });
  }

  if (parts.fuse) {
    const top = probe.radial(0, 1, -0.05);
    const fuse = new THREE.Group();
    fuse.position.copy(top.point).addScaledVector(top.normal, -0.02);
    fuse.rotation.z = 0.3;
    fuse.scale.set(1 / stretchX, 1 / stretchY, 1);
    const cap = new THREE.Mesh(fuseCapGeometry, plateMaterial);
    const stalk = new THREE.Mesh(fuseGeometry, darkMaterial);
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.y = 0.38;
    fuse.add(cap, stalk, spark);
    group.add(fuse);
    flashEntries.push(
      { mesh: cap, material: plateMaterial },
      { mesh: stalk, material: darkMaterial }
    );
    animatedParts.push({ mesh: spark, kind: "spark", phase: 0 });
  }

  if (parts.ribs) {
    const flip = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
    const identity = new THREE.Quaternion();
    for (let i = 0; i < 3; i++) {
      const z = 0.14 - i * 0.2;
      const y = -0.02 - i * 0.03;
      for (const side of [-1, 1]) {
        const hit =
          probe.cast(side * 3, y, z, -side, 0, 0) ?? probe.radial(side, y, z);
        const scale = 0.85 + rand() * 0.3;
        batch.add(
          boneMaterial,
          ribGeometry,
          new THREE.Vector3(hit.point.x - side * (0.34 * scale - 0.035), y, z),
          side > 0 ? identity : flip,
          new THREE.Vector3(scale, scale, scale)
        );
      }
    }
  }

  let cannon = null;
  if (parts.cannon) {
    const top = probe.radial(0, 1, -0.45);
    const mount = new THREE.Group();
    mount.position.copy(top.point).addScaledVector(top.normal, -0.03);
    mount.scale.set(1 / stretchX, 1 / stretchY, 1);
    const base = new THREE.Mesh(cannonMountGeometry, metalMaterial);
    const pivot = new THREE.Group();
    pivot.position.y = 0.05;
    pivot.rotation.x = 0.5;
    const barrel = new THREE.Group();
    const barrelMesh = new THREE.Mesh(cannonBarrelGeometry, metalMaterial);
    const bandLow = new THREE.Mesh(cannonBandGeometry, darkMaterial);
    bandLow.position.y = 0.18;
    const bandHigh = new THREE.Mesh(cannonBandGeometry, darkMaterial);
    bandHigh.position.y = 0.58;
    const bore = new THREE.Mesh(cannonBoreGeometry, boreMaterial);
    bore.position.y = 0.625;
    const muzzle = new THREE.Object3D();
    muzzle.position.y = 0.7;
    barrel.add(barrelMesh, bandLow, bandHigh, bore, muzzle);
    pivot.add(barrel);
    mount.add(base, pivot);
    group.add(mount);
    flashEntries.push(
      { mesh: base, material: metalMaterial },
      { mesh: barrelMesh, material: metalMaterial },
      { mesh: bandLow, material: darkMaterial },
      { mesh: bandHigh, material: darkMaterial },
      { mesh: bore, material: boreMaterial }
    );
    cannon = { barrel, muzzle, pivot };
  }

  const budCount = parts.buds ?? 0;
  for (let i = 0; i < budCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    const hit = probe.radial(
      side * (0.55 + rand() * 0.2),
      0.45 + row * 0.35 + rand() * 0.15,
      0.2 - row * 0.45 + (rand() - 0.5) * 0.2
    );
    const bud = new THREE.Mesh(budGeometry, bodyMaterial);
    const baseScale = 0.9 + rand() * 0.35;
    bud.position.copy(hit.point).addScaledVector(hit.normal, 0.04);
    bud.scale.setScalar(baseScale);
    core.add(bud);
    flashEntries.push({ mesh: bud, material: bodyMaterial });
    animatedParts.push({
      mesh: bud,
      kind: "bud",
      phase: i * 1.7,
      baseScale,
    });
  }

  for (const mesh of batch.build()) {
    group.add(mesh);
    ownedGeometries.push(mesh.geometry);
    flashEntries.push({ mesh, material: mesh.material });
  }
  for (const mesh of pupilBatch.build()) {
    group.add(mesh);
    ownedGeometries.push(mesh.geometry);
    eyes.push(mesh);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    group,
    core,
    coreGeometry,
    ownedGeometries,
    flashEntries,
    eyes,
    animatedParts,
    cannon,
  };
}
