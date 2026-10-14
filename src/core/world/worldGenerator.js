import * as THREE from "three";
import { createTileRng, fractalNoise2D, hash2D } from "../WorldNoise.js";
import { BIOMES } from "./biomeField.js";
import { ZONE, ZONE_COLORS, ZONE_MAP_COLORS } from "./zones.js";
import { PrefabBatch } from "./instancing.js";
import { PREFABS } from "./prefabs.js";
import { STRUCTURES, pickStructure } from "./structures.js";
import { STRUCTURE_CHANCE, SAFE_START_RADIUS } from "../../constants.js";

export const CELLS_PER_TILE = 20;
const SCATTER_SPACING = 2.5;

const groundMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 1,
});

export const lavaMaterial = new THREE.MeshStandardMaterial({
  color: 0xff5a1a,
  emissive: 0xff3a00,
  emissiveIntensity: 1.6,
  roughness: 0.7,
});

const OVERLAYS = {
  [ZONE.WATER]: {
    y: 0.035,
    material: new THREE.MeshStandardMaterial({
      color: 0x3d8fc4,
      transparent: true,
      opacity: 0.8,
      roughness: 0.5,
    }),
  },
  [ZONE.ICE]: {
    y: 0.03,
    material: new THREE.MeshStandardMaterial({
      color: 0xbfe9ff,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    }),
  },
  [ZONE.LAVA]: { y: 0.03, material: lavaMaterial },
  [ZONE.MUD]: {
    y: 0.025,
    material: new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.55 }),
  },
};

const BIOME_SCATTER = {
  forest: {
    density: 0.34,
    items: [
      ["oak", 5],
      ["birch", 2],
      ["pine", 1],
      ["bush", 3],
      ["rock", 1.5, { moss: true }],
      ["log", 0.6],
      ["stump", 0.6],
      ["mushroom", 0.8],
    ],
  },
  autumn: {
    density: 0.3,
    items: [
      ["autumnTree", 6],
      ["bush", 2, { palette: [0xa8541c, 0xc0392b, 0x8a6a2a], berries: true }],
      ["pumpkin", 0.8],
      ["hayBale", 0.4],
      ["leafPile", 1.5],
      ["rock", 1, { moss: true, color: 0x7a6a5a }],
      ["log", 0.5],
      ["stump", 0.6],
    ],
  },
  snow: {
    density: 0.26,
    items: [
      ["pine", 6, { snowy: true }],
      ["iceRock", 1.5],
      ["snowDrift", 2],
      ["iceSpike", 0.5],
      ["rock", 0.8, { color: 0x8a96a0 }],
    ],
  },
  desert: {
    density: 0.14,
    items: [
      ["saguaro", 3],
      ["barrelCactus", 2],
      ["rock", 1.5, { color: 0xb8905a }],
      ["dune", 2.5],
      ["deadBush", 2],
      ["bones", 0.5],
    ],
  },
  swamp: {
    density: 0.3,
    items: [
      ["deadTree", 3],
      ["willow", 3],
      ["reeds", 3, null, [ZONE.NONE, ZONE.MUD, ZONE.TALL_GRASS]],
      ["mushroom", 1.5, { glow: true }],
      ["rock", 1, { moss: true, color: 0x4a5040 }],
      ["log", 0.8],
      ["bush", 1, { palette: [0x3a4a2a, 0x4a5a2e] }],
    ],
  },
  volcanic: {
    density: 0.2,
    items: [
      ["basalt", 3],
      ["obsidian", 2],
      ["charredTree", 2],
      ["vent", 0.8],
      ["rock", 2, { color: 0x3a3230 }],
    ],
  },
  crystal: {
    density: 0.2,
    items: [
      ["crystalCluster", 4],
      ["rock", 2, { color: 0xb8b4d8 }],
      ["pebbles", 2, { crystal: true }],
      ["crystalSpire", 0.3],
    ],
  },
};

const DEFAULT_ALLOWED = [ZONE.NONE, ZONE.TALL_GRASS, ZONE.DEEP_SNOW];

const colorA = new THREE.Color();
const colorB = new THREE.Color();

function blendHex(primary, secondary, blend) {
  colorA.set(primary);
  if (secondary != null && blend > 0) {
    colorA.lerp(colorB.set(secondary), blend);
  }
  return colorA.getHex();
}

function pickWeighted(items, rng) {
  const total = items.reduce((sum, item) => sum + item[1], 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= item[1];
    if (roll <= 0) {
      return item;
    }
  }
  return items[0];
}

export function generateNatureTile({ scene, field, seed, chunkX, chunkZ, tileSize, hasCamp }) {
  const cellSize = tileSize / CELLS_PER_TILE;
  const originX = chunkX * tileSize - tileSize / 2;
  const originZ = chunkZ * tileSize - tileSize / 2;
  const centerX = chunkX * tileSize;
  const centerZ = chunkZ * tileSize;
  const rng = createTileRng(chunkX, chunkZ, seed ^ 0x7777);
  const cellCount = CELLS_PER_TILE * CELLS_PER_TILE;

  const samples = new Array(cellCount);
  for (let row = 0; row < CELLS_PER_TILE; row++) {
    for (let col = 0; col < CELLS_PER_TILE; col++) {
      samples[row * CELLS_PER_TILE + col] = field.sample(
        originX + (col + 0.5) * cellSize,
        originZ + (row + 0.5) * cellSize
      );
    }
  }
  const sampleAt = (x, z) => {
    const col = Math.min(Math.max(Math.floor((x - originX) / cellSize), 0), CELLS_PER_TILE - 1);
    const row = Math.min(Math.max(Math.floor((z - originZ) / cellSize), 0), CELLS_PER_TILE - 1);
    return { index: row * CELLS_PER_TILE + col, sample: samples[row * CELLS_PER_TILE + col] };
  };

  let structure = null;
  let structureX = centerX;
  let structureZ = centerZ;
  let structureRotation = 0;
  const nearSpawn = Math.hypot(centerX, centerZ) < SAFE_START_RADIUS + tileSize;
  const centerSample = sampleAt(centerX, centerZ).sample;
  if (hasCamp) {
    structure = STRUCTURES.abandonedCamp(rng);
  } else if (
    !nearSpawn &&
    centerSample.blend === 0 &&
    !field.isRoad(centerX, centerZ) &&
    rng.next() < STRUCTURE_CHANCE
  ) {
    structure = pickStructure(centerSample.primary, rng);
  }
  if (structure) {
    structureX = centerX + rng.float(-1.5, 1.5);
    structureZ = centerZ + rng.float(-1.5, 1.5);
    structureRotation = rng.int(0, 3) * (Math.PI / 2) + rng.float(-0.25, 0.25);
  }
  const footprint = structure ? structure.radius + 1.2 : 0;

  const zones = new Uint8Array(cellCount);
  for (let index = 0; index < cellCount; index++) {
    const x = originX + ((index % CELLS_PER_TILE) + 0.5) * cellSize;
    const z = originZ + (Math.floor(index / CELLS_PER_TILE) + 0.5) * cellSize;
    if (structure) {
      const distance = Math.hypot(x - structureX, z - structureZ);
      if (distance < footprint) {
        const override = structure.zones.find((zone) => distance < zone.circle);
        zones[index] = override ? override.zone : ZONE.NONE;
        continue;
      }
    }
    zones[index] = field.zoneAt(x, z, samples[index]);
  }

  const out = {
    meshes: [],
    colliders: [],
    zones,
    pois: [],
    map: { size: CELLS_PER_TILE, cells: new Int32Array(cellCount), shapes: [] },
  };

  const positions = new Float32Array(cellCount * 18);
  const colors = new Float32Array(cellCount * 18);
  const normals = new Float32Array(cellCount * 18);
  const overlayCells = new Map();
  const cellColor = new THREE.Color();

  for (let index = 0; index < cellCount; index++) {
    const col = index % CELLS_PER_TILE;
    const row = Math.floor(index / CELLS_PER_TILE);
    const x0 = originX + col * cellSize;
    const z0 = originZ + row * cellSize;
    const x1 = x0 + cellSize;
    const z1 = z0 + cellSize;
    const sample = samples[index];
    const zone = zones[index];
    const primary = BIOMES[sample.primary];
    const secondary = sample.secondary ? BIOMES[sample.secondary] : null;

    let hex;
    if (zone === ZONE.ROAD) {
      hex = blendHex(primary.road, secondary?.road, sample.blend);
    } else if (zone === ZONE.TALL_GRASS) {
      hex = blendHex(primary.grass, secondary?.grass, sample.blend);
    } else if (ZONE_COLORS[zone] !== undefined) {
      hex = ZONE_COLORS[zone];
    } else {
      hex = blendHex(primary.ground, secondary?.ground, sample.blend);
    }

    const coarse = fractalNoise2D((x0 + 0.5) * 0.06, (z0 + 0.5) * 0.06, seed ^ 0x51ce);
    const fine = hash2D(Math.floor(x0), Math.floor(z0), seed ^ 0xabc1);
    cellColor.set(hex).multiplyScalar(0.84 + coarse * 0.24 + fine * 0.1);

    out.map.cells[index] =
      ZONE_MAP_COLORS[zone] !== undefined
        ? parseInt(ZONE_MAP_COLORS[zone].slice(1), 16)
        : cellColor.getHex();

    const corners = [x0, z0, x0, z1, x1, z0, x1, z0, x0, z1, x1, z1];
    for (let vertex = 0; vertex < 6; vertex++) {
      const offset = index * 18 + vertex * 3;
      positions[offset] = corners[vertex * 2];
      positions[offset + 1] = 0;
      positions[offset + 2] = corners[vertex * 2 + 1];
      normals[offset + 1] = 1;
      colors[offset] = cellColor.r;
      colors[offset + 1] = cellColor.g;
      colors[offset + 2] = cellColor.b;
    }

    if (OVERLAYS[zone]) {
      if (!overlayCells.has(zone)) {
        overlayCells.set(zone, []);
      }
      overlayCells.get(zone).push(corners);
    }
  }

  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  groundGeometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  groundGeometry.computeBoundingSphere();
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  ground.userData.disposeGeometry = true;
  ground.userData.isGround = true;
  scene.add(ground);
  out.meshes.push(ground);

  for (const [zone, cellList] of overlayCells) {
    const overlay = OVERLAYS[zone];
    const overlayPositions = new Float32Array(cellList.length * 18);
    const overlayNormals = new Float32Array(cellList.length * 18);
    cellList.forEach((corners, cellIndex) => {
      for (let vertex = 0; vertex < 6; vertex++) {
        const offset = cellIndex * 18 + vertex * 3;
        overlayPositions[offset] = corners[vertex * 2];
        overlayPositions[offset + 1] = overlay.y;
        overlayPositions[offset + 2] = corners[vertex * 2 + 1];
        overlayNormals[offset + 1] = 1;
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(overlayPositions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(overlayNormals, 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, overlay.material);
    mesh.receiveShadow = zone !== ZONE.LAVA;
    mesh.userData.disposeGeometry = true;
    mesh.userData.isOverlay = true;
    scene.add(mesh);
    out.meshes.push(mesh);
  }

  const batch = new PrefabBatch();
  const placed = [];
  const isFree = (x, z, radius) => {
    if (structure && Math.hypot(x - structureX, z - structureZ) < footprint + radius) {
      return false;
    }
    if (Math.hypot(x, z) < SAFE_START_RADIUS * 0.6) {
      return false;
    }
    for (const other of placed) {
      const reach = (other.radius + radius) * 0.75;
      if ((other.x - x) ** 2 + (other.z - z) ** 2 < reach * reach) {
        return false;
      }
    }
    return true;
  };

  if (structure) {
    batch.place(structure, structureX, structureZ, structureRotation);
    if (structure.poi) {
      out.pois.push({
        type: structure.poi,
        id: `${structure.poi}_${chunkX}_${chunkZ}`,
        x: structureX,
        z: structureZ,
      });
    }
  }

  const clump = 0.35 + fractalNoise2D(centerX / 28, centerZ / 28, seed ^ 0xc1, 2) * 1.3;
  const steps = Math.floor(tileSize / SCATTER_SPACING);
  for (let gridX = 0; gridX < steps; gridX++) {
    for (let gridZ = 0; gridZ < steps; gridZ++) {
      const x = originX + (gridX + 0.5 + rng.float(-0.4, 0.4)) * SCATTER_SPACING;
      const z = originZ + (gridZ + 0.5 + rng.float(-0.4, 0.4)) * SCATTER_SPACING;
      const { index, sample } = sampleAt(x, z);
      const biome =
        sample.secondary && rng.next() < sample.blend ? sample.secondary : sample.primary;
      const scatter = BIOME_SCATTER[biome];
      if (!scatter) {
        continue;
      }
      const localClump = clump * (0.6 + fractalNoise2D(x / 11, z / 11, seed ^ 0xd2, 1) * 0.8);
      if (rng.next() > scatter.density * localClump) {
        continue;
      }
      const [name, , options, allowed] = pickWeighted(scatter.items, rng);
      if (!(allowed ?? DEFAULT_ALLOWED).includes(zones[index])) {
        continue;
      }
      const built = PREFABS[name](rng, options ?? {});
      const size = rng.float(0.85, 1.2);
      if (!isFree(x, z, built.radius * size)) {
        continue;
      }
      batch.place(built, x, z, rng.float(0, Math.PI * 2), size);
      placed.push({ x, z, radius: built.radius * size });
    }
  }

  for (let index = 0; index < cellCount; index++) {
    const zone = zones[index];
    const sample = samples[index];
    const x = originX + ((index % CELLS_PER_TILE) + 0.5) * cellSize;
    const z = originZ + (Math.floor(index / CELLS_PER_TILE) + 0.5) * cellSize;
    const insideStructure =
      structure && Math.hypot(x - structureX, z - structureZ) < footprint - 0.5;
    const grassColor = BIOMES[sample.primary].grass;

    if (zone === ZONE.TALL_GRASS) {
      for (let i = 0; i < 2; i++) {
        batch.place(
          PREFABS.tallGrass(rng, { color: grassColor }),
          x + rng.float(-0.45, 0.45),
          z + rng.float(-0.45, 0.45)
        );
      }
      continue;
    }
    if (insideStructure || zone === ZONE.ROAD) {
      continue;
    }
    const roll = rng.next();
    switch (sample.primary) {
      case "forest":
      case "autumn":
        if (zone === ZONE.NONE && roll < 0.22) {
          batch.place(PREFABS.tuft(rng, { color: grassColor }), x + rng.float(-0.4, 0.4), z + rng.float(-0.4, 0.4));
        } else if (sample.primary === "forest" && zone === ZONE.NONE && roll < 0.25) {
          batch.place(PREFABS.flowers(rng), x, z);
        }
        break;
      case "swamp":
        if (zone === ZONE.WATER && roll < 0.14) {
          batch.place(PREFABS.lilyPad(rng), x + rng.float(-0.3, 0.3), z + rng.float(-0.3, 0.3), rng.float(0, 6));
        } else if (zone === ZONE.MUD && roll < 0.08) {
          batch.place(PREFABS.reeds(rng), x, z);
        } else if (zone === ZONE.NONE && roll < 0.15) {
          batch.place(PREFABS.tuft(rng, { color: 0x4a5a30 }), x, z);
        }
        break;
      case "snow":
        if (zone === ZONE.DEEP_SNOW && roll < 0.08) {
          batch.place(PREFABS.snowDrift(rng), x, z, 0, 0.5);
        }
        break;
      case "desert":
        if (zone === ZONE.NONE && roll < 0.025) {
          batch.place(PREFABS.pebbles(rng, { color: 0xa88a5a }), x, z);
        } else if (zone === ZONE.NONE && roll < 0.05) {
          batch.place(PREFABS.tuft(rng, { color: 0xa89a5a }), x, z);
        }
        break;
      case "volcanic":
        if (zone === ZONE.NONE && roll < 0.03) {
          batch.place(PREFABS.pebbles(rng, { color: 0x2a2424 }), x, z);
        }
        break;
      case "crystal":
        if (zone === ZONE.NONE && roll < 0.04) {
          batch.place(PREFABS.pebbles(rng, { crystal: true }), x, z);
        }
        break;
      default:
        break;
    }
  }

  const isRoadCell = (col, row) =>
    col >= 0 &&
    row >= 0 &&
    col < CELLS_PER_TILE &&
    row < CELLS_PER_TILE &&
    zones[row * CELLS_PER_TILE + col] === ZONE.ROAD;
  for (let index = 0; index < cellCount; index++) {
    if (zones[index] === ZONE.ROAD) {
      continue;
    }
    const col = index % CELLS_PER_TILE;
    const row = Math.floor(index / CELLS_PER_TILE);
    const touchesRoad =
      isRoadCell(col - 1, row) ||
      isRoadCell(col + 1, row) ||
      isRoadCell(col, row - 1) ||
      isRoadCell(col, row + 1);
    if (!touchesRoad) {
      continue;
    }
    const x = originX + (col + 0.5) * cellSize;
    const z = originZ + (row + 0.5) * cellSize;
    if (!isFree(x, z, 0.4)) {
      continue;
    }
    const roll = rng.next();
    const biome = samples[index].primary;
    if (roll < 0.006) {
      batch.place(PREFABS.lantern(), x, z);
      placed.push({ x, z, radius: 0.4 });
    } else if (roll < 0.01) {
      batch.place(PREFABS.signpost(rng), x, z, rng.float(0, 6));
      placed.push({ x, z, radius: 0.4 });
    } else if (roll < 0.08) {
      batch.place(PREFABS.roadStone(rng, { color: BIOMES[biome].road }), x, z);
    }
  }

  batch.build(scene, out.meshes);
  out.colliders = batch.colliders;
  out.map.shapes = batch.mapShapes;
  return out;
}
