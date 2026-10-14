import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  shake,
  between,
  spawnExplosion,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnLightPillar,
  spawnScorch,
} from "../powerFx.js";
import { spawnRingWave, pushAway, pickColor } from "./helpers.js";

const NOVA_COLOR = 0xffb347;
const NOVA_HOT_COLOR = 0xfff4d6;
const NOVA_PALETTE = [0xfff4d6, 0xffd27a, 0xffb347, 0xff7a3a, 0xffffff];
const DIM_EXPOSURE = 0.35;
const FLASH_EXPOSURE = 4;
const FLASH_DECAY = 0.7;
const PULL_MIN_DISTANCE = 4;

const orbGeometry = new THREE.SphereGeometry(1, 20, 14);

export function getSupernovaExposure(time, chargeTime) {
  if (time < chargeTime) {
    const charge = time / chargeTime;
    return 1 - (1 - DIM_EXPOSURE) * charge * charge;
  }
  const after = time - chargeTime;
  if (after >= FLASH_DECAY) {
    return 1;
  }
  const decay = 1 - after / FLASH_DECAY;
  return 1 + (FLASH_EXPOSURE - 1) * decay * decay;
}

export function performSupernova(player, scene, skill) {
  const range = skill.range ?? 22;
  const chargeTime = skill.chargeTime ?? 3;
  const damage =
    (skill.damage ?? 30) + (player.damage ?? 1) * (skill.playerDamageScale ?? 0);

  const orbMaterial = new THREE.MeshBasicMaterial({
    color: NOVA_HOT_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: NOVA_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  const halo = new THREE.Mesh(orbGeometry, haloMaterial);
  const root = new THREE.Group();
  root.add(orb, halo);
  scene.add(root);

  audio.play("supernovaCharge", { position: player.position });

  let time = 0;
  let particleTimer = 0;
  let released = false;
  const tileManager = scene.tileManager;

  const release = () => {
    released = true;
    root.visible = false;
    const origin = new THREE.Vector3(player.position.x, 0, player.position.z);
    audio.play("supernovaBlast", { position: origin });
    shake(scene, 0.9, 1.2);
    spawnExpandingSphere(scene, origin, {
      color: NOVA_HOT_COLOR,
      radius: range * 0.35,
      duration: 0.35,
      opacity: 1,
      y: 1,
    });
    spawnExpandingSphere(scene, origin, {
      color: NOVA_COLOR,
      radius: range,
      duration: 0.9,
      opacity: 0.55,
      dome: true,
    });
    spawnGroundRing(scene, origin, { color: NOVA_HOT_COLOR, radius: range, duration: 0.8 });
    spawnGroundRing(scene, origin, { color: NOVA_COLOR, radius: range * 0.6, duration: 1.1 });
    spawnLightPillar(scene, origin, {
      color: NOVA_HOT_COLOR,
      radius: 2.5,
      height: 40,
      duration: 0.9,
      opacity: 0.8,
    });
    spawnExplosion(scene, origin, {
      radius: 7,
      color: NOVA_COLOR,
      hotColor: NOVA_HOT_COLOR,
      power: 3,
    });
    spawnScorch(scene, origin, range * 0.35, 0x1a120a, 5);
    spawnRingWave(scene, origin.clone(), {
      maxRadius: range,
      duration: 0.8,
      color: NOVA_HOT_COLOR,
      bandWidth: 0.8,
      onWaveHit: (enemy) => {
        enemy.hit(damage, true);
        pushAway(enemy, origin, 40);
      },
    });
  };

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      scene.screenExposure = getSupernovaExposure(time, chargeTime);

      if (!released) {
        const charge = Math.min(time / chargeTime, 1);
        root.position.set(player.position.x, 1, player.position.z);
        const pulse = 1 + Math.sin(time * (10 + charge * 30)) * 0.08;
        orb.scale.setScalar((0.3 + charge * 1.1) * pulse);
        halo.scale.setScalar((0.8 + charge * 2.4) * pulse);
        orbMaterial.opacity = 0.4 + charge * 0.6;
        haloMaterial.opacity = 0.15 + charge * 0.35;
        shake(scene, 0.1, 0.05 + charge * 0.2);

        particleTimer -= delta;
        while (particleTimer <= 0) {
          particleTimer += 0.012;
          const angle = Math.random() * Math.PI * 2;
          const distance = between(4, 9);
          const startX = player.position.x + Math.cos(angle) * distance;
          const startZ = player.position.z + Math.sin(angle) * distance;
          const life = between(0.35, 0.55);
          fxSystem(scene, "glow").emit({
            x: startX,
            y: between(0.3, 3),
            z: startZ,
            vx: (player.position.x - startX) / life,
            vy: 0,
            vz: (player.position.z - startZ) / life,
            life,
            size: between(0.15, 0.3),
            sizeEnd: 0.05,
            color: pickColor(NOVA_PALETTE),
            intensity: 2.2,
          });
        }

        for (const enemy of scene.enemies) {
          if (enemy.isDying || enemy.isDormant || enemy.isBoss) {
            continue;
          }
          const dx = player.position.x - enemy.position.x;
          const dz = player.position.z - enemy.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance > range || distance < PULL_MIN_DISTANCE) {
            continue;
          }
          const step = 2.5 * charge * delta;
          const nextX = enemy.position.x + (dx / distance) * step;
          const nextZ = enemy.position.z + (dz / distance) * step;
          if (tileManager) {
            tileManager.moveCircle(enemy.position, nextX, nextZ, enemy.hitboxRadius * 0.85);
          } else {
            enemy.position.x = nextX;
            enemy.position.z = nextZ;
          }
        }

        if (charge >= 1) {
          release();
        }
        return true;
      }

      return time < chargeTime + FLASH_DECAY;
    },
    dispose() {
      scene.screenExposure = 1;
      scene.remove(root);
      orbMaterial.dispose();
      haloMaterial.dispose();
    },
  });
}
