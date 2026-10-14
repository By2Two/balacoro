import { circleOverlaps } from "./collision.js";
import { ZONE_PATH_COST } from "./zones.js";
import { FLOW_FIELD_SIZE, FLOW_FIELD_INTERVAL } from "../../constants.js";

const INFLATE = 0.45;
const DIAGONAL = Math.SQRT2;
const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, DIAGONAL],
  [1, -1, DIAGONAL],
  [-1, 1, DIAGONAL],
  [-1, -1, DIAGONAL],
];

const NEIGHBOR_X = Int8Array.from(NEIGHBORS.map((entry) => entry[0]));
const NEIGHBOR_Z = Int8Array.from(NEIGHBORS.map((entry) => entry[1]));
const NEIGHBOR_STEP = Float32Array.from(NEIGHBORS.map((entry) => entry[2]));

export class FlowField {
  constructor(size = FLOW_FIELD_SIZE) {
    this.size = size;
    const count = size * size;
    this.blocked = new Uint8Array(count);
    this.cost = new Float32Array(count);
    this.distance = new Float32Array(count);
    this.heapNodes = new Int32Array(count * 8);
    this.heapKeys = new Float32Array(count * 8);
    this.originX = 0;
    this.originZ = 0;
    this.timer = 0;
    this.ready = false;
  }

  update(delta, playerX, playerZ, tileManager) {
    this.timer -= delta;
    if (this.timer > 0 && this.ready) {
      return;
    }
    this.timer = FLOW_FIELD_INTERVAL;
    this._rebuild(playerX, playerZ, tileManager);
  }

  _rebuild(playerX, playerZ, tileManager) {
    const size = this.size;
    const half = size / 2;
    this.originX = Math.floor(playerX) - half;
    this.originZ = Math.floor(playerZ) - half;
    const { originX, originZ, blocked, cost, distance } = this;

    blocked.fill(0);
    tileManager.forEachColliderInRect(
      originX,
      originX + size,
      originZ,
      originZ + size,
      (collider) => {
        const minCol = Math.max(Math.floor(collider.minX - INFLATE - originX), 0);
        const maxCol = Math.min(Math.floor(collider.maxX + INFLATE - originX), size - 1);
        const minRow = Math.max(Math.floor(collider.minZ - INFLATE - originZ), 0);
        const maxRow = Math.min(Math.floor(collider.maxZ + INFLATE - originZ), size - 1);
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            if (circleOverlaps(collider, originX + col + 0.5, originZ + row + 0.5, INFLATE)) {
              blocked[row * size + col] = 1;
            }
          }
        }
      }
    );

    cost.fill(1);
    tileManager.forEachZoneGrid(originX, originZ, size, (zones, gridSize, tileOriginX, tileOriginZ) => {
      const startCol = Math.max(tileOriginX - originX, 0);
      const endCol = Math.min(tileOriginX + gridSize - originX, size);
      const startRow = Math.max(tileOriginZ - originZ, 0);
      const endRow = Math.min(tileOriginZ + gridSize - originZ, size);
      for (let row = startRow; row < endRow; row++) {
        const zoneRow = (row + originZ - tileOriginZ) * gridSize;
        for (let col = startCol; col < endCol; col++) {
          cost[row * size + col] = ZONE_PATH_COST[zones[zoneRow + col + originX - tileOriginX]];
        }
      }
    });

    distance.fill(Infinity);
    const startCol = Math.floor(playerX) - originX;
    const startRow = Math.floor(playerZ) - originZ;
    const start = startRow * size + startCol;
    distance[start] = 0;

    let heapSize = 0;
    const nodes = this.heapNodes;
    const keys = this.heapKeys;
    const push = (node, key) => {
      if (heapSize >= nodes.length) {
        return;
      }
      let index = heapSize++;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (keys[parent] <= key) {
          break;
        }
        nodes[index] = nodes[parent];
        keys[index] = keys[parent];
        index = parent;
      }
      nodes[index] = node;
      keys[index] = key;
    };
    const pop = () => {
      const top = nodes[0];
      heapSize--;
      const lastNode = nodes[heapSize];
      const lastKey = keys[heapSize];
      let index = 0;
      while (true) {
        let child = index * 2 + 1;
        if (child >= heapSize) {
          break;
        }
        if (child + 1 < heapSize && keys[child + 1] < keys[child]) {
          child += 1;
        }
        if (keys[child] >= lastKey) {
          break;
        }
        nodes[index] = nodes[child];
        keys[index] = keys[child];
        index = child;
      }
      nodes[index] = lastNode;
      keys[index] = lastKey;
      return top;
    };

    push(start, 0);
    const offsetX = NEIGHBOR_X;
    const offsetZ = NEIGHBOR_Z;
    const steps = NEIGHBOR_STEP;
    while (heapSize > 0) {
      const topKey = keys[0];
      const current = pop();
      const currentDistance = distance[current];
      if (topKey > currentDistance) {
        continue;
      }
      const col = current % size;
      const row = (current - col) / size;
      const currentCost = cost[current];
      for (let neighbor = 0; neighbor < 8; neighbor++) {
        const dx = offsetX[neighbor];
        const dz = offsetZ[neighbor];
        const nextCol = col + dx;
        const nextRow = row + dz;
        if (nextCol < 0 || nextRow < 0 || nextCol >= size || nextRow >= size) {
          continue;
        }
        const next = nextRow * size + nextCol;
        if (blocked[next]) {
          continue;
        }
        if (neighbor >= 4 && (blocked[row * size + nextCol] || blocked[nextRow * size + col])) {
          continue;
        }
        const candidate = currentDistance + steps[neighbor] * (currentCost + cost[next]) * 0.5;
        if (candidate < distance[next]) {
          distance[next] = candidate;
          push(next, candidate);
        }
      }
    }
    this.ready = true;
  }

  _bestNeighbor(col, row) {
    const size = this.size;
    let bestDistance = this.distance[row * size + col];
    let best = -1;
    for (let neighbor = 0; neighbor < 8; neighbor++) {
      const nextCol = col + NEIGHBOR_X[neighbor];
      const nextRow = row + NEIGHBOR_Z[neighbor];
      if (nextCol < 0 || nextRow < 0 || nextCol >= size || nextRow >= size) {
        continue;
      }
      const next = nextRow * size + nextCol;
      if (this.blocked[next]) {
        continue;
      }
      if (
        neighbor >= 4 &&
        (this.blocked[row * size + nextCol] || this.blocked[nextRow * size + col])
      ) {
        continue;
      }
      if (this.distance[next] < bestDistance) {
        bestDistance = this.distance[next];
        best = next;
      }
    }
    return best;
  }

  sample(position, out, lookahead = 4) {
    if (!this.ready) {
      return false;
    }
    const size = this.size;
    let col = Math.floor(position.x) - this.originX;
    let row = Math.floor(position.z) - this.originZ;
    if (col < 1 || row < 1 || col >= size - 1 || row >= size - 1) {
      return false;
    }
    let steps = 0;
    for (; steps < lookahead; steps++) {
      const next = this._bestNeighbor(col, row);
      if (next < 0 || !Number.isFinite(this.distance[next])) {
        break;
      }
      col = next % size;
      row = (next - col) / size;
    }
    if (steps === 0) {
      return false;
    }
    out.set(
      this.originX + col + 0.5 - position.x,
      0,
      this.originZ + row + 0.5 - position.z
    );
    const length = out.length();
    if (length < 1e-4) {
      return false;
    }
    out.divideScalar(length);
    return true;
  }
}
