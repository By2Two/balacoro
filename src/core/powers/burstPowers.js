import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  emitBurst,
  shake,
  spread,
  between,
  spawnExplosion,
  spawnExpandingSphere,
  spawnGroundRing,
} from "../powerFx.js";
import {
  spawnRingWave,
  firePlayerProjectile,
  pushAway,
  pickColor,
} from "./helpers.js";

export function performEnergyExplosion(player, scene, skill) {
  const range = skill.range ?? 2;
  const origin = player.position.clone();
  const damage =
    (skill.damage ?? 1) + (player.damage ?? 1) * (skill.playerDamageScale ?? 0);
  spawnExplosion(scene, origin, {
    radius: range,
    color: 0xff6a1f,
    hotColor: 0xfff1a8,
    power: 0.8 + range * 0.12,
  });
  shake(scene, 0.3, 0.35);
  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.3,
    color: 0xff8a3d,
    bandWidth: 0.25,
    onWaveHit: (enemy) => {
      enemy.hit(damage);
      pushAway(enemy, origin, 18);
    },
  });
}

export function performRingShot(player, scene, skill) {
  audio.play("powerBulletRing", { position: player.position });
  const count = skill.count ?? 16;
  const color = player.projectileColor ?? 0x00ff00;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, { color, radius: 1.3, duration: 0.2, opacity: 0.7 });
  spawnGroundRing(scene, origin, { color, radius: 2.4, duration: 0.3 });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    firePlayerProjectile(player, scene, direction, skill.damage ?? 1);
    fxSystem(scene, "sparks").emit({
      x: origin.x + direction.x * 0.6,
      y: 0.7,
      z: origin.z + direction.z * 0.6,
      vx: direction.x * 6,
      vy: 0.5,
      vz: direction.z * 6,
      drag: 6,
      life: 0.18,
      size: 0.14,
      sizeEnd: 0.03,
      shapeZ: 2.5,
      rx: 0,
      ry: Math.PI / 2 - angle,
      rz: 0,
      color: 0xffffff,
      colorEnd: color,
      intensity: 2.4,
    });
  }
  shake(scene, 0.12, 0.08);
}

export function performShockwave(player, scene, skill) {
  audio.play("powerShockwave", { position: player.position });
  const range = skill.range ?? 6;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, {
    color: 0x88ddff,
    radius: range,
    duration: 0.45,
    opacity: 0.45,
    dome: true,
  });
  spawnGroundRing(scene, origin, { color: 0xbfefff, radius: range, duration: 0.45 });
  emitBurst(scene, "smoke", 28, (index) => {
    const angle = (index / 28) * Math.PI * 2 + spread(0.1);
    return {
      x: origin.x + Math.cos(angle) * 0.8,
      y: 0.25,
      z: origin.z + Math.sin(angle) * 0.8,
      vx: Math.cos(angle) * range * 2.2,
      vy: between(0.2, 0.8),
      vz: Math.sin(angle) * range * 2.2,
      drag: 3.2,
      life: between(0.6, 0.9),
      size: 0.4,
      sizeEnd: 1.3,
      color: 0xb8a890,
      colorEnd: 0x8a7a68,
      alpha: 0.55,
      fadeOut: 0.7,
    };
  });
  shake(scene, 0.3, 0.3);
  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.45,
    color: 0x88ddff,
    bandWidth: 0.35,
    onWaveHit: (enemy) => {
      enemy.hit(skill.damage ?? 0.5);
      pushAway(enemy, origin, 50);
      fxSystem(scene, "sparks").emit({
        x: enemy.position.x,
        y: 0.8,
        z: enemy.position.z,
        vy: 2,
        life: 0.25,
        size: 0.3,
        sizeEnd: 0.05,
        color: 0xdff8ff,
        intensity: 2,
      });
    },
  });
}

export function performPoisonCloud(player, scene, skill) {
  const range = skill.range ?? 4;
  const duration = skill.duration ?? 6;
  const origin = player.position.clone();
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(range, 40),
    new THREE.MeshBasicMaterial({
      color: 0x2f7a1f,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(origin.x, 0.05, origin.z);
  scene.add(pool);
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(range * 0.94, range, 48),
    new THREE.MeshBasicMaterial({
      color: 0x9bff5a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(origin.x, 0.06, origin.z);
  scene.add(edge);

  let time = 0;
  let tickTimer = 0;
  let puffTimer = 0;
  let bubbleTimer = 0;
  const soundHandle = audio.playHandle("powerPoisonCloud", { position: origin });
  const randomPoint = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * range * 0.9;
    return [origin.x + Math.cos(angle) * distance, origin.z + Math.sin(angle) * distance];
  };

  emitBurst(scene, "smoke", 18, () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: origin.x,
      y: 0.4,
      z: origin.z,
      vx: Math.cos(angle) * range * 1.6,
      vy: between(0.3, 1),
      vz: Math.sin(angle) * range * 1.6,
      drag: 2.6,
      life: between(1, 1.6),
      size: 0.6,
      sizeEnd: 2,
      color: pickColor([0x5fbf3a, 0x3f8f2a, 0x7fd04a]),
      colorEnd: 0x2a5a1a,
      alpha: 0.55,
      fadeOut: 0.8,
    };
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;
      puffTimer -= delta;
      bubbleTimer -= delta;
      const fade = Math.min(1, time / 0.4, (duration - time) / 1.2);
      pool.material.opacity = 0.32 * fade * (0.85 + Math.sin(time * 4) * 0.15);
      edge.material.opacity = 0.7 * fade * (0.6 + Math.sin(time * 6) * 0.4);

      if (puffTimer <= 0 && time < duration - 0.8) {
        puffTimer = 0.07;
        const [x, z] = randomPoint();
        fxSystem(scene, "smoke").emit({
          x,
          y: 0.2,
          z,
          vx: spread(0.3),
          vy: between(0.2, 0.6),
          vz: spread(0.3),
          wobble: 0.6,
          life: between(1.2, 1.8),
          size: 0.4,
          sizeEnd: between(1.4, 2.2),
          color: pickColor([0x5fbf3a, 0x3f8f2a, 0x7fd04a]),
          colorEnd: 0x2a5a1a,
          alpha: 0.42,
          fadeOut: 0.7,
        });
      }
      if (bubbleTimer <= 0 && time < duration - 0.5) {
        bubbleTimer = 0.12;
        const [x, z] = randomPoint();
        fxSystem(scene, "glow").emit({
          x,
          y: 0.1,
          z,
          vy: between(0.4, 0.9),
          life: between(0.5, 0.8),
          size: 0.08,
          sizeEnd: 0.3,
          color: 0x9bff5a,
          intensity: 1.6,
          fadeOut: 0.2,
        });
      }

      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(origin) <= range) {
            enemy.hit(skill.damage ?? 0.6);
            fxSystem(scene, "glow").emit({
              x: enemy.position.x,
              y: 1,
              z: enemy.position.z,
              vy: 1.2,
              life: 0.5,
              size: 0.2,
              sizeEnd: 0.05,
              color: 0x7fff3a,
              intensity: 1.8,
            });
          }
        }
      }
      return time < duration;
    },
    dispose() {
      soundHandle.stop(0.4);
      for (const mesh of [pool, edge]) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  });
}
