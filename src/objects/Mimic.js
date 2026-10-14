import * as THREE from "three";
import { Enemy } from "./Enemy.js";
import { applyIdleBob } from "./Item.js";
import { getDifficultyColor } from "./MonsterGenome.js";
import {
  MIMIC_WAKE_DISTANCE,
  MIMIC_COIN_MULTIPLIER,
  MIMIC_WAKE_GROW_TIME,
} from "../constants.js";
import { audio } from "../core/AudioEngine.js";

const bodyGeometry = new THREE.BoxGeometry(0.9, 0.55, 0.65);
const lidGeometry = new THREE.BoxGeometry(0.94, 0.26, 0.69);
const bandGeometry = new THREE.BoxGeometry(0.96, 0.57, 0.14);
const toothGeometry = new THREE.BoxGeometry(0.09, 0.16, 0.07);
const tongueGeometry = new THREE.BoxGeometry(0.24, 0.05, 0.55);
const mouthGeometry = new THREE.BoxGeometry(0.82, 0.08, 0.55);
const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23e });
const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5ec });
const tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xc4374d });
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1216 });

export const MIMIC_DISGUISE_COLOR = 0x8b5a2b;
export const MIMIC_LID_DISGUISE_COLOR = 0x6e4523;

export function buildMimicBody() {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: MIMIC_DISGUISE_COLOR,
  });
  const lidMaterial = new THREE.MeshStandardMaterial({
    color: MIMIC_LID_DISGUISE_COLOR,
  });

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.28;

  const band = new THREE.Mesh(bandGeometry, goldMaterial);
  band.position.y = 0.28;

  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.y = 0.55;

  const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
  tongue.position.set(0, 0.58, 0.22);
  tongue.rotation.x = 0.25;

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.56, -0.33);
  const lid = new THREE.Mesh(lidGeometry, lidMaterial);
  lid.position.set(0, 0.12, 0.34);
  lidPivot.add(lid);

  const mouthParts = [mouth, tongue];
  for (const side of [-0.3, -0.1, 0.1, 0.3]) {
    const upperTooth = new THREE.Mesh(toothGeometry, toothMaterial);
    upperTooth.position.set(side, 0.02, 0.62);
    lidPivot.add(upperTooth);
    mouthParts.push(upperTooth);

    const lowerTooth = new THREE.Mesh(toothGeometry, toothMaterial);
    lowerTooth.position.set(side + 0.05, 0.6, 0.29);
    group.add(lowerTooth);
    mouthParts.push(lowerTooth);
  }

  for (const part of mouthParts) {
    part.visible = false;
  }

  group.add(body, band, mouth, tongue, lidPivot);
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    group,
    body,
    lid,
    tongue,
    lidPivot,
    mouthParts,
    bodyMaterial,
    lidMaterial,
    flashEntries: [
      { mesh: body, material: bodyMaterial },
      { mesh: lid, material: lidMaterial },
      { mesh: tongue, material: tongueMaterial },
    ],
  };
}

export function setMimicAwakeColor(bodyMaterialInstance, lidMaterialInstance, difficulty) {
  const color = getDifficultyColor(difficulty);
  bodyMaterialInstance.color.copy(color);
  bodyMaterialInstance.emissive.copy(color).multiplyScalar(0.25);
  lidMaterialInstance.color.copy(color).multiplyScalar(0.7);
}

export class Mimic extends Enemy {
  constructor(target, spawnPosition, speed, health, difficulty) {
    super(target, spawnPosition, speed, health, difficulty, false, "tank");

    this.remove(this.mesh);
    this.disposeBodyGeometries();
    this.removeElite();
    this.core = null;

    const body = buildMimicBody();
    this.mesh = body.group;
    this.bodyMaterialInstance = body.bodyMaterial;
    this.lidMaterialInstance = body.lidMaterial;
    this.lidPivot = body.lidPivot;
    this.tongue = body.tongue;
    this.mouthParts = body.mouthParts;
    this.flashEntries = body.flashEntries;

    this.dormantScale = 1;
    this.mesh.scale.setScalar(this.dormantScale);
    this.add(this.mesh);

    this.eyes = [];
    this.animatedParts = [];
    this.bodyScale = new THREE.Vector3(this.size, this.size, this.size);

    this.coinReward = Math.round(this.coinReward * MIMIC_COIN_MULTIPLIER);
    this.isMimic = true;
    this.isDormant = true;
    this.chompTime = 0;
    this.baseY = spawnPosition.y;
    this.bobTime = Math.random() * Math.PI * 2;
    this.wakeTime = 0;
  }

  wake() {
    this.isDormant = false;
    this.wakeTime = 0;
    audio.play("mimicAwake", { position: this.position });
    for (const part of this.mouthParts) {
      part.visible = true;
    }
    setMimicAwakeColor(
      this.bodyMaterialInstance,
      this.lidMaterialInstance,
      this.difficulty
    );
  }

  hit(damage = 1, isCritical = false, critSoundOverride = null) {
    if (this.isDormant) {
      this.wake();
    }
    super.hit(damage, isCritical, critSoundOverride);
  }

  update(delta) {
    if (this.isDying) {
      super.update(delta);
      return;
    }

    if (this.isDormant) {
      if (this.healthBarSprite) {
        this.healthBarSprite.visible = false;
      }
      applyIdleBob(this, delta);
      const distSq = this.position.distanceToSquared(this.target.position);
      if (distSq < MIMIC_WAKE_DISTANCE * MIMIC_WAKE_DISTANCE) {
        this.wake();
      }
      return;
    }

    if (this.wakeTime < MIMIC_WAKE_GROW_TIME) {
      this.wakeTime += delta;
      const wakeProgress = Math.min(this.wakeTime / MIMIC_WAKE_GROW_TIME, 1);
      this.mesh.scale.setScalar(
        THREE.MathUtils.lerp(this.dormantScale, this.size, wakeProgress)
      );
      this.position.y = THREE.MathUtils.lerp(
        this.position.y,
        this.baseY,
        wakeProgress
      );
    }

    this.chompTime += delta;
    this.lidPivot.rotation.x = -(
      0.35 + Math.abs(Math.sin(this.chompTime * 6)) * 0.55
    );
    this.tongue.rotation.x = 0.25 + Math.sin(this.chompTime * 9) * 0.12;

    super.update(delta);
  }

  dispose() {
    super.dispose();
    this.bodyMaterialInstance.dispose();
    this.lidMaterialInstance.dispose();
  }
}
