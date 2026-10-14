import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  emitBurst,
  shake,
  spread,
  between,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnGroundGlow,
  spawnScorch,
} from "../powerFx.js";

const boltSegmentGeometry = new THREE.BoxGeometry(1, 1, 1);

function buildBolt(scene, from, to, thickness) {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4db8ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const addPath = (start, end, segments, jag, width) => {
    const points = [start.clone()];
    for (let i = 1; i < segments; i++) {
      const point = start.clone().lerp(end, i / segments);
      point.x += spread(jag);
      point.z += spread(jag);
      points.push(point);
    }
    points.push(end.clone());
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = a.distanceTo(b);
      for (const [material, scale] of [
        [coreMaterial, 1],
        [glowMaterial, 3.2],
      ]) {
        const segment = new THREE.Mesh(boltSegmentGeometry, material);
        segment.position.copy(a).lerp(b, 0.5);
        segment.lookAt(b);
        segment.scale.set(width * scale, width * scale, length);
        group.add(segment);
      }
    }
    return points;
  };
  const points = addPath(from, to, 8, 0.9, thickness);
  for (let branch = 0; branch < 2; branch++) {
    const start = points[2 + branch * 2];
    const end = start
      .clone()
      .add(new THREE.Vector3(spread(3), -between(2, 4), spread(3)));
    addPath(start, end, 3, 0.5, thickness * 0.6);
  }
  scene.add(group);
  return { group, materials: [coreMaterial, glowMaterial] };
}

export function performLightningStrike(player, scene, skill) {
  const range = skill.range ?? 18;
  const targets = scene.enemies
    .filter(
      (enemy) =>
        !enemy.isDying && enemy.position.distanceTo(player.position) <= range
    )
    .sort(
      (a, b) =>
        a.position.distanceToSquared(player.position) -
        b.position.distanceToSquared(player.position)
    )
    .slice(0, skill.count ?? 6);

  const strikes = targets.map((enemy, index) => ({ enemy, delay: index * 0.06, bolt: null, age: 0 }));
  let time = 0;
  let shook = false;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      let alive = false;
      for (const strike of strikes) {
        if (!strike.bolt && time >= strike.delay) {
          const enemy = strike.enemy;
          const impact = enemy.position.clone();
          if (!enemy.isDying) {
            enemy.hit(skill.damage ?? 3);
          }
          audio.play("powerThunderstrike", { position: impact });
          strike.bolt = buildBolt(
            scene,
            new THREE.Vector3(impact.x + spread(2), 18, impact.z + spread(2)),
            new THREE.Vector3(impact.x, 0.4, impact.z),
            0.12
          );
          spawnExpandingSphere(scene, impact, { color: 0xbfe6ff, radius: 1.6, duration: 0.2, opacity: 0.9, y: 0.6 });
          spawnGroundRing(scene, impact, { color: 0x4db8ff, radius: 2, duration: 0.3 });
          spawnGroundGlow(scene, impact, 1.2, 0x4db8ff, 0.4, 2.2);
          spawnScorch(scene, impact, 0.8, 0x14161c, 1.8);
          emitBurst(scene, "sparks", 12, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = between(4, 9);
            return {
              x: impact.x,
              y: 0.4,
              z: impact.z,
              vx: Math.cos(angle) * speed,
              vy: between(2, 6),
              vz: Math.sin(angle) * speed,
              gravity: 14,
              life: between(0.25, 0.45),
              size: 0.08,
              sizeEnd: 0.02,
              shapeZ: 3,
              rx: 0,
              ry: Math.PI / 2 - angle,
              rz: 0,
              color: 0xffffff,
              colorEnd: 0x4db8ff,
              intensity: 2.6,
            };
          });
          if (!shook) {
            shook = true;
            shake(scene, 0.2, 0.2);
          }
        }
        if (strike.bolt) {
          strike.age += delta;
          const t = Math.min(strike.age / 0.32, 1);
          const flicker = Math.random() < 0.3 ? 0.35 : 1;
          strike.bolt.materials[0].opacity = (1 - t) * flicker;
          strike.bolt.materials[1].opacity = 0.6 * (1 - t) * flicker;
          if (t >= 1 && !strike.disposed) {
            strike.disposed = true;
            scene.remove(strike.bolt.group);
            strike.bolt.materials.forEach((material) => material.dispose());
          }
        }
        if (!strike.disposed) {
          alive = true;
        }
      }
      return alive;
    },
    dispose() {
      for (const strike of strikes) {
        if (strike.bolt && !strike.disposed) {
          scene.remove(strike.bolt.group);
          strike.bolt.materials.forEach((material) => material.dispose());
        }
      }
    },
  });
}
