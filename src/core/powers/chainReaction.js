import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  shake,
  between,
  spawnExplosion,
  spawnGroundRing,
} from "../powerFx.js";
import { spawnRingWave, pushAway } from "./helpers.js";

const CHAIN_COLOR = 0xb4ff2a;
const CHAIN_HOT_COLOR = 0xf6ffd0;
const CHAIN_LINK_DELAY = 0.12;
const CHAIN_MARK_FUSE = 1.6;
const MAX_DETONATIONS_PER_FRAME = 6;

const markRingGeometry = new THREE.RingGeometry(0.75, 0.95, 24);
markRingGeometry.rotateX(-Math.PI / 2);
const markSigilGeometry = new THREE.OctahedronGeometry(0.22, 0);

export function createChainState() {
  return { marks: new Map(), detonated: new Set(), queue: [] };
}

export function markEnemy(state, enemy, expiresAt) {
  if (state.detonated.has(enemy) || state.marks.has(enemy)) {
    return false;
  }
  state.marks.set(enemy, { expiresAt });
  return true;
}

export function collectDetonations(state, now) {
  const ready = [];
  for (const [enemy, mark] of state.marks) {
    if (enemy.isDying || now >= mark.expiresAt) {
      ready.push(enemy);
    }
  }
  for (const enemy of ready) {
    state.marks.delete(enemy);
    state.detonated.add(enemy);
    state.queue.push({ enemy, at: now + CHAIN_LINK_DELAY });
  }
  return ready;
}

export function performChainReaction(player, scene, skill) {
  const range = skill.range ?? 9;
  const markDuration = skill.duration ?? 6;
  const blastRadius = skill.blastRadius ?? 3;
  const damage =
    (skill.damage ?? 3) + (player.damage ?? 1) * (skill.playerDamageScale ?? 0);
  const origin = player.position.clone();

  const state = createChainState();
  const visuals = new Map();
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: CHAIN_COLOR,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const sigilMaterial = new THREE.MeshBasicMaterial({ color: CHAIN_HOT_COLOR });

  let time = 0;
  let casting = true;

  const attachMark = (enemy) => {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(markRingGeometry, ringMaterial);
    ring.position.y = 0.08;
    ring.scale.setScalar(Math.max(enemy.size ?? 1, 0.8));
    const sigil = new THREE.Mesh(markSigilGeometry, sigilMaterial);
    sigil.position.y = (enemy.size ?? 1) + 0.9;
    group.add(ring, sigil);
    enemy.add(group);
    visuals.set(enemy, { group, sigil });
  };

  const detachMark = (enemy) => {
    const visual = visuals.get(enemy);
    if (visual) {
      enemy.remove(visual.group);
      visuals.delete(enemy);
    }
  };

  const tryMark = (enemy, expiresAt) => {
    if (enemy.isDying || enemy.isDormant) {
      return;
    }
    if (markEnemy(state, enemy, expiresAt)) {
      attachMark(enemy);
    }
  };

  const detonate = (enemy) => {
    const center = new THREE.Vector3(enemy.position.x, 0, enemy.position.z);
    spawnExplosion(scene, center, {
      radius: blastRadius,
      color: CHAIN_COLOR,
      hotColor: CHAIN_HOT_COLOR,
      smokeColor: 0x2c3a1c,
      power: 0.55,
    });
    audio.play("chainReactionDetonate", { position: center });
    shake(scene, 0.15, 0.18);
    if (!enemy.isDying) {
      enemy.hit(damage);
    }
    for (const other of scene.enemies) {
      if (other === enemy || other.isDying || other.isDormant) {
        continue;
      }
      const reach = blastRadius + other.hitboxRadius;
      const dx = other.position.x - center.x;
      const dz = other.position.z - center.z;
      if (dx * dx + dz * dz > reach * reach) {
        continue;
      }
      tryMark(other, time + CHAIN_MARK_FUSE);
      other.hit(damage);
      pushAway(other, center, 8);
    }
  };

  audio.play("chainReactionCast", { position: origin });
  spawnGroundRing(scene, origin, { color: CHAIN_COLOR, radius: range, duration: 0.5 });
  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.5,
    color: CHAIN_COLOR,
    bandWidth: 0.4,
    onWaveHit: (enemy) => tryMark(enemy, time + markDuration),
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      if (casting && time > 0.55) {
        casting = false;
      }

      for (const [enemy, visual] of visuals) {
        const mark = state.marks.get(enemy);
        const left = mark ? mark.expiresAt - time : 0;
        const urgency = left < 1 ? 1 - left : 0;
        visual.sigil.rotation.y += delta * (3 + urgency * 12);
        visual.sigil.position.y =
          (enemy.size ?? 1) + 0.9 + Math.sin(time * 4 + enemy.id) * 0.1;
        visual.group.children[0].rotation.y -= delta * 2;
        visual.group.visible = !(urgency > 0 && Math.sin(time * 40) < 0);
      }
      ringMaterial.opacity = 0.6 + Math.sin(time * 8) * 0.2;

      for (const enemy of collectDetonations(state, time)) {
        detachMark(enemy);
        fxSystem(scene, "glow").emit({
          x: enemy.position.x,
          y: (enemy.size ?? 1) + 0.9,
          z: enemy.position.z,
          vy: 2,
          life: 0.2,
          size: 0.6,
          sizeEnd: 0.05,
          color: CHAIN_HOT_COLOR,
          colorEnd: CHAIN_COLOR,
          intensity: 2.4,
        });
      }

      let detonations = 0;
      while (
        state.queue.length > 0 &&
        state.queue[0].at <= time &&
        detonations < MAX_DETONATIONS_PER_FRAME
      ) {
        detonate(state.queue.shift().enemy);
        detonations += 1;
      }

      if (Math.random() < delta * 20 && visuals.size > 0) {
        const enemies = [...visuals.keys()];
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        fxSystem(scene, "glow").emit({
          x: enemy.position.x,
          y: between(0.3, 1.2),
          z: enemy.position.z,
          vy: between(0.8, 1.6),
          life: 0.5,
          size: 0.15,
          sizeEnd: 0.03,
          color: CHAIN_COLOR,
          intensity: 1.8,
        });
      }

      return casting || state.marks.size > 0 || state.queue.length > 0;
    },
    dispose() {
      for (const enemy of [...visuals.keys()]) {
        detachMark(enemy);
      }
      ringMaterial.dispose();
      sigilMaterial.dispose();
    },
  });
}
