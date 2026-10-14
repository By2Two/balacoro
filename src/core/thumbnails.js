import * as THREE from "three";
import { createPlayerAvatar } from "./playerAvatar.js";
import { getCenteredShotGeometry } from "./shotShapes.js";
import { TRAIL_PREVIEW_COLORS } from "./trails.js";
import { KILL_EFFECT_GEOMETRY, getKillEffectPreviewColors } from "./killEffects.js";
import { SLOT_DEFAULTS } from "./shopCatalog.js";
import { getUnitBoxGeometry } from "./shapes.js";

const SIZE = 96;
const cache = new Map();
const queue = [];
let state = null;
let pumping = false;

function getState() {
  if (state) {
    return state;
  }
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 1.3);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  state = { renderer, scene, camera };
  return state;
}

function avatarThumbnail(customization, view = "body") {
  const avatar = createPlayerAvatar(customization);
  avatar.body.rotation.y = view === "face" ? -0.3 : -0.55;
  if (avatar.skin.isAnimated) {
    avatar.skin.animate(1.3);
  }
  return {
    object: avatar.body,
    cameraPosition:
      view === "face"
        ? new THREE.Vector3(0, 0.62, 1.9)
        : new THREE.Vector3(0, 1.05, 3.4),
    target:
      view === "face" ? new THREE.Vector3(0, 0.52, 0) : new THREE.Vector3(0, 0.6, 0),
    dispose: () => avatar.dispose(),
  };
}

function particleCluster(geometry, colors, { rising = true, additive = false } = {}) {
  const group = new THREE.Group();
  const materials = colors.map(
    (color) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: additive,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      })
  );
  const count = 14;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 3.2;
    const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
    const radius = rising ? 0.2 + t * 0.35 : 0.25 + (i % 3) * 0.2;
    mesh.position.set(
      Math.cos(angle) * radius,
      rising ? -0.5 + t * 1.1 : Math.sin(angle * 1.7) * 0.45,
      Math.sin(angle) * radius
    );
    mesh.rotation.set(angle, angle * 0.7, angle * 1.3);
    mesh.scale.setScalar(rising ? 0.28 - t * 0.14 : 0.22);
    group.add(mesh);
  }
  return {
    object: group,
    cameraPosition: new THREE.Vector3(0, 0.3, 2.4),
    target: new THREE.Vector3(0, 0, 0),
    dispose: () => {
      for (const material of materials) {
        material.dispose();
      }
    },
  };
}

function shotThumbnail(shape, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(getCenteredShotGeometry(shape), material);
  mesh.rotation.set(0.5, shape === "arrow" ? 0.9 : 0.6, 0);
  return {
    object: mesh,
    cameraPosition: new THREE.Vector3(0, 0.45, 1.45),
    target: new THREE.Vector3(0, 0, 0),
    dispose: () => material.dispose(),
  };
}

function baseLook(customization) {
  return {
    color: customization.color,
    accessories: [],
    skin: "plain",
    eyes: SLOT_DEFAULTS.eyes,
    brows: SLOT_DEFAULTS.brows,
  };
}

function buildForItem(entry, customization) {
  const look = baseLook(customization);
  switch (entry.kind) {
    case "hat":
    case "ears":
      return avatarThumbnail({ ...look, accessories: [entry.id] });
    case "glasses":
      return avatarThumbnail({ ...look, accessories: [entry.id] }, "face");
    case "eyes":
      return avatarThumbnail({ ...look, eyes: entry.id }, "face");
    case "brows":
      return avatarThumbnail({ ...look, brows: entry.id }, "face");
    case "skin":
      return avatarThumbnail({ ...look, skin: entry.id });
    case "shot":
      return shotThumbnail(entry.id, customization.projectileColor);
    case "effect":
      return particleCluster(
        getUnitBoxGeometry(),
        TRAIL_PREVIEW_COLORS[entry.id] ?? [0xffffff],
        { additive: entry.id !== "shadow" }
      );
    case "kill":
      return particleCluster(
        KILL_EFFECT_GEOMETRY[entry.id]?.() ?? getUnitBoxGeometry(),
        getKillEffectPreviewColors(entry.id) ?? [0xff5555, 0xcc3333, 0xff8888],
        { rising: false }
      );
    default:
      return null;
  }
}

function render(build) {
  const { renderer, scene, camera } = getState();
  const built = build();
  if (!built) {
    return null;
  }
  scene.add(built.object);
  camera.position.copy(built.cameraPosition);
  camera.lookAt(built.target);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(built.object);
  built.dispose?.();
  return url;
}

function pump() {
  if (queue.length === 0) {
    pumping = false;
    return;
  }
  pumping = true;
  const job = queue.shift();
  if (job.callbacks.length === 0) {
    requestAnimationFrame(pump);
    return;
  }
  if (!cache.has(job.key)) {
    try {
      cache.set(job.key, render(job.build));
    } catch {
      cache.set(job.key, null);
    }
  }
  for (const callback of job.callbacks) {
    callback(cache.get(job.key));
  }
  requestAnimationFrame(pump);
}

function request(key, build, callback) {
  if (cache.has(key)) {
    callback(cache.get(key));
    return () => {};
  }
  let job = queue.find((entry) => entry.key === key);
  if (!job) {
    job = { key, build, callbacks: [] };
    queue.push(job);
  }
  job.callbacks.push(callback);
  if (!pumping) {
    pumping = true;
    requestAnimationFrame(pump);
  }
  return () => {
    job.callbacks = job.callbacks.filter((entry) => entry !== callback);
  };
}

function colorKey(entry, customization) {
  if (entry.kind === "shot") {
    return customization.projectileColor;
  }
  if (entry.kind === "effect" || entry.kind === "kill") {
    return "fixed";
  }
  return customization.color;
}

export function requestItemThumbnail(entry, customization, callback) {
  return request(
    `item:${entry.kind}:${entry.id}:${colorKey(entry, customization)}`,
    () => buildForItem(entry, customization),
    callback
  );
}
