import * as THREE from "three";

const cache = new Map();

function cached(key, create) {
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = create();
    cache.set(key, geometry);
  }
  return geometry;
}

function extrudeFlat(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geometry.center();
  return geometry;
}

export function getStarGeometry(points = 5, innerRatio = 0.45, depth = 0.18) {
  return cached(`star_${points}_${innerRatio}_${depth}`, () => {
    const shape = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? 0.5 : 0.5 * innerRatio;
      const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return extrudeFlat(shape, depth);
  });
}

export function getHeartGeometry(depth = 0.22) {
  return cached(`heart_${depth}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.42);
    shape.bezierCurveTo(-0.1, -0.3, -0.5, -0.05, -0.5, 0.15);
    shape.bezierCurveTo(-0.5, 0.4, -0.2, 0.5, 0, 0.28);
    shape.bezierCurveTo(0.2, 0.5, 0.5, 0.4, 0.5, 0.15);
    shape.bezierCurveTo(0.5, -0.05, 0.1, -0.3, 0, -0.42);
    return extrudeFlat(shape, depth);
  });
}

export function getHexagonGeometry() {
  return cached("hexagon", () => {
    const geometry = new THREE.CircleGeometry(0.5, 6);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
}

export function getDiscGeometry() {
  return cached("disc", () => {
    const geometry = new THREE.CircleGeometry(0.5, 24);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
}

export function getUnitBoxGeometry() {
  return cached("box", () => new THREE.BoxGeometry(1, 1, 1));
}

export function getOctahedronGeometry() {
  return cached("octahedron", () => new THREE.OctahedronGeometry(0.5, 0));
}

export function getIcosahedronGeometry() {
  return cached("icosahedron", () => new THREE.IcosahedronGeometry(0.5, 1));
}

export function getDodecahedronGeometry() {
  return cached("dodecahedron", () => new THREE.DodecahedronGeometry(0.5, 0));
}
