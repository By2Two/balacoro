import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getStarGeometry } from "./shapes.js";
import { PROJECTILE_SIZE } from "../constants.js";

export const SHOT_SHAPE_IDS = ["box", "sphere", "diamond", "arrow", "star", "shuriken"];

export const SHOT_SPIN = {
  box: 0,
  sphere: 0,
  diamond: 5,
  arrow: 0,
  star: 6,
  shuriken: 20,
};

const centeredCache = new Map();
const liftedCache = new Map();

function buildCentered(shape) {
  switch (shape) {
    case "sphere":
      return new THREE.IcosahedronGeometry(0.3, 1);
    case "diamond": {
      const geometry = new THREE.OctahedronGeometry(0.3, 0);
      geometry.scale(0.8, 1.35, 0.8);
      return geometry;
    }
    case "arrow": {
      const shaft = new THREE.BoxGeometry(0.09, 0.09, 0.5);
      shaft.translate(0, 0, -0.08);
      const head = new THREE.ConeGeometry(0.17, 0.3, 4);
      head.rotateX(Math.PI / 2);
      head.translate(0, 0, 0.3);
      const fletching = new THREE.BoxGeometry(0.28, 0.03, 0.14);
      fletching.translate(0, 0, -0.3);
      const parts = [shaft, head, fletching].map((part) =>
        part.index ? part.toNonIndexed() : part
      );
      const merged = mergeGeometries(parts);
      for (const part of parts) {
        part.dispose();
      }
      return merged;
    }
    case "star": {
      const geometry = getStarGeometry(5, 0.45, 0.14).clone();
      geometry.rotateX(-Math.PI / 2);
      geometry.scale(0.75, 1, 0.75);
      return geometry;
    }
    case "shuriken": {
      const geometry = getStarGeometry(4, 0.28, 0.06).clone();
      geometry.rotateX(-Math.PI / 2);
      geometry.scale(0.85, 1, 0.85);
      return geometry;
    }
    default:
      return new THREE.BoxGeometry(PROJECTILE_SIZE, PROJECTILE_SIZE, PROJECTILE_SIZE);
  }
}

export function getCenteredShotGeometry(shape) {
  const key = SHOT_SPIN[shape] === undefined ? "box" : shape;
  let geometry = centeredCache.get(key);
  if (!geometry) {
    geometry = buildCentered(key);
    centeredCache.set(key, geometry);
  }
  return geometry;
}

export function getShotGeometry(shape) {
  const key = SHOT_SPIN[shape] === undefined ? "box" : shape;
  let geometry = liftedCache.get(key);
  if (!geometry) {
    geometry = getCenteredShotGeometry(key).clone();
    geometry.translate(0, 0.5, 0);
    liftedCache.set(key, geometry);
  }
  return geometry;
}
