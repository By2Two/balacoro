import * as THREE from "three";
import { audio } from "../AudioEngine.js";
import { POWER_DEFS } from "./definitions.js";
import {
  fxSystem,
  spread,
  between,
  spawnExplosion,
} from "../powerFx.js";
import {
  spawnRingWave,
  pushAway,
  pickColor,
} from "./helpers.js";

const BLACK_HOLE_PARTICLES = 110;
const blackHoleParticleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const BLACK_HOLE_COLORS = [0xb27bff, 0xff7ae0, 0xffffff, 0x7a5bff, 0xffb86b];

function createAccretionDisk(innerRadius, outerRadius) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 3);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const inner = new THREE.Color(0xffe2b8);
  const middle = new THREE.Color(0xff6ad5);
  const outer = new THREE.Color(0x3a1a8a);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i));
    const t = (radius - innerRadius) / (outerRadius - innerRadius);
    if (t < 0.5) {
      color.copy(inner).lerp(middle, t * 2);
    } else {
      color.copy(middle).lerp(outer, (t - 0.5) * 2);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

export function performBlackHole(player, scene, skill) {
  const range = skill.range ?? 12;
  const duration = skill.duration ?? 3;
  const baseRange = POWER_DEFS.blackHole.skill.range;
  const sizeScale = 1 + Math.max(0, range - baseRange) * 0.02;
  const direction = player.lastDirection.clone().setY(0);
  if (direction.lengthSq() === 0) {
    direction.set(1, 0, 0);
  }
  const center = player.position
    .clone()
    .addScaledVector(direction.normalize(), 5);

  const root = new THREE.Group();
  root.position.set(center.x, 1.2, center.z);
  scene.add(root);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.95 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0x9a5cff,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0x3a1a8a,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const disk = createAccretionDisk(1.1 * sizeScale, 3.2 * sizeScale);
  disk.rotation.x = -Math.PI / 2 + 0.35;
  const diskOuter = createAccretionDisk(1.6 * sizeScale, 4.2 * sizeScale);
  diskOuter.material.opacity = 0.35;
  diskOuter.rotation.x = -Math.PI / 2 + 0.2;
  root.add(core, horizon, halo, disk, diskOuter);

  const swirl = new THREE.InstancedMesh(
    blackHoleParticleGeometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    BLACK_HOLE_PARTICLES
  );
  swirl.frustumCulled = false;
  const swirlColor = new THREE.Color();
  const swirlState = [];
  const swirlRadius = Math.min(range * 0.55, 7) * sizeScale;
  for (let i = 0; i < BLACK_HOLE_PARTICLES; i++) {
    swirlState.push({
      angle: Math.random() * Math.PI * 2,
      radius: 1 + Math.random() * swirlRadius,
      height: spread(1.2),
      speed: between(2.5, 4.5),
    });
    swirl.setColorAt(i, swirlColor.set(pickColor(BLACK_HOLE_COLORS)).multiplyScalar(1.6));
  }
  swirl.instanceColor.needsUpdate = true;
  root.add(swirl);
  const swirlMatrix = new THREE.Matrix4();
  const swirlPosition = new THREE.Vector3();
  const swirlQuaternion = new THREE.Quaternion();
  const swirlScale = new THREE.Vector3();

  fxSystem(scene, "decals").emit({
    x: center.x,
    y: 0.03,
    z: center.z,
    rx: 0,
    ry: 0,
    rz: 0,
    life: duration + 0.8,
    size: 2.5 * sizeScale,
    sizeEnd: 6 * sizeScale,
    color: 0x0a0414,
    alpha: 0.75,
    fadeOut: 0.3,
  });

  root.scale.setScalar(0.01);
  let time = 0;
  let tickTimer = 0;
  let fadingOut = false;
  let collapsed = false;
  const pullTarget = new THREE.Vector3();
  const tileManager = scene.tileManager;
  const soundHandle = audio.playHandle("powerBlackHole", {
    position: root.position,
    fadeInSeconds: 0.6,
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;

      const growIn = Math.min(time / 0.35, 1);
      const shrinkOut = Math.max(Math.min((duration - time) / 0.3, 1), 0);
      const pulse = 1 + Math.sin(time * 10) * 0.05;
      root.scale.setScalar(Math.max((1 - Math.pow(1 - growIn, 3)) * shrinkOut * pulse, 0.01));
      disk.rotation.z += delta * 2.4;
      diskOuter.rotation.z -= delta * 1.2;
      horizon.material.opacity = 0.45 + Math.sin(time * 14) * 0.12;
      halo.scale.setScalar(1 + Math.sin(time * 5) * 0.1);

      for (let i = 0; i < BLACK_HOLE_PARTICLES; i++) {
        const particle = swirlState[i];
        particle.radius -= delta * (0.8 + (swirlRadius - particle.radius) * 0.6);
        particle.angle += (particle.speed / Math.max(particle.radius, 0.4)) * delta * 2;
        if (particle.radius < 0.6 * sizeScale) {
          particle.radius = swirlRadius * between(0.8, 1);
          particle.height = spread(1.2);
        }
        const heightFactor = particle.radius / swirlRadius;
        const size = 0.4 + heightFactor * 0.8;
        swirlMatrix.compose(
          swirlPosition.set(
            Math.cos(particle.angle) * particle.radius,
            particle.height * heightFactor,
            Math.sin(particle.angle) * particle.radius
          ),
          swirlQuaternion.identity(),
          swirlScale.set(size * 2.2, size, size)
        );
        swirl.setMatrixAt(i, swirlMatrix);
      }
      swirl.instanceMatrix.needsUpdate = true;

      for (const enemy of scene.enemies) {
        if (enemy.isDying || enemy.isDormant) {
          continue;
        }
        const offsetX = center.x - enemy.position.x;
        const offsetZ = center.z - enemy.position.z;
        const dist = Math.hypot(offsetX, offsetZ);
        if (dist < range && dist > 0.4) {
          const strength = (enemy.isBoss ? 2.5 : 7) * (1 + (1 - dist / range) * 0.6);
          const swirlFactor = 0.35;
          const stepX = (offsetX / dist + (-offsetZ / dist) * swirlFactor) * strength * delta;
          const stepZ = (offsetZ / dist + (offsetX / dist) * swirlFactor) * strength * delta;
          if (tileManager) {
            tileManager.moveCircle(
              enemy.position,
              enemy.position.x + stepX,
              enemy.position.z + stepZ,
              enemy.hitboxRadius * 0.85
            );
          } else {
            enemy.position.x += stepX;
            enemy.position.z += stepZ;
          }
        }
      }

      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(center) <= 2 * sizeScale) {
            enemy.hit(skill.damage ?? 0.8);
            fxSystem(scene, "glow").emit({
              x: enemy.position.x,
              y: 1,
              z: enemy.position.z,
              vx: (center.x - enemy.position.x) * 2,
              vz: (center.z - enemy.position.z) * 2,
              life: 0.3,
              size: 0.3,
              sizeEnd: 0.05,
              color: 0xd68bff,
              intensity: 2,
            });
          }
        }
      }

      if (time > duration - 0.4 && !fadingOut) {
        fadingOut = true;
        soundHandle.stop(0.4);
      }

      if (time >= duration && !collapsed) {
        collapsed = true;
        pullTarget.set(center.x, 0, center.z);
        audio.play("blackholeCollapse", { position: pullTarget });
        spawnExplosion(scene, pullTarget, {
          radius: 4.5 * sizeScale,
          color: 0x9a5cff,
          hotColor: 0xffe2ff,
          smokeColor: 0x2a1a3a,
          debrisColor: 0x1a1024,
          power: 1.2,
        });
        spawnRingWave(scene, pullTarget.clone(), {
          maxRadius: 4.5 * sizeScale,
          duration: 0.35,
          color: 0xd68bff,
          bandWidth: 0.3,
          onWaveHit: (enemy) => {
            enemy.hit((skill.damage ?? 0.8) * 3);
            pushAway(enemy, pullTarget, 18);
          },
        });
      }
      return time < duration;
    },
    dispose() {
      if (!fadingOut) {
        soundHandle.stop(0.2);
      }
      scene.remove(root);
      for (const mesh of [core, horizon, halo, disk, diskOuter]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      swirl.material.dispose();
      swirl.dispose();
    },
  });
}
