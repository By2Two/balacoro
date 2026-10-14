import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import { Projectile } from "../../objects/Projectile.js";
import { PROJECTILE_SPEED_BASE } from "../../constants.js";
import {
  emitBurst,
  shake,
  spread,
  between,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnScorch,
} from "../powerFx.js";

export function solveInterceptTime(toTargetX, toTargetZ, velX, velZ, projectileSpeed) {
  const a = velX * velX + velZ * velZ - projectileSpeed * projectileSpeed;
  const b = 2 * (toTargetX * velX + toTargetZ * velZ);
  const c = toTargetX * toTargetX + toTargetZ * toTargetZ;

  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) < 1e-6) {
      return null;
    }
    const t = -c / b;
    return t > 0 ? t : null;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const validTimes = [t1, t2].filter((t) => t > 0);
  return validTimes.length > 0 ? Math.min(...validTimes) : null;
}

export function calculateLeadDirection(
  shooterPos,
  targetPos,
  targetVelocity,
  projectileSpeed
) {
  const toTargetX = targetPos.x - shooterPos.x;
  const toTargetZ = targetPos.z - shooterPos.z;
  const interceptTime = solveInterceptTime(
    toTargetX,
    toTargetZ,
    targetVelocity.x,
    targetVelocity.z,
    projectileSpeed
  );
  const leadTime = interceptTime != null ? Math.min(interceptTime, 1.5) : 0;
  const direction = new THREE.Vector3(
    toTargetX + targetVelocity.x * leadTime,
    0,
    toTargetZ + targetVelocity.z * leadTime
  );
  if (direction.lengthSq() < 0.0001) {
    direction.set(toTargetX, 0, toTargetZ);
  }
  return direction.normalize();
}


export function flatRingMesh(color) {
  return new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.3, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}

export function spawnRingWave(scene, origin, options) {
  const {
    maxRadius,
    duration = 0.7,
    color,
    bandWidth = 0.45,
    onWaveHit = null,
  } = options;
  const mesh = flatRingMesh(color);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(origin.x, 0.05, origin.z);
  scene.add(mesh);
  const hitEnemies = new Set();
  let time = 0;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = 0.2 + eased * maxRadius;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.RingGeometry(
        Math.max(radius - bandWidth, 0.05),
        radius,
        48
      );
      mesh.material.opacity = 0.85 * (1 - t * t);
      if (onWaveHit) {
        for (const enemy of scene.enemies) {
          if (hitEnemies.has(enemy) || enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(origin) <= radius) {
            hitEnemies.add(enemy);
            onWaveHit(enemy);
          }
        }
      }
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

export function spawnFlash(scene, origin, color, maxScale = 2.5, duration = 0.25) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(origin.x, 0.04, origin.z);
  mesh.scale.setScalar(0.1);
  scene.add(mesh);
  let time = 0;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      mesh.scale.setScalar(0.1 + t * maxScale);
      mesh.material.opacity = 0.5 * (1 - t);
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

export function firePlayerProjectile(player, scene, direction, damage) {
  const projectile = new Projectile(
    player.position.clone(),
    direction,
    player.speed + PROJECTILE_SPEED_BASE,
    undefined,
    damage,
    player.projectGlowing,
    1,
    player.projectileColor,
    false,
    player.shotShape
  );
  scene.add(projectile);
  scene.projectiles?.push(projectile);
}

export function pushAway(enemy, origin, force) {
  const push = new THREE.Vector3().subVectors(enemy.position, origin).setY(0);
  if (push.lengthSq() > 0.0001) {
    enemy.applyKnockback?.(push.normalize(), force);
  }
}

export function playDelayed(scene, name, delay, options) {
  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      if (time >= delay) {
        audio.play(name, options);
        return false;
      }
      return true;
    },
  });
}

export function spawnFrostNova(scene, origin, radius) {
  audio.play("frostShatter");
  spawnExpandingSphere(scene, origin, {
    color: 0x7fe8ff,
    radius: radius * 0.9,
    duration: 0.4,
    opacity: 0.55,
    y: 0.5,
  });
  spawnGroundRing(scene, origin, { color: 0x9ff4ff, radius, duration: 0.45 });
  spawnScorch(scene, origin, radius * 0.9, 0xcff4ff, 1.8);
  emitBurst(scene, "shards", 22 + Math.round(radius * 4), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(radius * 1.2, radius * 2.4);
    return {
      x: origin.x,
      y: 0.4,
      z: origin.z,
      vx: Math.cos(angle) * speed,
      vy: between(1.5, 4),
      vz: Math.sin(angle) * speed,
      gravity: 12,
      drag: 1.5,
      life: between(0.45, 0.75),
      size: between(0.14, 0.3),
      sizeEnd: 0.05,
      shapeY: 2.2,
      color: pickColor([0xffffff, 0xcff4ff, 0x8fe3ff]),
      spinX: spread(8),
      spinZ: spread(8),
      fadeOut: 0.4,
    };
  });
  emitBurst(scene, "smoke", 12, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = between(0.3, radius * 0.8);
    return {
      x: origin.x + Math.cos(angle) * distance,
      y: 0.3,
      z: origin.z + Math.sin(angle) * distance,
      vx: Math.cos(angle) * 1.2,
      vy: between(0.3, 0.8),
      vz: Math.sin(angle) * 1.2,
      drag: 2,
      life: between(0.9, 1.4),
      size: 0.5,
      sizeEnd: 1.6,
      color: 0xe8f8ff,
      colorEnd: 0xbfe9ff,
      alpha: 0.5,
      fadeOut: 0.8,
    };
  });
  shake(scene, 0.2, 0.15);
}

export function pickColor(list) {
  return list[Math.floor(Math.random() * list.length)];
}
