import { fractalNoise2D, hash2D } from "../WorldNoise.js";
import { ZONE } from "./zones.js";
import {
  BIOME_CELL_SIZE,
  BIOME_BLEND_BAND,
  BIOME_WARP_AMOUNT,
  BIOME_WEIGHTS,
  SAFE_START_RADIUS,
} from "../../constants.js";

export const BIOMES = {
  forest: { ground: 0x3f6e3a, road: 0x8a6d45, grass: 0x2f5a2b, map: "#2e5d3a" },
  autumn: { ground: 0x7d6b34, road: 0x8f6b3e, grass: 0x8a6a2a, map: "#8a5a2a" },
  snow: { ground: 0xe6f1fa, road: 0xb9c6d2, grass: 0xcfe0ea, map: "#cfe6f2" },
  desert: { ground: 0xdcbc7c, road: 0xb89660, grass: 0xc2a468, map: "#c9b071" },
  swamp: { ground: 0x3d4a2c, road: 0x5a4a30, grass: 0x34422a, map: "#3b4a2e" },
  volcanic: { ground: 0x34302e, road: 0x4d4540, grass: 0x2a2624, map: "#3a2e2a" },
  crystal: { ground: 0x5d6190, road: 0x8a8fbe, grass: 0x6a6ea8, map: "#6a5fa0" },
};

const WEIGHTED_BIOMES = Object.entries(BIOME_WEIGHTS);
const TOTAL_WEIGHT = WEIGHTED_BIOMES.reduce((sum, [, weight]) => sum + weight, 0);
const ROAD_WIDTH = 0.0085;

function pickBiome(roll) {
  let remaining = roll * TOTAL_WEIGHT;
  for (const [biome, weight] of WEIGHTED_BIOMES) {
    remaining -= weight;
    if (remaining <= 0) {
      return biome;
    }
  }
  return "forest";
}

export class BiomeField {
  constructor(seed) {
    this.seed = seed;
    this.siteCache = new Map();
  }

  _site(cellX, cellZ) {
    const key = `${cellX}_${cellZ}`;
    let site = this.siteCache.get(key);
    if (!site) {
      const isSpawnCell = cellX >= -1 && cellX <= 0 && cellZ >= -1 && cellZ <= 0;
      site = {
        x: (cellX + 0.15 + hash2D(cellX, cellZ, this.seed ^ 0x1a2b) * 0.7) * BIOME_CELL_SIZE,
        z: (cellZ + 0.15 + hash2D(cellX, cellZ, this.seed ^ 0x3c4d) * 0.7) * BIOME_CELL_SIZE,
        biome: isSpawnCell
          ? "forest"
          : pickBiome(hash2D(cellX, cellZ, this.seed ^ 0x5e6f)),
      };
      this.siteCache.set(key, site);
    }
    return site;
  }

  sample(x, z, out = {}) {
    const warpX =
      (fractalNoise2D(x / 70, z / 70, this.seed ^ 0x77, 2) - 0.5) * 2 * BIOME_WARP_AMOUNT;
    const warpZ =
      (fractalNoise2D(x / 70 + 31, z / 70 - 17, this.seed ^ 0x99, 2) - 0.5) *
      2 *
      BIOME_WARP_AMOUNT;
    const wx = x + warpX;
    const wz = z + warpZ;
    const cellX = Math.floor(wx / BIOME_CELL_SIZE);
    const cellZ = Math.floor(wz / BIOME_CELL_SIZE);

    let nearest = Infinity;
    let nearestBiome = "forest";
    const candidates = [];
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
        const site = this._site(cellX + offsetX, cellZ + offsetZ);
        const distance = Math.hypot(site.x - wx, site.z - wz);
        candidates.push([distance, site.biome]);
        if (distance < nearest) {
          nearest = distance;
          nearestBiome = site.biome;
        }
      }
    }

    let secondDistance = Infinity;
    let secondBiome = null;
    for (const [distance, biome] of candidates) {
      if (biome !== nearestBiome && distance < secondDistance) {
        secondDistance = distance;
        secondBiome = biome;
      }
    }

    const gap = secondDistance - nearest;
    out.primary = nearestBiome;
    if (secondBiome && gap < BIOME_BLEND_BAND) {
      out.secondary = secondBiome;
      out.blend = 0.5 * (1 - gap / BIOME_BLEND_BAND);
    } else {
      out.secondary = null;
      out.blend = 0;
    }
    return out;
  }

  isRoad(x, z) {
    const first = Math.abs(fractalNoise2D(x / 120, z / 120, this.seed ^ 0x40ad, 2) - 0.5);
    const second = Math.abs(
      fractalNoise2D(x / 170 + 50, z / 170 - 80, this.seed ^ 0x51be, 2) - 0.5
    );
    return Math.min(first, second) < ROAD_WIDTH;
  }

  zoneAt(x, z, sample) {
    if (this.isRoad(x, z)) {
      return ZONE.ROAD;
    }
    if (Math.hypot(x, z) < SAFE_START_RADIUS || sample.blend > 0.3) {
      return ZONE.NONE;
    }
    const patch = fractalNoise2D(x / 14, z / 14, this.seed ^ 0x2468, 2);
    const grass = fractalNoise2D(x / 18 + 9, z / 18 - 4, this.seed ^ 0x1357, 2);

    switch (sample.primary) {
      case "swamp":
        if (patch < 0.37) {
          return ZONE.WATER;
        }
        if (patch > 0.62) {
          return ZONE.MUD;
        }
        return grass > 0.55 ? ZONE.TALL_GRASS : ZONE.NONE;
      case "snow":
        if (patch < 0.32) {
          return ZONE.ICE;
        }
        return patch > 0.63 ? ZONE.DEEP_SNOW : ZONE.NONE;
      case "volcanic": {
        const river = Math.abs(fractalNoise2D(x / 40, z / 40, this.seed ^ 0xfa11, 2) - 0.5);
        if (river < 0.022 || patch > 0.7) {
          return ZONE.LAVA;
        }
        return ZONE.NONE;
      }
      case "forest":
      case "autumn":
        return grass > 0.6 ? ZONE.TALL_GRASS : ZONE.NONE;
      case "desert":
        return patch > 0.71 ? ZONE.QUICKSAND : ZONE.NONE;
      default:
        return ZONE.NONE;
    }
  }
}
