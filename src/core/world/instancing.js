import * as THREE from "three";
import { windowLitMaterial } from "../biomes/lightMaterials.js";
import { makeCircleCollider, makeBoxCollider } from "./collision.js";

export const worldUniforms = { uTime: { value: 0 } };

function roofGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 0.5);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  geometry.translate(0, 0, -0.5);
  return geometry;
}

function bladeGeometry(bladeCount, spread, width) {
  const positions = [];
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const offsetX = Math.cos(angle) * spread;
    const offsetZ = Math.sin(angle) * spread;
    const leanX = Math.cos(angle) * 0.18;
    const leanZ = Math.sin(angle) * 0.18;
    const sideX = -Math.sin(angle) * width;
    const sideZ = Math.cos(angle) * width;
    positions.push(
      offsetX - sideX, 0, offsetZ - sideZ,
      offsetX + sideX, 0, offsetZ + sideZ,
      offsetX + leanX, 1, offsetZ + leanZ
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const GEOMETRY_BUILDERS = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  cyl5: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 5),
  cyl6: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cyl8: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  taper6: () => new THREE.CylinderGeometry(0.36, 0.5, 1, 6),
  cone4: () => new THREE.ConeGeometry(0.5, 1, 4),
  cone6: () => new THREE.ConeGeometry(0.5, 1, 6),
  cone8: () => new THREE.ConeGeometry(0.5, 1, 8),
  ico0: () => new THREE.IcosahedronGeometry(0.5, 0),
  ico1: () => new THREE.IcosahedronGeometry(0.5, 1),
  dodeca: () => new THREE.DodecahedronGeometry(0.5, 0),
  octa: () => new THREE.OctahedronGeometry(0.5, 0),
  sphere: () => new THREE.SphereGeometry(0.5, 8, 6),
  dome: () => new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: () => new THREE.TorusGeometry(0.4, 0.1, 5, 12),
  arc: () => new THREE.TorusGeometry(0.5, 0.06, 4, 10, Math.PI),
  disc: () => {
    const geometry = new THREE.CircleGeometry(0.5, 8);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  },
  roof: roofGeometry,
  blades: () => bladeGeometry(5, 0.08, 0.05),
  tuft: () => bladeGeometry(4, 0.05, 0.07),
};

const geometryCache = new Map();

export function getWorldGeometry(key) {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = GEOMETRY_BUILDERS[key]();
    geometryCache.set(key, geometry);
  }
  return geometry;
}

function patchMaterial(material, cacheKey, { wind = 0, glow = 0, pulse = false }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nuniform float uTime;"
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nuniform float uTime;"
    );
    if (wind > 0) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 windOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 windOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float windWeight = max(transformed.y, 0.0) * ${wind.toFixed(3)};
        transformed.x += sin(uTime * 1.7 + windOrigin.x * 0.35 + windOrigin.z * 0.2) * windWeight;
        transformed.z += cos(uTime * 1.3 + windOrigin.z * 0.35 + windOrigin.x * 0.1) * windWeight * 0.6;`
      );
    }
    if (glow > 0) {
      const pulseTerm = pulse ? "(0.75 + 0.25 * sin(uTime * 2.2))" : "1.0";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * ${glow.toFixed(3)} * ${pulseTerm};`
      );
    }
  };
  material.customProgramCacheKey = () => cacheKey;
  return material;
}

function standard(options = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    flatShading: true,
    roughness: 0.9,
    ...options,
  });
}

const MATERIAL_BUILDERS = {
  std: () => ({ material: standard(), castShadow: true }),
  leaf: () => ({
    material: patchMaterial(standard(), "world-leaf", { wind: 0.05 }),
    castShadow: true,
  }),
  grass: () => ({
    material: patchMaterial(standard({ side: THREE.DoubleSide }), "world-grass", {
      wind: 0.3,
    }),
    castShadow: false,
  }),
  tallGrass: () => ({
    material: patchMaterial(standard({ side: THREE.DoubleSide }), "world-tall-grass", {
      wind: 0.22,
    }),
    castShadow: false,
  }),
  decal: () => ({ material: standard(), castShadow: false }),
  glow: () => ({
    material: patchMaterial(standard({ roughness: 0.5 }), "world-glow", { glow: 1.1 }),
    castShadow: true,
  }),
  glowStrong: () => ({
    material: patchMaterial(standard({ roughness: 0.6 }), "world-glow-strong", {
      glow: 2.4,
      pulse: true,
    }),
    castShadow: false,
  }),
  metal: () => ({
    material: standard({ metalness: 0.35, roughness: 0.55 }),
    castShadow: true,
  }),
  glossy: () => ({
    material: standard({ roughness: 0.45, metalness: 0.15 }),
    castShadow: true,
  }),
  window: () => ({ material: windowLitMaterial, castShadow: false }),
};

const materialCache = new Map();

export function getWorldMaterial(key) {
  let entry = materialCache.get(key);
  if (!entry) {
    entry = MATERIAL_BUILDERS[key]();
    materialCache.set(key, entry);
  }
  return entry;
}

export function part(geometry, material, color, position, scale = 1, rotation = null) {
  return {
    g: geometry,
    m: material,
    c: color,
    p: position,
    s: typeof scale === "number" ? [scale, scale, scale] : scale,
    r: rotation,
  };
}

const partPosition = new THREE.Vector3();
const partScale = new THREE.Vector3();
const partQuaternion = new THREE.Quaternion();
const partEuler = new THREE.Euler();
const parentMatrix = new THREE.Matrix4();
const localMatrix = new THREE.Matrix4();
const parentPosition = new THREE.Vector3();
const parentScale = new THREE.Vector3();
const parentQuaternion = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);

export class PrefabBatch {
  constructor() {
    this.buckets = new Map();
    this.colliders = [];
    this.mapShapes = [];
  }

  place(built, x, z, rotationY = 0, scale = 1) {
    parentMatrix.compose(
      parentPosition.set(x, 0, z),
      parentQuaternion.setFromAxisAngle(upAxis, rotationY),
      parentScale.set(scale, scale, scale)
    );
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const toWorld = (localX, localZ) => [
      x + (localX * cos + localZ * sin) * scale,
      z + (-localX * sin + localZ * cos) * scale,
    ];

    for (const entry of built.parts) {
      this._addPart(entry);
    }

    for (const collider of built.colliders ?? []) {
      const [worldX, worldZ] = toWorld(collider.x ?? 0, collider.z ?? 0);
      if (collider.circle) {
        this.colliders.push(makeCircleCollider(worldX, worldZ, collider.circle * scale));
      } else if (collider.box) {
        this.colliders.push(
          makeBoxCollider(
            worldX,
            worldZ,
            collider.box[0] * scale,
            collider.box[1] * scale,
            -(rotationY + (collider.rot ?? 0))
          )
        );
      }
    }

    for (const shape of built.map ?? []) {
      const [worldX, worldZ] = toWorld(shape.x ?? 0, shape.z ?? 0);
      if (shape.circle) {
        this.mapShapes.push({
          kind: "circle",
          x: worldX,
          z: worldZ,
          r: shape.circle * scale,
          color: shape.color,
          height: (shape.h ?? 1) * scale,
        });
      } else if (shape.box) {
        this.mapShapes.push({
          kind: "box",
          x: worldX,
          z: worldZ,
          hw: shape.box[0] * scale,
          hd: shape.box[1] * scale,
          angle: rotationY + (shape.rot ?? 0),
          color: shape.color,
          height: (shape.h ?? 1) * scale,
        });
      }
    }
  }

  _addPart(entry) {
    const key = `${entry.g}|${entry.m}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { geometry: entry.g, material: entry.m, matrices: [], colors: [] };
      this.buckets.set(key, bucket);
    }
    partEuler.set(entry.r?.[0] ?? 0, entry.r?.[1] ?? 0, entry.r?.[2] ?? 0);
    localMatrix.compose(
      partPosition.set(entry.p[0], entry.p[1], entry.p[2]),
      partQuaternion.setFromEuler(partEuler),
      partScale.set(entry.s[0], entry.s[1], entry.s[2])
    );
    bucket.matrices.push(new THREE.Matrix4().multiplyMatrices(parentMatrix, localMatrix));
    bucket.colors.push(entry.c);
  }

  build(scene, meshes) {
    const color = new THREE.Color();
    for (const bucket of this.buckets.values()) {
      const { material, castShadow } = getWorldMaterial(bucket.material);
      const mesh = new THREE.InstancedMesh(
        getWorldGeometry(bucket.geometry),
        material,
        bucket.matrices.length
      );
      for (let index = 0; index < bucket.matrices.length; index++) {
        mesh.setMatrixAt(index, bucket.matrices[index]);
        mesh.setColorAt(index, color.set(bucket.colors[index]));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      meshes.push(mesh);
    }
  }
}
