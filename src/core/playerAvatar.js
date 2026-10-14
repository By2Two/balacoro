import * as THREE from "three";
import { createAccessory } from "./cosmetics.js";
import { createSkin } from "./skins.js";
import { createFace } from "./face.js";
import { AccessoryPhysics } from "./accessoryPhysics.js";

const bodyGeometry = new THREE.BoxGeometry(1, 1, 1);

export function createPlayerAvatar(customization) {
  const body = new THREE.Group();
  const skin = createSkin(customization.skin ?? "plain", customization.color);

  const mesh = new THREE.Mesh(bodyGeometry, skin.material);
  mesh.position.y = 0.35;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  body.add(mesh);

  const face = createFace(customization.eyes, customization.brows);
  mesh.add(face.group);

  const accessories = [];
  for (const id of customization.accessories ?? []) {
    const accessory = createAccessory(id);
    if (!accessory) {
      continue;
    }
    accessory.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    mesh.add(accessory);
    accessories.push(accessory);
  }

  const physics = new AccessoryPhysics(mesh);
  const motion = {
    time: 0,
    phase: 0,
    bounce: 0,
    tiltX: 0,
    tiltZ: 0,
    impact: 0,
  };

  return {
    body,
    mesh,
    skin,
    face,
    physics,
    update(delta, options = {}) {
      const {
        moving = false,
        localX = 0,
        localZ = 0,
        speedFactor = 1,
        animateSkin = true,
      } = options;
      motion.time += delta;
      if (moving) {
        motion.phase += delta * 11 * speedFactor;
      } else {
        motion.phase = 0;
      }

      const hop = moving ? Math.abs(Math.sin(motion.phase)) : 0;
      const breathe = Math.sin(motion.time * 2.2);
      const bounceTarget = moving ? hop * 0.14 : 0.012 + breathe * 0.012;
      motion.bounce += (bounceTarget - motion.bounce) * Math.min(delta * 18, 1);

      motion.impact *= Math.exp(-delta * 12);
      const stretch =
        (moving ? 0.9 + hop * 0.16 : 1 + breathe * 0.02) + motion.impact;

      const tiltBlend = Math.min(delta * 10, 1);
      motion.tiltX += ((moving ? localZ * 0.22 : 0) - motion.tiltX) * tiltBlend;
      motion.tiltZ += ((moving ? -localX * 0.22 : 0) - motion.tiltZ) * tiltBlend;

      const widen = 1 / Math.sqrt(Math.max(stretch, 0.5));
      body.position.y = motion.bounce;
      body.scale.set(widen, stretch, widen);
      body.rotation.set(motion.tiltX, 0, motion.tiltZ);

      physics.update(delta);
      if (animateSkin && skin.isAnimated) {
        skin.animate(motion.time);
      }
    },
    impulse(amount) {
      motion.impact = amount;
    },
    setColor(color) {
      skin.setColor(color);
    },
    dispose() {
      skin.dispose();
      face.dispose();
      for (const accessory of accessories) {
        accessory.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      }
    },
  };
}
