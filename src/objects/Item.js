import * as THREE from "three";
import { INITIAL_PLAYER_SKILLS } from "../constants.js";

const chestBodyGeometry = new THREE.BoxGeometry(0.7, 0.42, 0.5);
const chestLidGeometry = new THREE.BoxGeometry(0.74, 0.2, 0.54);
const chestBandGeometry = new THREE.BoxGeometry(0.76, 0.44, 0.12);
const chestLockGeometry = new THREE.BoxGeometry(0.14, 0.16, 0.06);
const chestBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const chestLidMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4523 });
const chestGoldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23e });

export function applyIdleBob(bobbingObject, delta) {
  bobbingObject.rotation.y += delta;
  bobbingObject.bobTime += delta;
  bobbingObject.position.y =
    bobbingObject.baseY + Math.sin(bobbingObject.bobTime * 2) * 0.08;
}

export class Item extends THREE.Group {
  static skillTypes = Object.keys(INITIAL_PLAYER_SKILLS);

  constructor(position) {
    super();
    const { type } = Item.getRandomSkill();
    this.effectType = type;

    const body = new THREE.Mesh(chestBodyGeometry, chestBodyMaterial);
    body.position.y = 0.21;

    const lid = new THREE.Mesh(chestLidGeometry, chestLidMaterial);
    lid.position.y = 0.5;

    const band = new THREE.Mesh(chestBandGeometry, chestGoldMaterial);
    band.position.y = 0.22;

    const lock = new THREE.Mesh(chestLockGeometry, chestGoldMaterial);
    lock.position.set(0, 0.42, 0.28);

    this.add(body, lid, band, lock);
    this.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    this.position.copy(position);
    this.baseY = position.y;
    this.bobTime = Math.random() * Math.PI * 2;
  }

  static getRandomSkill() {
    const type =
      Item.skillTypes[Math.floor(Math.random() * Item.skillTypes.length)];
    const color = Item._getColorForSkill(type);
    return { type, color };
  }

  static _getColorForSkill(skill) {
    switch (skill) {
      case "dash":
        return 0xffa500;
      case "energyExplosion":
        return 0xff0000;
      case "freezeExplosion":
        return 0x00ccff;
      case "forceField":
        return 0xffff00;
      case "thorns":
        return 0x00ff00;
      case "glowing":
        return 0x90f5bc;
      case "projectGlowing":
        return 0xffffff;
      default:
        return 0xaaaaaa;
    }
  }

  update(delta) {
    applyIdleBob(this, delta);
  }
}
