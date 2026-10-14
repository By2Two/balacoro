import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import { Projectile } from "../../objects/Projectile.js";
import { PROJECTILE_SPEED_BASE } from "../../constants.js";
import {
  fxSystem,
  emitBurst,
  shake,
  spread,
  between,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnScorch,
} from "../powerFx.js";
import {
  calculateLeadDirection,
  playDelayed,
} from "./helpers.js";

const SENTRY_ARRIVE_DURATION = 1.3;
const SENTRY_DEPART_DURATION = 0.9;
const SENTRY_DROP_HEIGHT = 13;
const SENTRY_BEAM_COLOR = 0x33e0ff;
const SENTRY_BEAM_HEIGHT = SENTRY_DROP_HEIGHT + 3;
const SENTRY_SETTLE_DURATION = 0.18;
const SENTRY_UNFOLD_DURATION = 0.4;
const SENTRY_RANGE = 25;
const tracerGeometry = new THREE.BoxGeometry(1, 1, 1);

function createSentryBeam(scene, position) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.6, SENTRY_BEAM_HEIGHT, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: SENTRY_BEAM_COLOR,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.position.set(position.x, SENTRY_BEAM_HEIGHT / 2, position.z);
  scene.add(beam);
  return beam;
}

function disposeSentryBeam(scene, beam) {
  if (!beam) {
    return;
  }
  scene.remove(beam);
  beam.geometry.dispose();
  beam.material.dispose();
}

function spawnMuzzleFlash(scene, position, direction) {
  spawnExpandingSphere(scene, position, {
    color: 0xffc36a,
    radius: 0.45,
    duration: 0.08,
    opacity: 1,
    startScale: 0.1,
    y: position.y,
  });
  emitBurst(scene, "sparks", 5, () => {
    const spreadAngle = spread(0.5);
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const vx = (direction.x * cos - direction.z * sin) * between(5, 9);
    const vz = (direction.x * sin + direction.z * cos) * between(5, 9);
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      vx,
      vy: between(0, 1.5),
      vz,
      gravity: 6,
      drag: 3,
      life: 0.15,
      size: 0.07,
      sizeEnd: 0.02,
      shapeZ: 2.5,
      rx: 0,
      ry: Math.atan2(vx, vz),
      rz: 0,
      color: 0xfff1a8,
      colorEnd: 0xff8a26,
      intensity: 2.6,
    };
  });
}

function spawnTracer(scene, from, to) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x9ff4ff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(tracerGeometry, material);
  const length = from.distanceTo(to);
  mesh.position.copy(from).lerp(to, 0.5);
  mesh.lookAt(to);
  mesh.scale.set(0.05, 0.05, length);
  scene.add(mesh);
  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      material.opacity = 0.8 * (1 - time / 0.09);
      return time < 0.09;
    },
    dispose() {
      scene.remove(mesh);
      material.dispose();
    },
  });
}

function spawnShellCasing(scene, position, direction) {
  fxSystem(scene, "debris").emit({
    x: position.x,
    y: position.y,
    z: position.z,
    vx: -direction.z * between(1.5, 2.5) + spread(0.4),
    vy: between(2.5, 3.5),
    vz: direction.x * between(1.5, 2.5) + spread(0.4),
    gravity: 14,
    life: 0.7,
    size: 0.06,
    shapeY: 2.2,
    color: 0xd9a441,
    spinX: spread(14),
    spinZ: spread(14),
    fadeOut: 0.3,
  });
}

function buildSentryModel() {
  const group = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x2f333a,
    flatShading: true,
    metalness: 0.5,
    roughness: 0.55,
  });
  const midMetal = new THREE.MeshStandardMaterial({
    color: 0x767e87,
    flatShading: true,
    metalness: 0.45,
    roughness: 0.45,
  });
  const lightMetal = new THREE.MeshStandardMaterial({
    color: 0xc7ccd1,
    flatShading: true,
    metalness: 0.4,
    roughness: 0.4,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x33e0ff,
    emissive: 0x33e0ff,
    emissiveIntensity: 1.8,
    flatShading: true,
  });
  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x50565e,
    flatShading: true,
    metalness: 0.55,
    roughness: 0.4,
  });

  const treadBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.78), darkMetal);
  treadBase.position.y = 0.14;
  const treadTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.62), midMetal);
  treadTop.position.y = 0.3;
  const treadStripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.5), lightMetal);
  treadStripe.position.y = 0.37;
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), darkMetal);
  antenna.position.set(-0.32, 0.65, -0.2);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMaterial);
  antennaTip.position.set(-0.32, 0.97, -0.2);
  group.add(treadBase, treadTop, treadStripe, antenna, antennaTip);

  const head = new THREE.Group();
  head.position.y = 0.6;

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), midMetal);
  const chassisStripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.3), lightMetal);
  chassisStripe.position.y = 0.08;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.06), eyeMaterial);
  eye.position.set(0, -0.02, 0.28);

  const barrelMount = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.075, 0.55, 8),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.5);
  const barrelTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8),
    darkMetal
  );
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0, 0.76);
  barrelMount.add(barrel, barrelTip);

  head.add(chassis, chassisStripe, eye, barrelMount);
  group.add(head);

  return {
    group,
    head,
    eye,
    eyeMaterial,
    barrelMount,
    antennaTip,
    barrelLocalTip: new THREE.Vector3(0, 0, 0.82),
    parts: [
      treadBase,
      treadTop,
      treadStripe,
      antenna,
      antennaTip,
      chassis,
      chassisStripe,
      eye,
      barrel,
      barrelTip,
    ],
  };
}

function disposeSentryModel(scene, group, parts) {
  scene.remove(group);
  const materials = new Set();
  for (const part of parts) {
    part.geometry.dispose();
    materials.add(part.material);
  }
  for (const material of materials) {
    material.dispose();
  }
}

export function performTurret(player, scene, skill) {
  const duration = skill.duration ?? 8;
  const model = buildSentryModel();
  const { group, head, barrelMount, barrelLocalTip, eyeMaterial, parts } = model;
  const home = player.position.clone();
  group.position.copy(home);
  group.position.y = SENTRY_DROP_HEIGHT;
  head.position.y = 0.3;
  head.scale.setScalar(0.6);
  barrelMount.scale.z = 0.05;
  scene.add(group);

  let beam = createSentryBeam(scene, home);
  audio.play("powerSentryDeploy", { position: home });

  const timerMaterial = new THREE.MeshBasicMaterial({
    color: SENTRY_BEAM_COLOR,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const timerRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.1, 40), timerMaterial);
  timerRing.rotation.x = -Math.PI / 2;
  timerRing.position.set(home.x, 0.06, home.z);
  scene.add(timerRing);
  let timerFraction = 1;

  let phase = "arrive";
  let phaseTime = 0;
  let activeTime = 0;
  let settleTime = 0;
  let fireTimer = 0.2;
  let recoil = 0;
  let headYaw = 0;
  let targetYaw = 0;
  let trailTimer = 0;
  let scanTimer = 0.6;
  let idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;
  const tipWorld = new THREE.Vector3();
  const headWorld = new THREE.Vector3();

  const rebuildTimerRing = (fraction) => {
    timerRing.geometry.dispose();
    timerRing.geometry = new THREE.RingGeometry(
      0.95,
      1.1,
      40,
      1,
      Math.PI / 2,
      Math.max(fraction, 0.001) * Math.PI * 2
    );
  };

  scene.addPowerEffect({
    update(delta) {
      if (phase === "arrive") {
        phaseTime += delta;
        const t = Math.min(phaseTime / SENTRY_ARRIVE_DURATION, 1);
        const eased = 1 - (1 - t) * (1 - t);
        group.position.y = SENTRY_DROP_HEIGHT * (1 - eased);
        group.rotation.y += delta * 5;
        beam.rotation.y += delta * 2.5;
        trailTimer += delta;
        while (trailTimer > 0.025) {
          trailTimer -= 0.025;
          fxSystem(scene, "glow").emit({
            x: home.x + spread(0.3),
            y: group.position.y,
            z: home.z + spread(0.3),
            vy: between(2, 4),
            life: 0.3,
            size: between(0.25, 0.4),
            sizeEnd: 0.05,
            color: 0x9ff4ff,
            colorEnd: SENTRY_BEAM_COLOR,
            intensity: 2,
          });
        }
        if (t >= 1) {
          group.position.y = 0;
          group.rotation.y = 0;
          disposeSentryBeam(scene, beam);
          beam = null;
          spawnExpandingSphere(scene, home, { color: SENTRY_BEAM_COLOR, radius: 1.8, duration: 0.3, opacity: 0.7, y: 0.4 });
          spawnGroundRing(scene, home, { color: SENTRY_BEAM_COLOR, radius: 2.4, duration: 0.4 });
          spawnScorch(scene, home, 1, 0x1c2228, 3);
          emitBurst(scene, "smoke", 14, (index) => {
            const angle = (index / 14) * Math.PI * 2;
            return {
              x: home.x + Math.cos(angle) * 0.5,
              y: 0.2,
              z: home.z + Math.sin(angle) * 0.5,
              vx: Math.cos(angle) * 4,
              vy: between(0.2, 0.8),
              vz: Math.sin(angle) * 4,
              drag: 3.5,
              life: between(0.6, 0.9),
              size: 0.35,
              sizeEnd: 1,
              color: 0x9a9088,
              colorEnd: 0x6a625c,
              alpha: 0.55,
              fadeOut: 0.7,
            };
          });
          shake(scene, 0.2, 0.2);
          audio.play("sentryLand", { position: home });
          audio.play("sentryArm", { position: home });
          phase = "unfold";
          phaseTime = 0;
          settleTime = 0;
        }
        return true;
      }

      if (phase === "unfold") {
        phaseTime += delta;
        settleTime = Math.min(settleTime + delta, SENTRY_SETTLE_DURATION);
        const squash = 1 - Math.sin((settleTime / SENTRY_SETTLE_DURATION) * Math.PI) * 0.22;
        group.scale.set(1 / squash, squash, 1 / squash);
        const t = Math.min(phaseTime / SENTRY_UNFOLD_DURATION, 1);
        const overshoot = 1 + Math.sin(t * Math.PI) * 0.15;
        head.position.y = 0.3 + 0.3 * t * overshoot;
        head.scale.setScalar(0.6 + 0.4 * t);
        barrelMount.scale.z = Math.max(t * overshoot, 0.05);
        timerMaterial.opacity = 0.6 * t;
        if (t >= 1) {
          head.position.y = 0.6;
          head.scale.setScalar(1);
          barrelMount.scale.z = 1;
          group.scale.set(1, 1, 1);
          phase = "active";
          phaseTime = 0;
        }
        return true;
      }

      if (phase === "active") {
        activeTime += delta;
        fireTimer -= delta;
        idleTimer -= delta;
        recoil = Math.max(recoil - delta * 6, 0);
        barrelMount.position.z = -0.14 * recoil;
        head.position.y = 0.6 - 0.03 * recoil;

        const nextFraction = 1 - activeTime / duration;
        if (Math.abs(nextFraction - timerFraction) > 0.02) {
          timerFraction = nextFraction;
          rebuildTimerRing(timerFraction);
        }
        eyeMaterial.emissiveIntensity = 1.4 + Math.sin(activeTime * 6) * 0.5;

        if (idleTimer <= 0) {
          idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;
          audio.play("powerSentryIdle", { position: group.position });
        }

        let nearest = null;
        let nearestDistSq = SENTRY_RANGE * SENTRY_RANGE;
        for (const enemy of scene.enemies) {
          if (enemy.isDying || enemy.isDormant) {
            continue;
          }
          const distSq = enemy.position.distanceToSquared(group.position);
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = enemy;
          }
        }

        if (nearest) {
          targetYaw = Math.atan2(
            nearest.position.x - group.position.x,
            nearest.position.z - group.position.z
          );
        } else {
          targetYaw = Math.sin(activeTime * 1.2) * 1.2;
          scanTimer -= delta;
          if (scanTimer <= 0) {
            scanTimer = 1.6;
            audio.play("sentryScan", { position: group.position });
          }
        }
        let yawDelta = targetYaw - headYaw;
        yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
        headYaw += yawDelta * Math.min(delta * (nearest ? 14 : 3), 1);
        head.rotation.y = headYaw;

        if (nearest && fireTimer <= 0) {
          fireTimer = 0.5;
          const projectileSpeed = PROJECTILE_SPEED_BASE + 6;
          const direction = calculateLeadDirection(
            group.position,
            nearest.position,
            nearest.velocity ?? new THREE.Vector3(),
            projectileSpeed
          );
          headYaw = Math.atan2(direction.x, direction.z);
          head.rotation.y = headYaw;
          head.updateMatrixWorld(true);
          const projectile = new Projectile(
            group.position.clone(),
            direction,
            projectileSpeed,
            undefined,
            skill.damage ?? 1,
            false,
            1,
            player.projectileColor,
            false,
            player.shotShape
          );
          scene.add(projectile);
          scene.projectiles?.push(projectile);
          audio.play("powerSentryFire", { position: group.position });
          head.localToWorld(tipWorld.copy(barrelLocalTip));
          spawnMuzzleFlash(scene, tipWorld, direction);
          spawnTracer(
            scene,
            tipWorld,
            headWorld.set(nearest.position.x, tipWorld.y, nearest.position.z)
          );
          spawnShellCasing(scene, head.getWorldPosition(headWorld), direction);
          playDelayed(scene, "shellCasing", 0.35, { position: group.position.clone() });
          recoil = 1;
        }

        if (activeTime >= duration) {
          phase = "depart";
          phaseTime = 0;
          barrelMount.position.z = 0;
          beam = createSentryBeam(scene, group.position);
          spawnExpandingSphere(scene, group.position, { color: SENTRY_BEAM_COLOR, radius: 1.8, duration: 0.3, opacity: 0.7, y: 0.4 });
          spawnGroundRing(scene, group.position, { color: SENTRY_BEAM_COLOR, radius: 2.2, duration: 0.4 });
          audio.play("powerSentryUndeploy", { position: group.position });
        }
        return true;
      }

      phaseTime += delta;
      const t = Math.min(phaseTime / SENTRY_DEPART_DURATION, 1);
      const eased = t * t;
      group.position.y = SENTRY_DROP_HEIGHT * eased;
      group.scale.setScalar(Math.max(1 - eased * 0.5, 0.4));
      group.rotation.y += delta * 5;
      timerMaterial.opacity = 0.6 * (1 - t);
      if (beam) {
        beam.rotation.y += delta * 2.5;
      }
      trailTimer += delta;
      while (trailTimer > 0.03) {
        trailTimer -= 0.03;
        fxSystem(scene, "glow").emit({
          x: home.x + spread(0.4),
          y: group.position.y,
          z: home.z + spread(0.4),
          vy: -1,
          life: 0.35,
          size: 0.3,
          sizeEnd: 0.05,
          color: 0x9ff4ff,
          colorEnd: SENTRY_BEAM_COLOR,
          intensity: 2,
        });
      }
      return t < 1;
    },
    dispose() {
      disposeSentryBeam(scene, beam);
      disposeSentryModel(scene, group, parts);
      scene.remove(timerRing);
      timerRing.geometry.dispose();
      timerMaterial.dispose();
    },
  });
}
