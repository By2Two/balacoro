import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import {
  fxSystem,
  spread,
  between,
  spawnExplosion,
} from "../powerFx.js";
import {
  spawnRingWave,
  pushAway,
} from "./helpers.js";

const METEOR_FALL_DURATION = 4;
const METEOR_LAUNCH_INTERVAL = 0.35;
const METEOR_START_OFFSET = new THREE.Vector3(-14, 42, -10);
const METEOR_IMPACT_HEIGHT = 0.4;
const meteorRockGeometry = new THREE.DodecahedronGeometry(0.6, 0);
const meteorGlowGeometry = new THREE.SphereGeometry(0.95, 12, 10);
const warningGeometry = new THREE.RingGeometry(0.85, 1, 40);
warningGeometry.rotateX(-Math.PI / 2);

export function performMeteor(player, scene, skill) {
  const range = skill.range ?? 10;
  const meteors = [];
  for (let i = 0; i < (skill.count ?? 5); i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * (range - 2);
    const target = new THREE.Vector3(
      player.position.x + Math.cos(angle) * dist,
      0,
      player.position.z + Math.sin(angle) * dist
    );
    const start = target
      .clone()
      .add(METEOR_START_OFFSET)
      .add(new THREE.Vector3(spread(3), spread(4), spread(3)));
    const impact = new THREE.Vector3(target.x, METEOR_IMPACT_HEIGHT, target.z);
    const rock = new THREE.Mesh(
      meteorRockGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x2a1a14,
        emissive: 0xff4a10,
        emissiveIntensity: 1.4,
        flatShading: true,
      })
    );
    const glow = new THREE.Mesh(
      meteorGlowGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xff7a26,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    rock.add(glow);
    rock.position.copy(start);
    rock.visible = false;
    scene.add(rock);

    const warning = new THREE.Mesh(
      warningGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xff3a1a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    warning.position.set(target.x, 0.07, target.z);
    warning.scale.setScalar(3);
    warning.visible = false;
    scene.add(warning);

    meteors.push({
      rock,
      glow,
      warning,
      target,
      start,
      impact,
      launchAt: i * METEOR_LAUNCH_INTERVAL,
      launched: false,
      done: false,
      trailTimer: 0,
    });
  }

  const removeMeteor = (entry) => {
    scene.remove(entry.rock);
    scene.remove(entry.warning);
    entry.rock.material.dispose();
    entry.glow.material.dispose();
    entry.warning.material.dispose();
  };

  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      let alive = false;
      for (const entry of meteors) {
        if (entry.done) {
          continue;
        }
        alive = true;
        if (time < entry.launchAt) {
          continue;
        }
        if (!entry.launched) {
          entry.launched = true;
          entry.rock.visible = true;
          entry.warning.visible = true;
          audio.play("meteorFall", {
            position: entry.target,
            alignAt: {
              fileTime: METEOR_FALL_DURATION,
              secondsFromNow: METEOR_FALL_DURATION - (time - entry.launchAt),
            },
          });
        }

        const progress = Math.min((time - entry.launchAt) / METEOR_FALL_DURATION, 1);
        entry.rock.position.lerpVectors(entry.start, entry.impact, progress * progress);
        entry.rock.rotation.x += delta * (2 + progress * 6);
        entry.rock.rotation.z += delta * (1.5 + progress * 4);
        entry.warning.material.opacity =
          (0.2 + progress * 0.65) * (0.7 + Math.sin(progress * progress * 60) * 0.3);
        entry.warning.scale.setScalar(3 - progress * 0.6);
        entry.glow.scale.setScalar(1 + Math.sin(entry.rock.rotation.x * 3) * 0.12);

        entry.trailTimer += delta;
        while (entry.trailTimer > 0.02) {
          entry.trailTimer -= 0.02;
          const position = entry.rock.position;
          fxSystem(scene, "glow").emit({
            x: position.x + spread(0.3),
            y: position.y + spread(0.3),
            z: position.z + spread(0.3),
            vx: spread(0.5),
            vy: spread(0.5),
            vz: spread(0.5),
            life: between(0.25, 0.4),
            size: between(0.4, 0.7),
            sizeEnd: 0.1,
            color: 0xffd27a,
            colorEnd: 0xff3a00,
            intensity: 2,
          });
          fxSystem(scene, "smoke").emit({
            x: position.x,
            y: position.y,
            z: position.z,
            vy: 0.5,
            life: between(0.6, 0.9),
            size: 0.4,
            sizeEnd: 1.1,
            color: 0x4a3a34,
            colorEnd: 0x2a2424,
            alpha: 0.6,
            fadeOut: 0.8,
          });
        }

        if (progress >= 1) {
          entry.done = true;
          removeMeteor(entry);
          spawnExplosion(scene, entry.target, { radius: 3, color: 0xff5a1f, power: 1.1 });
          spawnRingWave(scene, entry.target, {
            maxRadius: 3,
            duration: 0.3,
            color: 0xff5533,
            bandWidth: 0.25,
            onWaveHit: (enemy) => {
              enemy.hit(skill.damage ?? 4);
              pushAway(enemy, entry.target, 12);
            },
          });
        }
      }
      return alive;
    },
    dispose() {
      for (const entry of meteors) {
        if (!entry.done) {
          removeMeteor(entry);
        }
      }
    },
  });
}
