import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  shake,
  spread,
  between,
  spawnScorch,
  spawnGroundGlow,
  spawnExplosion,
} from "../powerFx.js";
import { pickColor } from "./helpers.js";

const LASER_COLOR = 0xff2a55;
const LASER_CORE_COLOR = 0xfff0f4;
const LASER_HEIGHT = 40;
const CHARGE_AUDIO_SECONDS = 6;
const TICK_INTERVAL = 0.1;
const SWEEP_SPEED = 9;
const MAX_REACH = 16;
const FALLBACK_REACH = 7;

const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
beamGeometry.translate(0, 0.5, 0);
const impactGeometry = new THREE.CircleGeometry(1, 32);
impactGeometry.rotateX(-Math.PI / 2);
const lockRingGeometry = new THREE.RingGeometry(0.85, 1, 40);
lockRingGeometry.rotateX(-Math.PI / 2);

function additive(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function getLaserAimPoint(player, out) {
  const origin = player.position;
  if (player.aimWorldPoint) {
    out.set(player.aimWorldPoint.x, 0, player.aimWorldPoint.z);
  } else {
    const direction = player.lastDirection ?? new THREE.Vector3(1, 0, 0);
    out.set(
      origin.x + direction.x * FALLBACK_REACH,
      0,
      origin.z + direction.z * FALLBACK_REACH
    );
  }
  const dx = out.x - origin.x;
  const dz = out.z - origin.z;
  const distance = Math.hypot(dx, dz);
  if (distance > MAX_REACH) {
    out.x = origin.x + (dx / distance) * MAX_REACH;
    out.z = origin.z + (dz / distance) * MAX_REACH;
  }
  return out;
}

export function sweepToward(current, target, maxStep) {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= maxStep || distance < 1e-6) {
    current.x = target.x;
    current.z = target.z;
  } else {
    current.x += (dx / distance) * maxStep;
    current.z += (dz / distance) * maxStep;
  }
  return current;
}

export function getChargePlaybackRate(chargeTime) {
  return CHARGE_AUDIO_SECONDS / Math.max(chargeTime, 0.1);
}

export function performOrbitalLaser(player, scene, skill) {
  const duration = skill.duration ?? 4;
  const chargeTime = skill.chargeTime ?? 4;
  const width = skill.width ?? 1.4;
  const radius = width / 2;
  const dps =
    (skill.damage ?? 12) + (player.damage ?? 1) * (skill.playerDamageScale ?? 0);

  const aim = new THREE.Vector3();
  const position = getLaserAimPoint(player, new THREE.Vector3());

  const root = new THREE.Group();
  root.position.copy(position);
  const outerMaterial = additive(LASER_COLOR, 0);
  const coreMaterial = additive(LASER_CORE_COLOR, 0);
  const impactMaterial = additive(LASER_COLOR, 0);
  const guideMaterial = additive(LASER_COLOR, 0.6);
  const outer = new THREE.Mesh(beamGeometry, outerMaterial);
  const core = new THREE.Mesh(beamGeometry, coreMaterial);
  const impact = new THREE.Mesh(impactGeometry, impactMaterial);
  const guide = new THREE.Mesh(beamGeometry, guideMaterial);
  impact.position.y = 0.06;
  guide.scale.set(0.05, LASER_HEIGHT, 0.05);
  outer.visible = false;
  core.visible = false;
  root.add(outer, core, impact, guide);
  scene.add(root);

  const lockRingMaterial = additive(LASER_COLOR, 0.9);
  const lockRing = new THREE.Mesh(lockRingGeometry, lockRingMaterial);
  lockRing.position.y = 0.07;
  root.add(lockRing);
  audio.play("orbitalLaserCharge", {
    playbackRate: getChargePlaybackRate(chargeTime),
  });

  let time = 0;
  let tickTimer = 0;
  let trailTimer = 0;
  let fxTimer = 0;
  let firing = false;
  let loopHandle = null;

  const beginFiring = () => {
    firing = true;
    outer.visible = true;
    core.visible = true;
    guide.visible = false;
    lockRing.visible = false;
    audio.play("orbitalLaserFire", { position: root.position });
    loopHandle = audio.playHandle("orbitalLaserLoop", { fadeInSeconds: 0.1 });
    spawnExplosion(scene, root.position, {
      radius: radius * 3,
      color: LASER_COLOR,
      hotColor: LASER_CORE_COLOR,
      power: 0.7,
    });
    shake(scene, 0.35, 0.45);
  };

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      getLaserAimPoint(player, aim);
      sweepToward(root.position, aim, SWEEP_SPEED * delta);

      if (!firing) {
        const charge = Math.min(time / chargeTime, 1);
        const eased = 1 - Math.pow(1 - charge, 2.5);
        lockRing.scale.setScalar(radius * 3 + (0.3 - radius * 3) * eased);
        lockRing.rotation.y += delta * (1 + charge * 6);
        lockRingMaterial.opacity = 0.5 + 0.4 * charge;
        guideMaterial.opacity =
          0.3 + 0.5 * Math.abs(Math.sin(time * (6 + charge * charge * 40)));
        impact.scale.setScalar(radius * (0.4 + charge));
        impactMaterial.opacity = 0.2 + 0.4 * charge;
        if (charge >= 1) {
          beginFiring();
        }
        return true;
      }

      const fireTime = time - chargeTime;
      const fade = Math.min(fireTime / 0.12, 1, (duration - fireTime) / 0.3);
      const flicker = 0.9 + Math.random() * 0.2;
      outer.scale.set(radius * flicker, LASER_HEIGHT, radius * flicker);
      core.scale.set(radius * 0.35 * flicker, LASER_HEIGHT, radius * 0.35 * flicker);
      outerMaterial.opacity = 0.55 * Math.max(fade, 0);
      coreMaterial.opacity = 0.95 * Math.max(fade, 0);
      impact.scale.setScalar(radius * (1.6 + Math.sin(time * 25) * 0.15));
      impactMaterial.opacity = 0.7 * Math.max(fade, 0);

      const origin = root.position;
      trailTimer -= delta;
      if (trailTimer <= 0) {
        trailTimer = 0.06;
        spawnScorch(scene, origin, radius * 1.2, 0x1a0a0c, 3);
        spawnGroundGlow(scene, origin, radius * 1.1, LASER_COLOR, 0.9, 1.8);
      }

      fxTimer -= delta;
      if (fxTimer <= 0) {
        fxTimer = 0.03;
        const sparks = fxSystem(scene, "sparks");
        for (let index = 0; index < 3; index++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = between(4, 9);
          sparks.emit({
            x: origin.x,
            y: 0.3,
            z: origin.z,
            vx: Math.cos(angle) * speed,
            vy: between(3, 7),
            vz: Math.sin(angle) * speed,
            gravity: 16,
            drag: 1,
            life: between(0.25, 0.5),
            size: between(0.06, 0.1),
            sizeEnd: 0.02,
            shapeZ: 3,
            rx: 0,
            ry: Math.PI / 2 - angle,
            rz: 0,
            color: LASER_CORE_COLOR,
            colorEnd: LASER_COLOR,
            intensity: 2.6,
          });
        }
        fxSystem(scene, "smoke").emit({
          x: origin.x + spread(radius),
          y: 0.3,
          z: origin.z + spread(radius),
          vy: between(1.5, 3),
          life: between(0.8, 1.2),
          size: 0.4,
          sizeEnd: 1.4,
          color: 0x3a2a2c,
          colorEnd: 0x161214,
          alpha: 0.55,
          fadeOut: 0.8,
        });
        fxSystem(scene, "glow").emit({
          x: origin.x + spread(radius * 0.5),
          y: between(0.5, 4),
          z: origin.z + spread(radius * 0.5),
          vy: between(2, 6),
          life: 0.3,
          size: 0.3,
          sizeEnd: 0.05,
          color: pickColor([LASER_CORE_COLOR, LASER_COLOR, 0xff8aa0]),
          intensity: 2.2,
        });
      }

      tickTimer -= delta;
      if (tickTimer <= 0) {
        tickTimer = TICK_INTERVAL;
        shake(scene, 0.12, 0.08);
        for (const enemy of scene.enemies) {
          if (enemy.isDying || enemy.isDormant) {
            continue;
          }
          const reach = radius + enemy.hitboxRadius;
          const dx = enemy.position.x - origin.x;
          const dz = enemy.position.z - origin.z;
          if (dx * dx + dz * dz > reach * reach) {
            continue;
          }
          enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, 0.25);
          enemy.hit(dps * TICK_INTERVAL);
        }
      }

      return fireTime < duration;
    },
    dispose() {
      loopHandle?.stop(0.25);
      if (firing) {
        audio.play("orbitalLaserEnd", { position: root.position });
      }
      scene.remove(root);
      for (const material of [
        outerMaterial,
        coreMaterial,
        impactMaterial,
        guideMaterial,
        lockRingMaterial,
      ]) {
        material.dispose();
      }
    },
  });
}
