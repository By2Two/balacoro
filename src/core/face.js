import * as THREE from "three";

export const EYE_STYLE_IDS = ["bead", "googly", "slit", "closed", "happy"];
export const BROW_STYLE_IDS = ["none", "angry", "worried", "raised"];

const geometryCache = new Map();
const scleraMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f2e8 });
const reptileMaterial = new THREE.MeshStandardMaterial({
  color: 0xffc83a,
  emissive: 0x3a2400,
});
const browMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

function box(width, height, depth) {
  const key = `${width}_${height}_${depth}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(width, height, depth);
    geometryCache.set(key, geometry);
  }
  return geometry;
}

export function createFace(eyeStyle = "bead", browStyle = "none") {
  const group = new THREE.Group();
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const add = (geometry, material, x, y, z, rotationZ = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotationZ;
    group.add(mesh);
    return mesh;
  };

  for (const side of [-1, 1]) {
    const eyeX = side * 0.2;
    const eyeY = 0.15;
    const eyeZ = 0.51;

    switch (eyeStyle) {
      case "googly":
        add(box(0.26, 0.26, 0.05), scleraMaterial, eyeX, eyeY, eyeZ);
        add(
          box(0.12, 0.12, 0.04),
          pupilMaterial,
          eyeX - side * 0.04,
          eyeY - 0.03,
          eyeZ + 0.04
        );
        break;
      case "slit":
        add(box(0.24, 0.22, 0.05), reptileMaterial, eyeX, eyeY, eyeZ);
        add(box(0.05, 0.2, 0.04), pupilMaterial, eyeX, eyeY, eyeZ + 0.04);
        break;
      case "closed":
        add(box(0.2, 0.045, 0.05), pupilMaterial, eyeX, eyeY - 0.02, eyeZ);
        break;
      case "happy":
        add(box(0.13, 0.045, 0.05), pupilMaterial, eyeX - 0.045, eyeY, eyeZ, 0.65);
        add(box(0.13, 0.045, 0.05), pupilMaterial, eyeX + 0.045, eyeY, eyeZ, -0.65);
        break;
      default:
        add(box(0.18, 0.18, 0.06), pupilMaterial, eyeX, eyeY, eyeZ);
    }

    if (browStyle === "angry") {
      add(box(0.24, 0.055, 0.05), browMaterial, eyeX, 0.35, eyeZ, side * 0.38);
    } else if (browStyle === "worried") {
      add(box(0.24, 0.055, 0.05), browMaterial, eyeX, 0.35, eyeZ, -side * 0.38);
    } else if (browStyle === "raised") {
      add(box(0.24, 0.055, 0.05), browMaterial, eyeX, 0.39, eyeZ, -side * 0.12);
    }
  }

  return {
    group,
    pupilMaterial,
    dispose() {
      pupilMaterial.dispose();
    },
  };
}
