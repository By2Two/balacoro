import * as THREE from "three";
import { part } from "./instancing.js";

const scratchColor = new THREE.Color();

export function jitter(hex, rng, amount = 0.1) {
  scratchColor.set(hex).multiplyScalar(1 - amount + rng.next() * amount * 2);
  return scratchColor.getHex();
}

export function pickFrom(list, rng) {
  return list[Math.floor(rng.next() * list.length)];
}

const BARK = 0x5e4027;
const DARK_BARK = 0x3a2a1c;
const FOREST_LEAVES = [0x2f6b2a, 0x3b7d32, 0x2a5f2e, 0x467f2b, 0x1f5a2a];
const AUTUMN_LEAVES = [0xd9822b, 0xc0392b, 0xe5b33a, 0xa8541c, 0xd65a1f];
const CRYSTAL_COLORS = [0x5ff3ff, 0xff5fe0, 0xa36bff, 0xe8f7ff, 0x6bffb5];
const MUSHROOM_GLOW = [0x5fffd0, 0x7fd0ff, 0xc77dff];

function roundTree(rng, palette, options = {}) {
  const height = rng.float(1.6, 2.6) * (options.heightScale ?? 1);
  const leafColor = jitter(pickFrom(palette, rng), rng, 0.08);
  const parts = [
    part("taper6", "std", jitter(options.bark ?? BARK, rng), [0, height / 2, 0], [0.45, height, 0.45]),
  ];
  const blobs = 2 + rng.int(0, 1);
  for (let i = 0; i < blobs; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const offset = i === 0 ? 0 : rng.float(0.4, 0.7);
    const size = rng.float(1.5, 2.3) * (i === 0 ? 1.1 : 0.8);
    parts.push(
      part(
        "ico1",
        "leaf",
        jitter(leafColor, rng, 0.06),
        [Math.cos(angle) * offset, height + rng.float(0.3, 0.9), Math.sin(angle) * offset],
        [size, size * rng.float(0.8, 1), size],
        [rng.float(0, 3), rng.float(0, 3), 0]
      )
    );
  }
  return {
    parts,
    colliders: [{ circle: 0.32 }],
    map: [{ circle: 1.2, color: leafColor, h: height + 1 }],
    radius: 1.3,
  };
}

export const PREFABS = {
  oak: (rng) => roundTree(rng, FOREST_LEAVES),
  autumnTree: (rng) => roundTree(rng, AUTUMN_LEAVES, { bark: 0x5a3a22 }),

  birch: (rng) => {
    const height = rng.float(2.8, 3.8);
    const leaf = jitter(pickFrom([0x8fbf4a, 0xa6c85a, 0x79ad3f], rng), rng);
    return {
      parts: [
        part("cyl6", "std", 0xe8e4d8, [0, height / 2, 0], [0.3, height, 0.3]),
        part("box", "std", 0x2a2a2a, [0.13, height * 0.35, 0], [0.06, 0.12, 0.18]),
        part("box", "std", 0x2a2a2a, [-0.12, height * 0.6, 0.05], [0.06, 0.1, 0.16]),
        part("ico1", "leaf", leaf, [0, height + 0.3, 0], [1.3, 1.6, 1.3]),
        part("ico1", "leaf", jitter(leaf, rng), [0.3, height - 0.3, 0.2], [0.9, 1, 0.9]),
      ],
      colliders: [{ circle: 0.22 }],
      map: [{ circle: 0.8, color: leaf, h: height + 1 }],
      radius: 0.9,
    };
  },

  pine: (rng, options = {}) => {
    const trunk = rng.float(1, 1.6);
    const tierHeight = rng.float(1, 1.3);
    const radius = rng.float(1, 1.4);
    const leaf = jitter(options.snowy ? 0x2c5e48 : 0x2f6f4f, rng, 0.1);
    const parts = [
      part("cyl6", "std", jitter(0x5a3d2b, rng), [0, trunk / 2, 0], [0.35, trunk, 0.35]),
    ];
    for (let tier = 0; tier < 3; tier++) {
      const tierRadius = radius * (1 - tier * 0.25);
      const y = trunk + tier * tierHeight * 0.7 + tierHeight / 2;
      parts.push(part("cone8", "leaf", leaf, [0, y, 0], [tierRadius * 2, tierHeight, tierRadius * 2]));
      if (options.snowy) {
        parts.push(
          part("cone8", "std", 0xf4f9ff, [0, y + tierHeight * 0.3, 0], [tierRadius * 1.1, tierHeight * 0.45, tierRadius * 1.1])
        );
      }
    }
    return {
      parts,
      colliders: [{ circle: 0.3 }],
      map: [{ circle: radius, color: leaf, h: trunk + tierHeight * 2.5 }],
      radius: radius,
    };
  },

  bush: (rng, options = {}) => {
    const color = jitter(pickFrom(options.palette ?? [0x2e6b34, 0x3a7a3a, 0x285c2d], rng), rng);
    const parts = [part("ico1", "leaf", color, [0, 0.35, 0], [1.1, 0.8, 1.1], [0, rng.float(0, 3), 0])];
    if (rng.next() < 0.6) {
      parts.push(part("ico1", "leaf", jitter(color, rng), [0.45, 0.25, 0.2], [0.7, 0.55, 0.7]));
    }
    if (options.berries) {
      for (let i = 0; i < 3; i++) {
        parts.push(part("sphere", "std", 0xc0392b, [rng.float(-0.4, 0.4), rng.float(0.4, 0.7), rng.float(0.2, 0.5)], 0.1));
      }
    }
    return { parts, colliders: [], map: [{ circle: 0.5, color, h: 0.6 }], radius: 0.6 };
  },

  rock: (rng, options = {}) => {
    const color = jitter(options.color ?? 0x6f6f6f, rng, 0.12);
    const parts = [
      part("dodeca", options.material ?? "std", color, [0, 0.3, 0], [1.1, rng.float(0.7, 1), 1], [rng.float(0, 3), rng.float(0, 3), rng.float(0, 3)]),
    ];
    if (options.moss) {
      parts.push(part("dome", "std", jitter(0x4a7a32, rng), [0, 0.62, 0], [0.8, 0.3, 0.8]));
    }
    return {
      parts,
      colliders: [{ circle: 0.48 }],
      map: [{ circle: 0.55, color, h: 0.8 }],
      radius: 0.6,
    };
  },

  log: (rng) => ({
    parts: [
      part("cyl8", "std", jitter(BARK, rng), [0, 0.3, 0], [0.6, 3, 0.6], [0, 0, Math.PI / 2]),
      part("cyl8", "std", 0xc9a26b, [1.51, 0.3, 0], [0.5, 0.03, 0.5], [0, 0, Math.PI / 2]),
      part("cyl8", "std", 0xc9a26b, [-1.51, 0.3, 0], [0.5, 0.03, 0.5], [0, 0, Math.PI / 2]),
      part("dome", "std", 0x4a7a32, [0.4, 0.55, 0], [0.7, 0.2, 0.5]),
    ],
    colliders: [{ box: [1.5, 0.32] }],
    map: [{ box: [1.5, 0.3], color: BARK, h: 0.6 }],
    radius: 1.6,
  }),

  stump: (rng) => ({
    parts: [
      part("cyl8", "std", jitter(BARK, rng), [0, 0.25, 0], [0.8, 0.5, 0.8]),
      part("cyl8", "std", 0xc9a26b, [0, 0.51, 0], [0.7, 0.02, 0.7]),
    ],
    colliders: [{ circle: 0.4 }],
    map: [{ circle: 0.4, color: BARK, h: 0.5 }],
    radius: 0.5,
  }),

  mushroom: (rng, options = {}) => {
    const parts = [];
    const count = 1 + rng.int(0, 2);
    for (let i = 0; i < count; i++) {
      const x = rng.float(-0.3, 0.3);
      const z = rng.float(-0.3, 0.3);
      const height = rng.float(0.2, 0.45);
      const glow = options.glow;
      parts.push(part("cyl6", "std", 0xf0e6d2, [x, height / 2, z], [0.08, height, 0.08]));
      parts.push(
        part(
          "dome",
          glow ? "glow" : "std",
          glow ? pickFrom(MUSHROOM_GLOW, rng) : 0xc0392b,
          [x, height, z],
          [0.35, 0.22, 0.35]
        )
      );
    }
    return { parts, colliders: [], map: [], radius: 0.4 };
  },

  flowers: (rng) => {
    const parts = [];
    const colors = [0xff6b9a, 0xffd23e, 0xffffff, 0xb07cff, 0xff8a3d];
    for (let i = 0; i < 4; i++) {
      const x = rng.float(-0.35, 0.35);
      const z = rng.float(-0.35, 0.35);
      parts.push(part("tuft", "grass", 0x3f7a2e, [x, 0, z], [0.6, 0.3, 0.6]));
      parts.push(part("box", "decal", pickFrom(colors, rng), [x, 0.3, z], 0.09));
    }
    return { parts, colliders: [], map: [], radius: 0.4 };
  },

  tuft: (rng, options = {}) => ({
    parts: [part("tuft", "grass", jitter(options.color ?? 0x3f7a2e, rng, 0.12), [0, 0, 0], [1, rng.float(0.35, 0.6), 1], [0, rng.float(0, 3), 0])],
    colliders: [],
    map: [],
    radius: 0.2,
  }),

  tallGrass: (rng, options = {}) => ({
    parts: [
      part(
        "blades",
        "tallGrass",
        jitter(options.color ?? 0x3b6b2a, rng, 0.12),
        [0, 0, 0],
        [rng.float(1.1, 1.5), rng.float(1.1, 1.5), rng.float(1.1, 1.5)],
        [0, rng.float(0, 3), 0]
      ),
    ],
    colliders: [],
    map: [],
    radius: 0.3,
  }),

  pumpkin: (rng) => {
    const size = rng.float(0.7, 1.1);
    return {
      parts: [
        part("sphere", "std", jitter(0xe67e22, rng), [0, 0.3 * size, 0], [size, size * 0.65, size]),
        part("cyl5", "std", 0x3f6b2a, [0, 0.62 * size, 0], [0.08, 0.2, 0.08]),
      ],
      colliders: [{ circle: 0.42 * size }],
      map: [{ circle: 0.45 * size, color: 0xe67e22, h: 0.6 }],
      radius: 0.6,
    };
  },

  hayBale: (rng) => ({
    parts: [part("cyl8", "std", jitter(0xd8b54a, rng), [0, 0.55, 0], [1.1, 1.3, 1.1], [0, 0, Math.PI / 2])],
    colliders: [{ box: [0.66, 0.55] }],
    map: [{ box: [0.66, 0.55], color: 0xd8b54a, h: 1.1 }],
    radius: 0.9,
  }),

  leafPile: (rng) => ({
    parts: [part("dome", "decal", jitter(pickFrom(AUTUMN_LEAVES, rng), rng), [0, 0, 0], [rng.float(1, 1.6), 0.35, rng.float(1, 1.6)])],
    colliders: [],
    map: [],
    radius: 0.8,
  }),

  iceRock: (rng) => {
    const color = jitter(0xbfe9ff, rng, 0.06);
    return {
      parts: [part("octa", "glossy", color, [0, 0.45, 0], [1, rng.float(1, 1.5), 1], [0, rng.float(0, 3), rng.float(-0.2, 0.2)])],
      colliders: [{ circle: 0.42 }],
      map: [{ circle: 0.5, color, h: 1 }],
      radius: 0.6,
    };
  },

  iceSpike: (rng) => {
    const height = rng.float(1.5, 3.2);
    return {
      parts: [
        part("cone6", "glow", 0x3b7fa0, [0, height / 2, 0], [0.7, height, 0.7], [rng.float(-0.15, 0.15), 0, rng.float(-0.15, 0.15)]),
      ],
      colliders: [{ circle: 0.3 }],
      map: [{ circle: 0.35, color: 0x9fd8f0, h: height }],
      radius: 0.5,
    };
  },

  snowDrift: (rng) => ({
    parts: [part("dome", "decal", 0xf4f9ff, [0, 0, 0], [rng.float(1.2, 2.4), rng.float(0.4, 0.7), rng.float(1, 1.8)], [0, rng.float(0, 3), 0])],
    colliders: [],
    map: [],
    radius: 1,
  }),

  saguaro: (rng) => {
    const height = rng.float(2, 3.2);
    const color = jitter(0x2e8b57, rng);
    const parts = [
      part("cyl8", "std", color, [0, height / 2, 0], [0.45, height, 0.45]),
      part("sphere", "std", color, [0, height, 0], [0.45, 0.3, 0.45]),
    ];
    const arms = rng.int(0, 2);
    for (let i = 0; i < arms; i++) {
      const side = i === 0 ? 1 : -1;
      const armY = rng.float(height * 0.35, height * 0.6);
      const armHeight = rng.float(0.6, 1);
      parts.push(part("cyl8", "std", color, [side * 0.4, armY, 0], [0.26, 0.5, 0.26], [0, 0, Math.PI / 2]));
      parts.push(part("cyl8", "std", color, [side * 0.62, armY + armHeight / 2, 0], [0.26, armHeight, 0.26]));
    }
    return {
      parts,
      colliders: [{ circle: 0.3 }],
      map: [{ circle: 0.35, color, h: height }],
      radius: 0.7,
    };
  },

  barrelCactus: (rng) => ({
    parts: [
      part("sphere", "std", jitter(0x3c8f4a, rng), [0, 0.3, 0], [0.7, 0.6, 0.7]),
      part("box", "decal", 0xff6b9a, [0, 0.62, 0], 0.1),
    ],
    colliders: [{ circle: 0.33 }],
    map: [{ circle: 0.35, color: 0x3c8f4a, h: 0.6 }],
    radius: 0.4,
  }),

  deadBush: (rng) => {
    const parts = [];
    for (let i = 0; i < 4; i++) {
      parts.push(
        part("cyl5", "std", 0x8a6a45, [0, 0.25, 0], [0.05, 0.6, 0.05], [rng.float(-0.8, 0.8), 0, rng.float(-0.8, 0.8)])
      );
    }
    return { parts, colliders: [], map: [], radius: 0.4 };
  },

  pebbles: (rng, options = {}) => {
    const parts = [];
    for (let i = 0; i < 4; i++) {
      parts.push(
        part(
          options.crystal ? "octa" : "dodeca",
          options.crystal ? "glow" : "decal",
          options.crystal ? pickFrom(CRYSTAL_COLORS, rng) : jitter(options.color ?? 0x8b7355, rng),
          [rng.float(-0.5, 0.5), 0.06, rng.float(-0.5, 0.5)],
          rng.float(0.12, 0.25),
          [rng.float(0, 3), rng.float(0, 3), 0]
        )
      );
    }
    return { parts, colliders: [], map: [], radius: 0.5 };
  },

  deadTree: (rng, options = {}) => {
    const color = jitter(options.color ?? 0x3b3229, rng);
    const height = rng.float(2.2, 3.4);
    const lean = rng.float(-0.2, 0.2);
    const parts = [
      part("taper6", "std", color, [0, height * 0.35, 0], [0.4, height * 0.7, 0.4], [0, 0, lean]),
      part("taper6", "std", color, [-lean * height * 0.6, height * 0.8, 0], [0.26, height * 0.5, 0.26], [0.2, 0, -lean]),
    ];
    for (let i = 0; i < 3; i++) {
      const angle = rng.float(0, Math.PI * 2);
      parts.push(
        part(
          "cyl5",
          "std",
          color,
          [Math.cos(angle) * 0.35, height * rng.float(0.55, 0.85), Math.sin(angle) * 0.35],
          [0.1, rng.float(0.7, 1.2), 0.1],
          [Math.sin(angle) * 0.9, 0, -Math.cos(angle) * 0.9]
        )
      );
    }
    return {
      parts,
      colliders: [{ circle: 0.28 }],
      map: [{ circle: 0.5, color, h: height }],
      radius: 0.8,
    };
  },

  willow: (rng) => {
    const height = rng.float(2.4, 3.2);
    const leaf = jitter(0x4a6b2a, rng);
    const parts = [
      part("taper6", "std", jitter(DARK_BARK, rng), [0, height / 2, 0], [0.5, height, 0.5]),
      part("ico1", "leaf", leaf, [0, height + 0.3, 0], [2.6, 1.3, 2.6]),
    ];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      parts.push(
        part("cyl5", "leaf", jitter(leaf, rng), [Math.cos(angle) * 1.1, height - 0.5, Math.sin(angle) * 1.1], [0.12, rng.float(1.2, 1.8), 0.12])
      );
    }
    return {
      parts,
      colliders: [{ circle: 0.32 }],
      map: [{ circle: 1.3, color: leaf, h: height + 1 }],
      radius: 1.4,
    };
  },

  reeds: (rng) => {
    const parts = [part("blades", "tallGrass", jitter(0x5a7a3a, rng), [0, 0, 0], [0.8, rng.float(1.2, 1.7), 0.8])];
    for (let i = 0; i < 2; i++) {
      parts.push(part("cyl5", "std", 0x6b4a2b, [rng.float(-0.1, 0.1), rng.float(1.2, 1.5), rng.float(-0.1, 0.1)], [0.08, 0.3, 0.08]));
    }
    return { parts, colliders: [], map: [], radius: 0.3 };
  },

  lilyPad: (rng) => {
    const parts = [part("disc", "decal", jitter(0x3f8a3a, rng), [0, 0.06, 0], [rng.float(0.6, 0.9), 1, rng.float(0.6, 0.9)])];
    if (rng.next() < 0.3) {
      parts.push(part("octa", "glow", 0xff9ed0, [0.1, 0.12, 0.05], 0.14));
    }
    return { parts, colliders: [], map: [], radius: 0.4 };
  },

  basalt: (rng) => {
    const parts = [];
    const count = 4 + rng.int(0, 3);
    let maxHeight = 0;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng.float(0, 0.5);
      const distance = i === 0 ? 0 : rng.float(0.4, 0.8);
      const height = rng.float(1, 3.6);
      maxHeight = Math.max(maxHeight, height);
      parts.push(
        part("cyl6", "std", jitter(0x2e2a2a, rng, 0.15), [Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance], [0.7, height, 0.7])
      );
    }
    return {
      parts,
      colliders: [{ circle: 1.05 }],
      map: [{ circle: 1.1, color: 0x2e2a2a, h: maxHeight }],
      radius: 1.3,
    };
  },

  obsidian: (rng) => {
    const height = rng.float(1.4, 2.6);
    return {
      parts: [
        part("octa", "glossy", 0x16121c, [0, height / 2, 0], [0.8, height, 0.6], [rng.float(-0.2, 0.2), rng.float(0, 3), rng.float(-0.2, 0.2)]),
        part("octa", "glow", 0x3a1a5a, [0.3, 0.3, 0.2], [0.3, 0.6, 0.3], [0.3, 0, 0.4]),
      ],
      colliders: [{ circle: 0.36 }],
      map: [{ circle: 0.4, color: 0x16121c, h: height }],
      radius: 0.5,
    };
  },

  charredTree: (rng) => PREFABS.deadTree(rng, { color: 0x151212 }),

  vent: (rng) => ({
    parts: [
      part("cone8", "std", jitter(0x3a3230, rng), [0, 0.6, 0], [2, 1.2, 2]),
      part("disc", "glowStrong", 0xff6a1a, [0, 1.05, 0], [0.6, 1, 0.6]),
      part("octa", "glowStrong", 0xff9a3a, [0, 1.1, 0], [0.3, 0.2, 0.3]),
    ],
    colliders: [{ circle: 0.9 }],
    map: [{ circle: 1, color: 0x5a2a1a, h: 1.2 }],
    radius: 1.1,
  }),

  crystalCluster: (rng, options = {}) => {
    const parts = [part("dodeca", "std", 0xb8b4d8, [0, 0.15, 0], [1.3, 0.5, 1.3])];
    const count = 3 + rng.int(0, 3);
    const baseColor = pickFrom(CRYSTAL_COLORS, rng);
    let maxHeight = 0;
    for (let i = 0; i < count; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const height = rng.float(1.2, 2.6) * (options.scale ?? 1);
      maxHeight = Math.max(maxHeight, height);
      parts.push(
        part(
          "octa",
          "glow",
          rng.next() < 0.7 ? baseColor : pickFrom(CRYSTAL_COLORS, rng),
          [Math.cos(angle) * 0.3, height * 0.4, Math.sin(angle) * 0.3],
          [0.4, height, 0.4],
          [Math.sin(angle) * 0.35, 0, -Math.cos(angle) * 0.35]
        )
      );
    }
    return {
      parts,
      colliders: [{ circle: 0.6 }],
      map: [{ circle: 0.7, color: baseColor, h: maxHeight }],
      radius: 0.9,
    };
  },

  crystalSpire: (rng) => {
    const color = pickFrom(CRYSTAL_COLORS, rng);
    const height = rng.float(5, 7.5);
    return {
      parts: [
        part("octa", "glow", color, [0, height * 0.45, 0], [1.3, height, 1.3]),
        part("octa", "glow", color, [0.9, 0.9, 0.3], [0.5, 2, 0.5], [0, 0, -0.4]),
        part("octa", "glow", pickFrom(CRYSTAL_COLORS, rng), [-0.7, 0.7, -0.5], [0.45, 1.6, 0.45], [0.3, 0, 0.4]),
        part("dodeca", "std", 0xb8b4d8, [0, 0.2, 0], [2.2, 0.6, 2.2]),
      ],
      colliders: [{ circle: 1 }],
      map: [{ circle: 1.1, color, h: height }],
      radius: 1.4,
    };
  },

  palm: (rng) => {
    const height = rng.float(3.2, 4.4);
    const bend = rng.float(0.15, 0.3);
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      parts.push(
        part("cyl6", "std", jitter(0x9a7648, rng), [bend * t * t * 4, height * (t + 0.125), 0], [0.3 - t * 0.05, height / 4 + 0.05, 0.3 - t * 0.05], [0, 0, -bend * t])
      );
    }
    const topX = bend * 4 * 0.85;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      parts.push(
        part("cone4", "leaf", jitter(0x2e9e46, rng), [topX + Math.cos(angle) * 0.7, height + 0.1, Math.sin(angle) * 0.7], [0.5, 1.6, 0.15], [Math.sin(angle) * 1.2, -angle, -Math.cos(angle) * 1.2])
      );
    }
    return {
      parts,
      colliders: [{ circle: 0.25 }],
      map: [{ circle: 1, x: topX, color: 0x2e9e46, h: height }],
      radius: 1,
    };
  },

  lantern: () => ({
    parts: [
      part("cyl5", "metal", 0x2b2b2b, [0, 1, 0], [0.12, 2, 0.12]),
      part("box", "metal", 0x2b2b2b, [0, 2.05, 0], [0.32, 0.08, 0.32]),
      part("box", "glowStrong", 0xffb050, [0, 1.85, 0], [0.22, 0.3, 0.22]),
    ],
    colliders: [{ circle: 0.12 }],
    map: [{ circle: 0.2, color: 0xffb050, h: 2 }],
    radius: 0.3,
  }),

  signpost: (rng) => ({
    parts: [
      part("cyl5", "std", 0x6b4a2b, [0, 0.9, 0], [0.12, 1.8, 0.12]),
      part("box", "std", 0x9a7040, [0.35, 1.5, 0], [0.8, 0.25, 0.06], [0, 0, rng.float(-0.1, 0.1)]),
      part("box", "std", 0x8a6035, [-0.3, 1.2, 0], [0.7, 0.22, 0.06], [0, 0.4, 0]),
    ],
    colliders: [{ circle: 0.1 }],
    map: [],
    radius: 0.4,
  }),

  roadStone: (rng, options = {}) => ({
    parts: [part("dodeca", "decal", jitter(options.color ?? 0x8a8a8a, rng), [0, 0.05, 0], [rng.float(0.3, 0.5), 0.2, rng.float(0.3, 0.5)], [0, rng.float(0, 3), 0])],
    colliders: [],
    map: [],
    radius: 0.3,
  }),

  bones: (rng) => {
    const parts = [part("sphere", "std", 0xe8e0cc, [0, 0.2, 0], [0.45, 0.4, 0.5])];
    for (let i = 0; i < 3; i++) {
      parts.push(
        part("cyl5", "std", 0xe8e0cc, [rng.float(-0.6, 0.6), 0.06, rng.float(-0.6, 0.6)], [0.08, 0.7, 0.08], [Math.PI / 2, rng.float(0, 3), 0])
      );
    }
    return { parts, colliders: [], map: [], radius: 0.7 };
  },

  dune: (rng) => ({
    parts: [part("dome", "decal", jitter(0xd9b86c, rng, 0.05), [0, 0, 0], [rng.float(2, 3.5), rng.float(0.5, 0.9), rng.float(1.5, 2.5)], [0, rng.float(0, 3), 0])],
    colliders: [],
    map: [],
    radius: 1.5,
  }),

  crate: (rng) => {
    const size = rng.float(0.7, 1);
    return {
      parts: [
        part("box", "std", jitter(0x9a6b3a, rng), [0, size / 2, 0], size),
        part("box", "std", 0x6b4a25, [0, size / 2, size / 2 + 0.01], [size * 1.02, 0.1, 0.02]),
      ],
      colliders: [{ box: [size / 2, size / 2] }],
      map: [{ box: [size / 2, size / 2], color: 0x9a6b3a, h: size }],
      radius: size * 0.75,
    };
  },

  barrel: (rng) => ({
    parts: [
      part("cyl8", "std", jitter(0x7a4a25, rng), [0, 0.5, 0], [0.7, 1, 0.7]),
      part("cyl8", "metal", 0x3a3a3a, [0, 0.25, 0], [0.73, 0.06, 0.73]),
      part("cyl8", "metal", 0x3a3a3a, [0, 0.75, 0], [0.73, 0.06, 0.73]),
    ],
    colliders: [{ circle: 0.36 }],
    map: [{ circle: 0.36, color: 0x7a4a25, h: 1 }],
    radius: 0.45,
  }),
};
