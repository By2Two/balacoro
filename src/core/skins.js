import * as THREE from "three";

const textureCache = new Map();

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(key, size, draw, { srgb = true, pixelated = true } = {}) {
  let texture = textureCache.get(key);
  if (texture) {
    return texture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / (key === "env" ? 2 : 1);
  const context = canvas.getContext("2d");
  draw(context, canvas.width, canvas.height);
  texture = new THREE.CanvasTexture(canvas);
  if (pixelated) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  }
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  textureCache.set(key, texture);
  return texture;
}

function checkerTexture() {
  return canvasTexture("checker", 8, (context) => {
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        context.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#7d7d7d";
        context.fillRect(x * 2, y * 2, 2, 2);
      }
    }
  });
}

function woodTexture() {
  return canvasTexture("wood", 16, (context) => {
    const rand = seededRandom(7);
    context.fillStyle = "#9a6333";
    context.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const shade = 0.85 + rand() * 0.3;
      context.fillStyle = `rgb(${154 * shade}, ${99 * shade}, ${51 * shade})`;
      context.fillRect(0, row * 4, 16, 4);
      context.fillStyle = "#5a3a1c";
      context.fillRect(0, row * 4 + 3, 16, 1);
      const seam = Math.floor(rand() * 16);
      context.fillRect(seam, row * 4, 1, 3);
      for (let i = 0; i < 5; i++) {
        context.fillStyle = rand() < 0.5 ? "#7d4e26" : "#b07843";
        context.fillRect(Math.floor(rand() * 16), row * 4 + Math.floor(rand() * 3), 2 + Math.floor(rand() * 3), 1);
      }
    }
    context.fillStyle = "#5a3a1c";
    context.fillRect(10, 5, 2, 2);
  });
}

function neonTexture() {
  return canvasTexture("neon", 16, (context) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 16, 1);
    context.fillRect(0, 15, 16, 1);
    context.fillRect(0, 0, 1, 16);
    context.fillRect(15, 0, 1, 16);
    context.fillRect(4, 4, 8, 1);
    context.fillRect(4, 4, 1, 5);
    context.fillRect(11, 4, 1, 3);
    context.fillRect(8, 8, 4, 1);
    context.fillRect(8, 8, 1, 4);
    context.fillRect(3, 11, 6, 1);
    context.fillRect(3, 11, 1, 1);
    context.fillRect(12, 11, 1, 1);
  });
}

function galaxyTextures() {
  const rand = seededRandom(42);
  const stars = [];
  for (let i = 0; i < 26; i++) {
    stars.push([Math.floor(rand() * 32), Math.floor(rand() * 32), rand()]);
  }
  const blobs = [];
  for (let i = 0; i < 5; i++) {
    blobs.push([rand() * 32, rand() * 32, 6 + rand() * 8, rand()]);
  }
  const map = canvasTexture("galaxy", 32, (context) => {
    context.fillStyle = "#0b0620";
    context.fillRect(0, 0, 32, 32);
    for (const [x, y, radius, hue] of blobs) {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${230 + hue * 90}, 90%, 55%, 0.55)`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    for (const [x, y, brightness] of stars) {
      context.fillStyle = brightness > 0.7 ? "#ffffff" : "#b9c8ff";
      context.fillRect(x, y, 1, 1);
    }
  });
  const glow = canvasTexture("galaxyGlow", 32, (context) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 32, 32);
    for (const [x, y, radius, hue] of blobs) {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${230 + hue * 90}, 90%, 45%, 0.25)`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    for (const [x, y, brightness] of stars) {
      context.fillStyle = brightness > 0.5 ? "#ffffff" : "#8899ff";
      context.fillRect(x, y, 1, 1);
    }
  });
  return { map, glow };
}

function lavaTextures() {
  const rand = seededRandom(1337);
  const cracks = [];
  for (let walker = 0; walker < 5; walker++) {
    let x = Math.floor(rand() * 16);
    let y = Math.floor(rand() * 16);
    for (let step = 0; step < 12; step++) {
      cracks.push([(x + 16) % 16, (y + 16) % 16]);
      if (rand() < 0.5) {
        x += rand() < 0.5 ? 1 : -1;
      } else {
        y += rand() < 0.5 ? 1 : -1;
      }
    }
  }
  const rockShades = [];
  for (let i = 0; i < 256; i++) {
    rockShades.push(rand());
  }
  const map = canvasTexture("lava", 16, (context) => {
    for (let i = 0; i < 256; i++) {
      const shade = 30 + rockShades[i] * 22;
      context.fillStyle = `rgb(${shade + 8}, ${shade * 0.7}, ${shade * 0.55})`;
      context.fillRect(i % 16, Math.floor(i / 16), 1, 1);
    }
    context.fillStyle = "#ff7a1a";
    for (const [x, y] of cracks) {
      context.fillRect(x, y, 1, 1);
    }
  });
  const glow = canvasTexture("lavaGlow", 16, (context) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = "#4a1800";
    for (const [x, y] of cracks) {
      context.fillRect(x - 1, y, 3, 1);
      context.fillRect(x, y - 1, 1, 3);
    }
    context.fillStyle = "#ffffff";
    for (const [x, y] of cracks) {
      context.fillRect(x, y, 1, 1);
    }
  });
  return { map, glow };
}

const RUNES = [
  [0b010, 0b111, 0b010],
  [0b101, 0b010, 0b101],
  [0b111, 0b100, 0b111],
  [0b110, 0b011, 0b110],
  [0b011, 0b110, 0b011],
  [0b111, 0b101, 0b111],
];

function arcaneTexture() {
  return canvasTexture("arcane", 16, (context) => {
    const rand = seededRandom(99);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = "#ffffff";
    for (const [cellX, cellY] of [
      [1, 1],
      [9, 2],
      [3, 9],
      [11, 10],
    ]) {
      const rune = RUNES[Math.floor(rand() * RUNES.length)];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (rune[row] & (1 << (2 - col))) {
            context.fillRect(cellX + col, cellY + row, 1, 1);
          }
        }
      }
    }
    context.fillStyle = "#6a3a8a";
    context.fillRect(0, 7, 16, 1);
    context.fillRect(7, 0, 1, 16);
  });
}

function environmentTexture() {
  const texture = canvasTexture(
    "env",
    64,
    (context, width, height) => {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#9fc4ff");
      gradient.addColorStop(0.45, "#f4f8ff");
      gradient.addColorStop(0.5, "#ffffff");
      gradient.addColorStop(0.56, "#6b5a4a");
      gradient.addColorStop(1, "#1a1410");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.fillRect(width * 0.2, height * 0.18, width * 0.12, height * 0.08);
      context.fillRect(width * 0.65, height * 0.26, width * 0.08, height * 0.06);
    },
    { pixelated: false }
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function tintedChrome(color) {
  return new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55);
}

function cloneAnimated(texture) {
  const copy = texture.clone();
  copy.needsUpdate = true;
  return copy;
}

const SKIN_BUILDERS = {
  plain: (color) => ({
    material: new THREE.MeshStandardMaterial({ color }),
    tint: (material, value) => material.color.set(value),
  }),
  checker: (color) => ({
    material: new THREE.MeshStandardMaterial({ color, map: checkerTexture() }),
    tint: (material, value) => material.color.set(value),
  }),
  wood: () => ({
    material: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTexture(),
      roughness: 0.9,
    }),
  }),
  chrome: (color) => ({
    material: new THREE.MeshStandardMaterial({
      color: tintedChrome(color),
      metalness: 1,
      roughness: 0.22,
      envMap: environmentTexture(),
      envMapIntensity: 0.8,
    }),
    tint: (material, value) => material.color.copy(tintedChrome(value)),
  }),
  gold: () => ({
    material: new THREE.MeshStandardMaterial({
      color: 0xffc93c,
      metalness: 1,
      roughness: 0.3,
      envMap: environmentTexture(),
      envMapIntensity: 0.85,
    }),
  }),
  neon: (color) => ({
    material: new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.15),
      emissive: new THREE.Color(color),
      emissiveMap: neonTexture(),
      emissiveIntensity: 2.2,
      roughness: 0.4,
    }),
    tint: (material, value) => {
      material.color.set(value).multiplyScalar(0.15);
      material.emissive.set(value);
    },
    animate: (material, time) => {
      material.emissiveIntensity = 1.8 + Math.sin(time * 3) * 0.5;
    },
  }),
  galaxy: () => {
    const { map, glow } = galaxyTextures();
    const animatedMap = cloneAnimated(map);
    const animatedGlow = cloneAnimated(glow);
    return {
      material: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: animatedMap,
        emissive: 0xffffff,
        emissiveMap: animatedGlow,
        emissiveIntensity: 1.5,
        roughness: 0.5,
      }),
      owned: [animatedMap, animatedGlow],
      animate: (material, time) => {
        animatedMap.offset.set(time * 0.02, time * 0.01);
        animatedGlow.offset.copy(animatedMap.offset);
        material.emissiveIntensity = 1.3 + Math.sin(time * 4) * 0.35;
      },
    };
  },
  lava: () => {
    const { map, glow } = lavaTextures();
    const animatedMap = cloneAnimated(map);
    const animatedGlow = cloneAnimated(glow);
    return {
      material: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: animatedMap,
        emissive: 0xff5a00,
        emissiveMap: animatedGlow,
        emissiveIntensity: 2,
        roughness: 0.85,
      }),
      owned: [animatedMap, animatedGlow],
      animate: (material, time) => {
        animatedMap.offset.y = time * 0.03;
        animatedGlow.offset.y = animatedMap.offset.y;
        material.emissiveIntensity = 1.4 + (Math.sin(time * 2) * 0.5 + 0.5) * 1.6;
      },
    };
  },
  arcane: () => ({
    material: new THREE.MeshStandardMaterial({
      color: 0x2a1745,
      emissive: 0xc45cff,
      emissiveMap: arcaneTexture(),
      emissiveIntensity: 1.8,
      roughness: 0.6,
    }),
    animate: (material, time) => {
      material.emissive.setHSL(0.8 + Math.sin(time * 0.8) * 0.09, 1, 0.6);
      material.emissiveIntensity = 1.5 + Math.sin(time * 2.4) * 0.5;
    },
  }),
};

export const SKIN_IDS = Object.keys(SKIN_BUILDERS);

export function createSkin(skinId, color) {
  const builder = SKIN_BUILDERS[skinId] ?? SKIN_BUILDERS.plain;
  const built = builder(color);
  const material = built.material;
  material.flatShading = true;

  const skin = {
    id: SKIN_BUILDERS[skinId] ? skinId : "plain",
    material,
    baseColor: material.color.clone(),
    baseEmissive: material.emissive.clone(),
    baseEmissiveIntensity: material.emissiveIntensity,
    isAnimated: typeof built.animate === "function",
    animate(time) {
      built.animate?.(material, time);
    },
    setColor(value) {
      if (!built.tint) {
        return;
      }
      built.tint(material, value);
      skin.baseColor.copy(material.color);
      skin.baseEmissive.copy(material.emissive);
    },
    restoreEmissive() {
      material.emissive.copy(skin.baseEmissive);
      material.emissiveIntensity = skin.baseEmissiveIntensity;
    },
    dispose() {
      material.dispose();
      for (const texture of built.owned ?? []) {
        texture.dispose();
      }
    },
  };
  return skin;
}
