import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  emitBurst,
  spread,
  between,
  spawnExpandingSphere,
} from "../powerFx.js";

const BOOMERANG_COLOR = 0xd8ecf5;
const BOOMERANG_EMISSIVE = 0x2f7fa8;

export function performBoomerang(player, scene, skill) {
  const range = skill.range ?? 14;
  const direction = player.lastDirection.clone().setY(0);
  if (direction.lengthSq() === 0) {
    direction.set(1, 0, 0);
  }
  direction.normalize();

  const blade = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({
      color: BOOMERANG_COLOR,
      emissive: BOOMERANG_EMISSIVE,
      emissiveIntensity: 0.9,
      flatShading: true,
      metalness: 0.55,
      roughness: 0.25,
    })
  );
  blade.rotation.x = Math.PI / 2;
  blade.position.copy(player.position).setY(0.7);
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.22, 6, 16),
    new THREE.MeshBasicMaterial({
      color: 0x6fd0ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  blade.add(glow);
  scene.add(blade);

  const hitOutward = new Set();
  const hitReturn = new Set();
  let traveled = 0;
  let returning = false;
  let trailTimer = 0;
  const speed = 17;
  const soundHandle = audio.playHandle("powerBoomerang", {
    position: blade.position,
  });

  scene.addPowerEffect({
    update(delta) {
      blade.rotation.z += delta * 16;
      glow.material.opacity = 0.3 + Math.sin(blade.rotation.z * 0.5) * 0.08;
      soundHandle.setPosition(blade.position);
      const step = speed * delta;
      if (!returning) {
        blade.position.addScaledVector(direction, step);
        traveled += step;
        if (traveled >= range) {
          returning = true;
          spawnExpandingSphere(scene, blade.position, { color: 0x9fe0ff, radius: 1, duration: 0.2, opacity: 0.5, y: 0.7 });
        }
      } else {
        const toPlayer = new THREE.Vector3()
          .subVectors(player.position, blade.position)
          .setY(0);
        const dist = toPlayer.length();
        if (dist <= step + 0.6) {
          return false;
        }
        blade.position.addScaledVector(toPlayer.normalize(), step);
      }
      const hitSet = returning ? hitReturn : hitOutward;
      for (const enemy of scene.enemies) {
        if (enemy.isDying || hitSet.has(enemy)) {
          continue;
        }
        const reach = 1 + enemy.hitboxRadius;
        if (enemy.position.distanceToSquared(blade.position) < reach * reach) {
          hitSet.add(enemy);
          enemy.hit(skill.damage ?? 2);
          emitBurst(scene, "sparks", 6, () => {
            const angle = Math.random() * Math.PI * 2;
            return {
              x: enemy.position.x,
              y: 0.8,
              z: enemy.position.z,
              vx: Math.cos(angle) * 5,
              vy: between(1, 3),
              vz: Math.sin(angle) * 5,
              gravity: 10,
              life: 0.3,
              size: 0.08,
              sizeEnd: 0.02,
              shapeZ: 2.5,
              rx: 0,
              ry: Math.PI / 2 - angle,
              rz: 0,
              color: 0xffffff,
              colorEnd: 0x6fd0ff,
              intensity: 2.4,
            };
          });
        }
      }

      trailTimer += delta;
      while (trailTimer > 0.015) {
        trailTimer -= 0.015;
        const angle = Math.random() * Math.PI * 2;
        fxSystem(scene, "sparks").emit({
          x: blade.position.x + spread(0.3),
          y: blade.position.y + spread(0.15),
          z: blade.position.z + spread(0.3),
          vx: Math.cos(angle) * 1.2,
          vy: between(0.4, 1.2),
          vz: Math.sin(angle) * 1.2,
          gravity: 4,
          life: 0.3,
          size: 0.1,
          sizeEnd: 0.02,
          color: BOOMERANG_COLOR,
          colorEnd: 0x2f7fa8,
          intensity: 1.8,
        });
      }
      return true;
    },
    dispose() {
      soundHandle.stop(0.15);
      scene.remove(blade);
      blade.geometry.dispose();
      blade.material.dispose();
      glow.geometry.dispose();
      glow.material.dispose();
    },
  });
}
