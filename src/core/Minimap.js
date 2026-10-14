import * as THREE from "three";
import { getDifficultyColor } from "../objects/MonsterGenome.js";
import { BIOMES } from "./world/biomeField.js";

const BIOME_COLORS = Object.fromEntries(
  Object.entries(BIOMES).map(([biome, definition]) => [biome, definition.map])
);

function hexToCss(hex) {
  return `#${(hex >>> 0).toString(16).padStart(6, "0")}`;
}

const PIXELS_PER_UNIT = 3;
const BAKE_BUDGET_PER_FRAME = 8;
const MAX_CACHED_TILES = 600;
const SHADOW_DIRECTION = { x: 0.55, z: 0.85 };

const scratchVector = new THREE.Vector3();
const scratchBox = new THREE.Box3();
const scratchColor = new THREE.Color();

export class Minimap {
  constructor(container, range = 60) {
    this.container = container;
    this.range = range;
    this.size = 200;
    this.tileCache = new Map();
    this.cacheOwner = null;
    this.createCanvasElement();
  }

  createCanvasElement() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.pixelRatio = pixelRatio;
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.width = this.size * pixelRatio;
    this.canvasElement.height = this.size * pixelRatio;
    Object.assign(this.canvasElement.style, {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      width: `${this.size}px`,
      height: `${this.size}px`,
      borderRadius: "50%",
      border: "3px solid #6b4a2b",
      boxShadow:
        "0 0 0 1px rgba(255, 214, 120, 0.75), 0 0 0 5px rgba(20, 14, 8, 0.35), 0 6px 18px rgba(0, 0, 0, 0.6)",
      background: "#1a1a1a",
      zIndex: "20",
      pointerEvents: "none",
    });
    this.renderingContext = this.canvasElement.getContext("2d");
    this.container.appendChild(this.canvasElement);

    this.shadowLayer = document.createElement("canvas");
    this.shadowContext = this.shadowLayer.getContext("2d");
  }

  update(player, enemies, items, tileManager) {
    if (!player) {
      return;
    }

    const ctx = this.renderingContext;
    const size = this.size;
    const center = size / 2;
    const radius = center - 2;
    const scale = radius / this.range;

    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, size, size);

    if (tileManager) {
      this.drawTerrain(player.position, tileManager, center, scale);
    }

    if (tileManager?.scene?.isNight) {
      ctx.fillStyle = "rgba(8, 14, 40, 0.45)";
      ctx.fillRect(0, 0, size, size);
    }

    const vignette = ctx.createRadialGradient(
      center,
      center,
      radius * 0.6,
      center,
      center,
      radius
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    const toMap = (position) => [
      center + (position.x - player.position.x) * scale,
      center + (position.z - player.position.z) * scale,
    ];
    const isInside = (x, y, margin = 0) =>
      Math.hypot(x - center, y - center) <= radius - margin;

    if (tileManager) {
      const looted = tileManager.scene?.lootedCamps;
      for (const poi of tileManager.getPointsOfInterest()) {
        if (poi.type !== "camp") {
          continue;
        }
        const [x, y] = toMap(poi);
        if (isInside(x, y, 4)) {
          this.drawCamp(x, y, looted?.has(poi.id) === true);
        }
      }
    }

    for (const item of items) {
      const [x, y] = toMap(item.position);
      if (isInside(x, y)) {
        this.drawItem(x, y);
      }
    }

    const bosses = [];
    for (const enemy of enemies) {
      if (enemy.isDormant || enemy.isHiddenInGrass || enemy.isCloaked) {
        continue;
      }
      const [x, y] = toMap(enemy.position);
      const color = `#${getDifficultyColor(enemy.difficulty).getHexString()}`;
      if (enemy.isBoss) {
        bosses.push({ x, y, color });
        continue;
      }
      if (!isInside(x, y)) {
        continue;
      }
      this.drawEnemy(
        x,
        y,
        enemy.isElite
          ? `hsl(${(performance.now() * 0.2) % 360}, 100%, 60%)`
          : color,
        enemy.isElite ? 3.8 : 3
      );
    }

    for (const boss of bosses) {
      if (isInside(boss.x, boss.y, 6)) {
        this.drawBossSkull(boss.x, boss.y, boss.color);
      } else {
        this.drawBossPointer(boss.x, boss.y, boss.color, center, radius);
      }
    }

    const direction = player.lastDirection;
    const angle =
      direction && direction.lengthSq() > 0
        ? Math.atan2(direction.z, direction.x)
        : -Math.PI / 2;
    this.drawPlayerArrow(
      center,
      center,
      angle,
      `#${(player.customColor ?? 0xffd35a).toString(16).padStart(6, "0")}`
    );

    ctx.restore();

    ctx.beginPath();
    ctx.arc(center, center, radius - 0.5, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.stroke();
  }

  drawTerrain(playerPosition, tileManager, center, scale) {
    if (this.cacheOwner !== tileManager) {
      this.tileCache.clear();
      this.cacheOwner = tileManager;
    }

    const ctx = this.renderingContext;
    const tileSize = tileManager.tileSize;
    const half = tileSize / 2;
    const minChunkX = tileManager._worldToChunk(playerPosition.x - this.range);
    const maxChunkX = tileManager._worldToChunk(playerPosition.x + this.range);
    const minChunkZ = tileManager._worldToChunk(playerPosition.z - this.range);
    const maxChunkZ = tileManager._worldToChunk(playerPosition.z + this.range);
    const toPixelX = (worldX) =>
      Math.round((center + (worldX - playerPosition.x) * scale) * this.pixelRatio) /
      this.pixelRatio;
    const toPixelZ = (worldZ) =>
      Math.round((center + (worldZ - playerPosition.z) * scale) * this.pixelRatio) /
      this.pixelRatio;

    let bakeBudget = BAKE_BUDGET_PER_FRAME;
    ctx.imageSmoothingEnabled = true;

    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      const left = toPixelX(chunkX * tileSize - half);
      const right = toPixelX(chunkX * tileSize + half);
      for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
        const top = toPixelZ(chunkZ * tileSize - half);
        const bottom = toPixelZ(chunkZ * tileSize + half);
        const key = tileManager._tileKey(chunkX, chunkZ);

        let bitmap = this.tileCache.get(key);
        if (!bitmap && bakeBudget > 0) {
          const tile = tileManager.loadedTiles.get(key);
          if (tile) {
            bitmap = this.bakeTile(tile, chunkX, chunkZ, tileSize);
            this.storeTile(key, bitmap);
            bakeBudget--;
          }
        }

        if (bitmap) {
          ctx.drawImage(bitmap, left, top, right - left, bottom - top);
        } else {
          ctx.fillStyle =
            BIOME_COLORS[tileManager.getBiomeNameForChunk(chunkX, chunkZ)] ??
            "#222";
          ctx.fillRect(left, top, right - left, bottom - top);
        }
      }
    }
  }

  storeTile(key, bitmap) {
    this.tileCache.set(key, bitmap);
    if (this.tileCache.size > MAX_CACHED_TILES) {
      this.tileCache.delete(this.tileCache.keys().next().value);
    }
  }

  bakeTile(tile, chunkX, chunkZ, tileSize) {
    if (tile.map) {
      return this.bakeMapTile(tile, chunkX, chunkZ, tileSize);
    }
    const pixelSize = tileSize * PIXELS_PER_UNIT;
    const canvas = document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    const originX = chunkX * tileSize - tileSize / 2;
    const originZ = chunkZ * tileSize - tileSize / 2;
    const project = (vector) => [
      (vector.x - originX) * PIXELS_PER_UNIT,
      (vector.z - originZ) * PIXELS_PER_UNIT,
    ];

    const flats = [];
    const solids = [];

    for (const root of tile.meshes) {
      root.updateWorldMatrix(true, true);
      root.traverse((child) => {
        if (!child.isMesh || child.isInstancedMesh || !child.visible) {
          return;
        }
        const shape = this.describeMesh(child, project);
        if (!shape) {
          return;
        }
        (shape.maxY < 0.1 ? flats : solids).push(shape);
      });
    }

    flats.sort((a, b) => a.maxY - b.maxY);
    solids.sort((a, b) => a.maxY - b.maxY);

    for (const shape of flats) {
      this.paintShape(ctx, shape, false);
    }

    this.paintShadows(ctx, solids, pixelSize);

    for (const shape of solids) {
      this.paintShape(ctx, shape, true);
    }

    return canvas;
  }

  bakeMapTile(tile, chunkX, chunkZ, tileSize) {
    const pixelSize = tileSize * PIXELS_PER_UNIT;
    const canvas = document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    const originX = chunkX * tileSize - tileSize / 2;
    const originZ = chunkZ * tileSize - tileSize / 2;
    const { size, cells, shapes } = tile.map;
    const cellPixels = pixelSize / size;

    for (let index = 0; index < cells.length; index++) {
      ctx.fillStyle = hexToCss(cells[index]);
      ctx.fillRect(
        (index % size) * cellPixels,
        Math.floor(index / size) * cellPixels,
        cellPixels + 0.5,
        cellPixels + 0.5
      );
    }

    const solids = shapes
      .map((shape) => {
        const x = (shape.x - originX) * PIXELS_PER_UNIT;
        const y = (shape.z - originZ) * PIXELS_PER_UNIT;
        const color = hexToCss(shape.color ?? 0x888888);
        if (shape.kind === "circle") {
          const radius = Math.max(shape.r * PIXELS_PER_UNIT, 0.8);
          return { kind: "ellipse", x, y, radiusX: radius, radiusY: radius, color, maxY: shape.height, opacity: 1 };
        }
        const cos = Math.cos(shape.angle);
        const sin = Math.sin(shape.angle);
        const axisX = [cos * shape.hw, -sin * shape.hw];
        const axisZ = [sin * shape.hd, cos * shape.hd];
        const corner = (signX, signZ) => [
          x + (axisX[0] * signX + axisZ[0] * signZ) * PIXELS_PER_UNIT,
          y + (axisX[1] * signX + axisZ[1] * signZ) * PIXELS_PER_UNIT,
        ];
        return {
          kind: "polygon",
          points: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
          color,
          maxY: shape.height,
          opacity: 1,
        };
      })
      .sort((a, b) => a.maxY - b.maxY);

    this.paintShadows(ctx, solids, pixelSize);
    for (const shape of solids) {
      this.paintShape(ctx, shape, true);
    }
    return canvas;
  }

  describeMesh(mesh, project) {
    const geometry = mesh.geometry;
    const material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    if (!geometry || !material) {
      return null;
    }

    scratchBox.setFromObject(mesh);
    const maxY = scratchBox.max.y;
    const opacity = material.transparent ? material.opacity ?? 1 : 1;
    const color = material.color ? material.color.getStyle() : "#888";

    if (material.vertexColors && geometry.getAttribute("color")) {
      return {
        kind: "vertexColored",
        triangles: this.projectVertexColoredTriangles(mesh, project),
        maxY,
        opacity,
      };
    }

    const type = geometry.type;
    const parameters = geometry.parameters ?? {};

    if (type === "BoxGeometry") {
      const w = (parameters.width ?? 1) / 2;
      const h = (parameters.height ?? 1) / 2;
      const d = (parameters.depth ?? 1) / 2;
      return this.polygonShape(
        mesh,
        project,
        [
          [-w, h, -d],
          [w, h, -d],
          [w, h, d],
          [-w, h, d],
        ],
        color,
        maxY,
        opacity
      );
    }

    if (type === "PlaneGeometry") {
      const w = (parameters.width ?? 1) / 2;
      const h = (parameters.height ?? 1) / 2;
      return this.polygonShape(
        mesh,
        project,
        [
          [-w, -h, 0],
          [w, -h, 0],
          [w, h, 0],
          [-w, h, 0],
        ],
        color,
        maxY,
        opacity
      );
    }

    if (type === "ConeGeometry" && parameters.radialSegments === 4) {
      const coneRadius = parameters.radius ?? 1;
      const baseY = -(parameters.height ?? 1) / 2;
      const corners = [];
      for (let i = 0; i < 4; i++) {
        const theta = (i / 4) * Math.PI * 2;
        corners.push([
          Math.sin(theta) * coneRadius,
          baseY,
          Math.cos(theta) * coneRadius,
        ]);
      }
      return this.polygonShape(mesh, project, corners, color, maxY, opacity);
    }

    const [minX, minZ] = project(scratchBox.min);
    const [maxX, maxZ] = project(scratchBox.max);
    return {
      kind: "ellipse",
      x: (minX + maxX) / 2,
      y: (minZ + maxZ) / 2,
      radiusX: Math.max((maxX - minX) / 2, 0.6),
      radiusY: Math.max((maxZ - minZ) / 2, 0.6),
      color,
      maxY,
      opacity,
    };
  }

  polygonShape(mesh, project, localCorners, color, maxY, opacity) {
    const points = localCorners.map(([x, y, z]) =>
      project(scratchVector.set(x, y, z).applyMatrix4(mesh.matrixWorld))
    );
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      area += x1 * y2 - x2 * y1;
    }
    if (Math.abs(area) < 1) {
      return null;
    }
    return { kind: "polygon", points, color, maxY, opacity };
  }

  projectVertexColoredTriangles(mesh, project) {
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute("position");
    const colors = geometry.getAttribute("color");
    const triangles = [];
    for (let start = 0; start + 2 < positions.count; start += 3) {
      const points = [];
      for (let v = 0; v < 3; v++) {
        scratchVector
          .fromBufferAttribute(positions, start + v)
          .applyMatrix4(mesh.matrixWorld);
        points.push(project(scratchVector));
      }
      scratchColor.setRGB(
        colors.getX(start),
        colors.getY(start),
        colors.getZ(start)
      );
      triangles.push({ points, color: scratchColor.getStyle() });
    }
    return triangles;
  }

  tracePath(ctx, shape, offsetX = 0, offsetY = 0) {
    ctx.beginPath();
    if (shape.kind === "ellipse") {
      ctx.ellipse(
        shape.x + offsetX,
        shape.y + offsetY,
        shape.radiusX,
        shape.radiusY,
        0,
        0,
        Math.PI * 2
      );
      return;
    }
    shape.points.forEach(([x, y], index) => {
      if (index === 0) {
        ctx.moveTo(x + offsetX, y + offsetY);
      } else {
        ctx.lineTo(x + offsetX, y + offsetY);
      }
    });
    ctx.closePath();
  }

  paintShadows(ctx, solids, pixelSize) {
    if (solids.length === 0) {
      return;
    }
    const layer = this.shadowLayer;
    if (layer.width !== pixelSize) {
      layer.width = pixelSize;
      layer.height = pixelSize;
    }
    const shadowCtx = this.shadowContext;
    shadowCtx.clearRect(0, 0, pixelSize, pixelSize);
    shadowCtx.fillStyle = "#000";
    for (const shape of solids) {
      const length = Math.min(shape.maxY * 0.45, 3) * PIXELS_PER_UNIT;
      this.tracePath(
        shadowCtx,
        shape,
        SHADOW_DIRECTION.x * length,
        SHADOW_DIRECTION.z * length
      );
      shadowCtx.fill();
    }
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  paintShape(ctx, shape, raised) {
    ctx.save();
    ctx.globalAlpha = shape.opacity;

    if (shape.kind === "vertexColored") {
      for (const triangle of shape.triangles) {
        ctx.beginPath();
        ctx.moveTo(...triangle.points[0]);
        ctx.lineTo(...triangle.points[1]);
        ctx.lineTo(...triangle.points[2]);
        ctx.closePath();
        ctx.fillStyle = triangle.color;
        ctx.fill();
        ctx.strokeStyle = triangle.color;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    this.tracePath(ctx, shape);
    ctx.fillStyle = shape.color;
    ctx.fill();

    if (raised) {
      const bounds = this.shapeBounds(shape);
      const highlight = ctx.createLinearGradient(
        bounds.minX,
        bounds.minY,
        bounds.maxX,
        bounds.maxY
      );
      highlight.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      highlight.addColorStop(0.55, "rgba(255, 255, 255, 0)");
      highlight.addColorStop(1, "rgba(0, 0, 0, 0.22)");
      ctx.fillStyle = highlight;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.stroke();
    }
    ctx.restore();
  }

  shapeBounds(shape) {
    if (shape.kind === "ellipse") {
      return {
        minX: shape.x - shape.radiusX,
        minY: shape.y - shape.radiusY,
        maxX: shape.x + shape.radiusX,
        maxY: shape.y + shape.radiusY,
      };
    }
    const xs = shape.points.map((point) => point[0]);
    const ys = shape.points.map((point) => point[1]);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  drawCamp(x, y, looted) {
    const ctx = this.renderingContext;
    ctx.save();
    ctx.translate(x, y);
    if (!looted) {
      ctx.shadowColor = "#ffb050";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(5, 4);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fillStyle = looted ? "rgba(120, 110, 100, 0.8)" : "#ffb050";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(30, 18, 8, 0.9)";
    ctx.stroke();
    ctx.restore();
  }

  drawItem(x, y) {
    const ctx = this.renderingContext;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = "#cc66ff";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#cc66ff";
    ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeRect(-2.6, -2.6, 5.2, 5.2);
    ctx.restore();
  }

  drawEnemy(x, y, color, dotRadius) {
    const ctx = this.renderingContext;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(20, 10, 5, 0.85)";
    ctx.stroke();
  }

  drawBossSkull(x, y, color) {
    const ctx = this.renderingContext;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.stroke();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("☠", x, y);
  }

  drawBossPointer(x, y, color, center, radius) {
    const ctx = this.renderingContext;
    const angle = Math.atan2(y - center, x - center);
    const edge = radius - 9;
    ctx.save();
    ctx.translate(
      center + Math.cos(angle) * edge,
      center + Math.sin(angle) * edge
    );
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-4, -5.5);
    ctx.lineTo(-4, 5.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.stroke();
    ctx.restore();
  }

  drawPlayerArrow(x, y, angle, color) {
    const ctx = this.renderingContext;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 5.5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, -5.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#2b1d10";
    ctx.stroke();
    ctx.restore();
  }

  dispose() {
    this.tileCache.clear();
    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
    }
  }
}
