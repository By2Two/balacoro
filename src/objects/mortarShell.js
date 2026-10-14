import * as THREE from "three";
import { audio } from "../core/AudioEngine.js";
import {
  fxSystem,
  spread,
  between,
  shake,
  spawnExplosion,
} from "../core/powerFx.js";
import {
  MORTAR_SHELL_FLIGHT_TIME,
  MORTAR_SHELL_APEX,
  MORTAR_BLAST_RADIUS,
} from "../constants.js";

const shellGeometry = new THREE.IcosahedronGeometry(0.32, 1);
const shellGlowGeometry = new THREE.SphereGeometry(0.5, 12, 10);
const warningRingGeometry = new THREE.RingGeometry(0.9, 1, 40);
warningRingGeometry.rotateX(-Math.PI / 2);
const warningDiscGeometry = new THREE.CircleGeometry(1, 40);
warningDiscGeometry.rotateX(-Math.PI / 2);

export function getVisibleBlastColor(color) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.6), Math.max(hsl.l, 0.5));
}

export function getShellArcPosition(origin, target, progress, apex, out) {
  out.lerpVectors(origin, target, progress);
  out.y += 4 * apex * progress * (1 - progress);
  return out;
}

export function spawnMortarShell(scene, { origin, target, color, onImpact }) {
  const blastColor = getVisibleBlastColor(color);
  const hotColor = blastColor.clone().lerp(new THREE.Color(0xffffff), 0.6);
  const radius = MORTAR_BLAST_RADIUS;
  const landing = new THREE.Vector3(target.x, 0.3, target.z);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1c22,
    emissive: blastColor,
    emissiveIntensity: 0.9,
    flatShading: true,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: blastColor,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  shell.add(new THREE.Mesh(shellGlowGeometry, glowMaterial));
  shell.position.copy(origin);
  shell.castShadow = true;
  scene.add(shell);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: blastColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const discMaterial = new THREE.MeshBasicMaterial({
    color: blastColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const warning = new THREE.Group();
  warning.add(
    new THREE.Mesh(warningRingGeometry, ringMaterial),
    new THREE.Mesh(warningDiscGeometry, discMaterial)
  );
  warning.position.set(target.x, 0.07, target.z);
  warning.scale.setScalar(radius);
  warning.renderOrder = 1;
  scene.add(warning);

  let time = 0;
  let trailTimer = 0;
  let done = false;

  const cleanup = () => {
    scene.remove(shell);
    scene.remove(warning);
    shellMaterial.dispose();
    glowMaterial.dispose();
    ringMaterial.dispose();
    discMaterial.dispose();
  };

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const progress = Math.min(time / MORTAR_SHELL_FLIGHT_TIME, 1);
      getShellArcPosition(origin, landing, progress, MORTAR_SHELL_APEX, shell.position);
      shell.rotation.x += delta * 3;
      shell.rotation.z += delta * 2;

      const urgency = progress * progress;
      const blink = 0.7 + Math.sin(time * (6 + urgency * 30)) * 0.3;
      ringMaterial.opacity = (0.25 + 0.6 * urgency) * blink;
      discMaterial.opacity = (0.04 + 0.2 * urgency) * blink;
      warning.children[1].scale.setScalar(Math.max(urgency, 0.05));

      trailTimer += delta;
      while (trailTimer > 0.03) {
        trailTimer -= 0.03;
        fxSystem(scene, "smoke").emit({
          x: shell.position.x + spread(0.1),
          y: shell.position.y,
          z: shell.position.z + spread(0.1),
          vy: 0.3,
          life: between(0.7, 1.1),
          size: 0.25,
          sizeEnd: 0.8,
          color: 0x3a3438,
          colorEnd: 0x1e1c20,
          alpha: 0.5,
          fadeOut: 0.8,
        });
        fxSystem(scene, "glow").emit({
          x: shell.position.x,
          y: shell.position.y,
          z: shell.position.z,
          life: 0.25,
          size: 0.35,
          sizeEnd: 0.05,
          color: hotColor.getHex(),
          colorEnd: blastColor.getHex(),
          intensity: 1.8,
        });
      }

      if (progress >= 1) {
        done = true;
        cleanup();
        spawnExplosion(scene, landing, {
          radius,
          color: blastColor.getHex(),
          hotColor: hotColor.getHex(),
          power: 0.9,
        });
        audio.play("mortarImpact", { position: landing });
        shake(scene, 0.25, 0.3);
        onImpact?.(landing, radius);
        return false;
      }
      return true;
    },
    dispose() {
      if (!done) {
        cleanup();
      }
    },
  });
}
