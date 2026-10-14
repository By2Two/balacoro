import { createTileRng } from "./WorldNoise.js";
import { BiomeField, BIOMES } from "./world/biomeField.js";
import { generateNatureTile, CELLS_PER_TILE, lavaMaterial } from "./world/worldGenerator.js";
import { worldUniforms } from "./world/instancing.js";
import {
  circleOverlaps,
  circlePushOut,
  aabbOverlaps,
} from "./world/collision.js";
import { FlowField } from "./world/flowField.js";
import { GROUND_EFFECTS, ZONE } from "./world/zones.js";
import {
  CAMP_REGION_SIZE,
  CAMP_CHANCE,
  TILE_BUILD_BUDGET,
} from "../constants.js";

const COLLIDER_CELL = 4;
const LOAD_RADIUS_X = 4;
const LOAD_RADIUS_Z = 3;

function cellKey(cellX, cellZ) {
  return (cellX + 32768) * 65536 + (cellZ + 32768);
}

export class WorldTileManager {
  constructor(scene, tileSize = 20, seed = Math.floor(Math.random() * 1000000)) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.seed = seed;
    this.loadedTiles = new Map();
    this.tilesByIndex = new Map();
    this.field = new BiomeField(seed);
    this._campCache = new Map();
    this.buildQueue = [];
    this.queuedKeys = new Set();
    this.colliderCells = new Map();
    this.queryStamp = 0;
    this.flowField = new FlowField();
    this.pois = new Map();
    this.time = 0;
    this._sample = {};
  }

  _campChunk(regionX, regionZ) {
    const key = `${regionX}_${regionZ}`;
    if (this._campCache.has(key)) {
      return this._campCache.get(key);
    }
    const rng = createTileRng(regionX, regionZ, this.seed ^ 0xca3f);
    let chunk = null;
    if (rng.next() < CAMP_CHANCE && !(regionX === 0 && regionZ === 0)) {
      chunk = {
        x: regionX * CAMP_REGION_SIZE + rng.int(0, CAMP_REGION_SIZE - 1),
        z: regionZ * CAMP_REGION_SIZE + rng.int(0, CAMP_REGION_SIZE - 1),
      };
    }
    this._campCache.set(key, chunk);
    return chunk;
  }

  _hasCamp(chunkX, chunkZ) {
    const chunk = this._campChunk(
      Math.floor(chunkX / CAMP_REGION_SIZE),
      Math.floor(chunkZ / CAMP_REGION_SIZE)
    );
    return chunk !== null && chunk.x === chunkX && chunk.z === chunkZ;
  }

  _tileKey(chunkX, chunkZ) {
    return `${chunkX}_${chunkZ}`;
  }

  _worldToChunk(value) {
    return Math.floor((value + this.tileSize / 2) / this.tileSize);
  }

  getBiomeSample(chunkX, chunkZ) {
    return this.field.sample(chunkX * this.tileSize, chunkZ * this.tileSize, {});
  }

  getBiomeNameForChunk(chunkX, chunkZ) {
    return this.getBiomeSample(chunkX, chunkZ).primary;
  }

  getBiomeNameAt(x, z) {
    return this.field.sample(x, z, this._sample).primary;
  }

  getSmoothBiomeWeights(x, z) {
    const weights = {};
    for (const biome of Object.keys(BIOMES)) {
      weights[biome] = 0;
    }
    const sample = this.field.sample(x, z, this._sample);
    weights[sample.primary] += 1 - sample.blend;
    if (sample.secondary) {
      weights[sample.secondary] += sample.blend;
    }
    return weights;
  }

  getBiomeWeights(x, z) {
    return this.getSmoothBiomeWeights(x, z);
  }

  createTile(chunkX, chunkZ) {
    return generateNatureTile({
      scene: this.scene,
      field: this.field,
      seed: this.seed,
      chunkX,
      chunkZ,
      tileSize: this.tileSize,
      hasCamp: this._hasCamp(chunkX, chunkZ),
    });
  }

  _loadTile(chunkX, chunkZ) {
    const key = this._tileKey(chunkX, chunkZ);
    if (this.loadedTiles.has(key)) {
      return;
    }
    const result = this.createTile(chunkX, chunkZ);
    const tile = { ...result, chunkX, chunkZ, key };
    this.loadedTiles.set(key, tile);
    this.tilesByIndex.set(cellKey(chunkX, chunkZ), tile);
    for (const collider of tile.colliders) {
      this._indexCollider(collider);
    }
    for (const poi of tile.pois) {
      this.pois.set(poi.id, poi);
    }
  }

  _indexCollider(collider) {
    const minX = Math.floor(collider.minX / COLLIDER_CELL);
    const maxX = Math.floor(collider.maxX / COLLIDER_CELL);
    const minZ = Math.floor(collider.minZ / COLLIDER_CELL);
    const maxZ = Math.floor(collider.maxZ / COLLIDER_CELL);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = cellKey(x, z);
        let bucket = this.colliderCells.get(key);
        if (!bucket) {
          bucket = [];
          this.colliderCells.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  }

  _unindexCollider(collider) {
    const minX = Math.floor(collider.minX / COLLIDER_CELL);
    const maxX = Math.floor(collider.maxX / COLLIDER_CELL);
    const minZ = Math.floor(collider.minZ / COLLIDER_CELL);
    const maxZ = Math.floor(collider.maxZ / COLLIDER_CELL);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = cellKey(x, z);
        const bucket = this.colliderCells.get(key);
        if (!bucket) {
          continue;
        }
        const index = bucket.indexOf(collider);
        if (index >= 0) {
          bucket.splice(index, 1);
        }
        if (bucket.length === 0) {
          this.colliderCells.delete(key);
        }
      }
    }
  }

  removeTile(tile) {
    if (!tile) {
      return;
    }
    for (const mesh of tile.meshes) {
      this.scene.remove(mesh);
      if (mesh.isInstancedMesh) {
        mesh.dispose();
      } else if (mesh.userData.disposeGeometry) {
        mesh.geometry.dispose();
      }
    }
    for (const collider of tile.colliders) {
      this._unindexCollider(collider);
    }
    for (const poi of tile.pois) {
      this.pois.delete(poi.id);
    }
    this.tilesByIndex.delete(cellKey(tile.chunkX, tile.chunkZ));
  }

  update(playerX, playerZ, delta = 0) {
    this.time += delta;
    worldUniforms.uTime.value = this.time;
    lavaMaterial.emissiveIntensity = 1.4 + Math.sin(this.time * 2) * 0.4;

    const chunkX = this._worldToChunk(playerX);
    const chunkZ = this._worldToChunk(playerZ);
    const firstLoad = this.loadedTiles.size === 0;
    const needed = new Set();

    for (let x = chunkX - LOAD_RADIUS_X; x <= chunkX + LOAD_RADIUS_X; x++) {
      for (let z = chunkZ - LOAD_RADIUS_Z; z <= chunkZ + LOAD_RADIUS_Z; z++) {
        const key = this._tileKey(x, z);
        needed.add(key);
        if (this.loadedTiles.has(key)) {
          continue;
        }
        const urgent = Math.abs(x - chunkX) <= 1 && Math.abs(z - chunkZ) <= 1;
        if (firstLoad || urgent) {
          this._loadTile(x, z);
          this.queuedKeys.delete(key);
        } else if (!this.queuedKeys.has(key)) {
          this.queuedKeys.add(key);
          this.buildQueue.push({ key, x, z });
        }
      }
    }

    this.buildQueue = this.buildQueue.filter((job) => needed.has(job.key));
    this.queuedKeys = new Set(this.buildQueue.map((job) => job.key));
    this.buildQueue.sort(
      (a, b) =>
        Math.hypot(a.x - chunkX, a.z - chunkZ) - Math.hypot(b.x - chunkX, b.z - chunkZ)
    );
    for (let built = 0; built < TILE_BUILD_BUDGET && this.buildQueue.length > 0; built++) {
      const job = this.buildQueue.shift();
      this.queuedKeys.delete(job.key);
      this._loadTile(job.x, job.z);
    }

    for (const [key, tile] of this.loadedTiles) {
      if (!needed.has(key)) {
        this.removeTile(tile);
        this.loadedTiles.delete(key);
      }
    }

    this.flowField.update(delta, playerX, playerZ, this);
  }

  forEachColliderInRect(minX, maxX, minZ, maxZ, callback) {
    const stamp = ++this.queryStamp;
    const cellMinX = Math.floor(minX / COLLIDER_CELL);
    const cellMaxX = Math.floor(maxX / COLLIDER_CELL);
    const cellMinZ = Math.floor(minZ / COLLIDER_CELL);
    const cellMaxZ = Math.floor(maxZ / COLLIDER_CELL);
    for (let x = cellMinX; x <= cellMaxX; x++) {
      for (let z = cellMinZ; z <= cellMaxZ; z++) {
        const bucket = this.colliderCells.get(cellKey(x, z));
        if (!bucket) {
          continue;
        }
        for (const collider of bucket) {
          if (collider.stamp === stamp) {
            continue;
          }
          collider.stamp = stamp;
          if (callback(collider) === true) {
            return true;
          }
        }
      }
    }
    return false;
  }

  intersectsSolid(box) {
    const minX = box.min.x;
    const maxX = box.max.x;
    const minZ = box.min.z;
    const maxZ = box.max.z;
    return this.forEachColliderInRect(minX, maxX, minZ, maxZ, (collider) =>
      aabbOverlaps(collider, minX, maxX, minZ, maxZ)
    );
  }

  isCircleBlocked(x, z, radius) {
    return this.forEachColliderInRect(x - radius, x + radius, z - radius, z + radius, (collider) =>
      circleOverlaps(collider, x, z, radius)
    );
  }

  isSegmentClear(fromX, fromZ, toX, toZ, radius, maxDistance) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-4) {
      return true;
    }
    const length = Math.min(distance, maxDistance);
    const directionX = dx / distance;
    const directionZ = dz / distance;
    for (let travelled = 0.5; travelled <= length; travelled += 0.5) {
      const x = fromX + directionX * travelled;
      const z = fromZ + directionZ * travelled;
      if (this.isCircleBlocked(x, z, radius) || this.getZoneAt(x, z) === ZONE.LAVA) {
        return false;
      }
    }
    return true;
  }

  isWorldPositionSolid(x, z) {
    return this.isCircleBlocked(x, z, 0.05);
  }

  pushOutCircle(position, radius) {
    let moved = false;
    for (let iteration = 0; iteration < 3; iteration++) {
      let pushed = false;
      this.forEachColliderInRect(
        position.x - radius,
        position.x + radius,
        position.z - radius,
        position.z + radius,
        (collider) => {
          if (circlePushOut(collider, position, radius)) {
            pushed = true;
          }
        }
      );
      if (!pushed) {
        break;
      }
      moved = true;
    }
    return moved;
  }

  moveCircle(position, targetX, targetZ, radius) {
    const previousX = position.x;
    const previousZ = position.z;
    position.x = targetX;
    position.z = targetZ;
    this.pushOutCircle(position, radius);
    if (this.isCircleBlocked(position.x, position.z, radius * 0.9)) {
      position.x = previousX;
      position.z = previousZ;
      return false;
    }
    return true;
  }

  getZoneAt(x, z) {
    const chunkX = this._worldToChunk(x);
    const chunkZ = this._worldToChunk(z);
    const tile = this.tilesByIndex.get(cellKey(chunkX, chunkZ));
    if (!tile?.zones) {
      return ZONE.NONE;
    }
    const cellSize = this.tileSize / CELLS_PER_TILE;
    const col = Math.floor((x - (chunkX * this.tileSize - this.tileSize / 2)) / cellSize);
    const row = Math.floor((z - (chunkZ * this.tileSize - this.tileSize / 2)) / cellSize);
    if (col < 0 || row < 0 || col >= CELLS_PER_TILE || row >= CELLS_PER_TILE) {
      return ZONE.NONE;
    }
    return tile.zones[row * CELLS_PER_TILE + col];
  }

  forEachZoneGrid(originX, originZ, size, callback) {
    const minChunkX = this._worldToChunk(originX);
    const maxChunkX = this._worldToChunk(originX + size);
    const minChunkZ = this._worldToChunk(originZ);
    const maxChunkZ = this._worldToChunk(originZ + size);
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
        const tile = this.tilesByIndex.get(cellKey(chunkX, chunkZ));
        if (tile?.zones) {
          callback(
            tile.zones,
            CELLS_PER_TILE,
            chunkX * this.tileSize - this.tileSize / 2,
            chunkZ * this.tileSize - this.tileSize / 2
          );
        }
      }
    }
  }

  getGroundEffect(x, z) {
    return GROUND_EFFECTS[this.getZoneAt(x, z)] ?? GROUND_EFFECTS[0];
  }

  isHazardAt(x, z) {
    const zone = this.getZoneAt(x, z);
    return zone === ZONE.LAVA || zone === ZONE.WATER || zone === ZONE.QUICKSAND;
  }

  getFlowDirection(position, out) {
    return this.flowField.sample(position, out);
  }

  getPointsOfInterest() {
    return this.pois.values();
  }
}
