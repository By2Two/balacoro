import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  spread,
  between,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnGroundGlow,
  spawnLightPillar,
} from "../powerFx.js";
import {
  spawnRingWave,
} from "./helpers.js";

export function performSlowField(player, scene, skill) {
  audio.play("powerTimeWarp", { position: player.position });
  const range = skill.range ?? 14;
  const duration = skill.duration ?? 5;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, {
    color: 0xb9a7ff,
    radius: range,
    duration: 0.6,
    opacity: 0.3,
    dome: true,
  });

  const clock = new THREE.Group();
  const clockMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6c8ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const face = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.5, 48), clockMaterial);
  face.rotation.x = -Math.PI / 2;
  clock.add(face);
  const tickGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.45);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(tickGeometry, clockMaterial);
    tick.position.set(Math.cos(angle) * 2, 0, Math.sin(angle) * 2);
    tick.rotation.y = -angle + Math.PI / 2;
    clock.add(tick);
  }
  const handGeometry = new THREE.BoxGeometry(0.12, 0.02, 1.8);
  handGeometry.translate(0, 0, 0.9);
  const hand = new THREE.Mesh(handGeometry, clockMaterial);
  clock.add(hand);
  clock.position.set(origin.x, 0.08, origin.z);
  scene.add(clock);

  let time = 0;
  let moteTimer = 0;
  let tickTimer = 0;
  const clockDuration = 1.4;

  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.6,
    color: 0xb9a7ff,
    bandWidth: 0.5,
    onWaveHit: (enemy) => {
      enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, duration);
    },
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      moteTimer -= delta;
      if (clock.parent) {
        tickTimer -= delta;
        if (tickTimer <= 0 && time < clockDuration - 0.2) {
          tickTimer = 0.35;
          audio.play("timewarpTick");
        }
        const t = Math.min(time / clockDuration, 1);
        hand.rotation.y = -time * 9;
        clock.rotation.y = time * 0.8;
        clock.scale.setScalar(1 + t * 0.6);
        clockMaterial.opacity = 0.9 * (1 - t);
        if (t >= 1) {
          scene.remove(clock);
        }
      }
      if (moteTimer <= 0) {
        moteTimer = 0.2;
        for (const enemy of scene.enemies) {
          if (enemy.isDying || !(enemy.slowTimer > 0)) {
            continue;
          }
          fxSystem(scene, "glow").emit({
            x: enemy.position.x + spread(0.4 * enemy.size),
            y: between(0.4, 1.2) * enemy.size,
            z: enemy.position.z + spread(0.4 * enemy.size),
            vy: 0.3,
            wobble: 0.8,
            life: 0.7,
            size: 0.14,
            sizeEnd: 0.03,
            color: 0xc8b8ff,
            intensity: 1.8,
          });
        }
      }
      return time < duration;
    },
    dispose() {
      scene.remove(clock);
      face.geometry.dispose();
      tickGeometry.dispose();
      handGeometry.dispose();
      clockMaterial.dispose();
    },
  });
}

export function performHealBurst(player, scene, skill) {
  audio.play("powerHealBurst", { position: player.position });
  const healAmount = player.maxHealth * (skill.healPercent ?? 0.25);
  player.health = Math.min(player.health + healAmount, player.maxHealth);
  const origin = player.position.clone();
  spawnLightPillar(scene, origin, { color: 0x4dff88, radius: 1, height: 9, duration: 0.7, opacity: 0.55 });
  spawnGroundRing(scene, origin, { color: 0x4dff88, radius: 2.6, duration: 0.5 });
  spawnGroundGlow(scene, origin, 1.4, 0x4dff88, 0.7, 1.8);
  spawnExpandingSphere(scene, origin, { color: 0x9dffb8, radius: 1.3, duration: 0.3, opacity: 0.6 });
  for (let i = 0; i < 12; i++) {
    const x = origin.x + spread(1.2);
    const y = between(0.3, 1.2);
    const z = origin.z + spread(1.2);
    const common = {
      x,
      y,
      z,
      vy: between(1.5, 2.8),
      wobble: 0.6,
      life: between(0.8, 1.2),
      size: 0.1,
      sizeEnd: 0.05,
      rx: 0,
      ry: 0,
      rz: 0,
      color: 0x7dffa8,
      intensity: 2,
      fadeOut: 0.5,
    };
    const system = fxSystem(scene, "sparks");
    system.emit({ ...common, shapeX: 3.5 });
    system.emit({ ...common, shapeY: 3.5 });
  }
}
