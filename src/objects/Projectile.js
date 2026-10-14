import * as THREE from "three";
import {
  PROJECTILE_SPEED_BASE,
  PROJECTILE_LIFETIME,
  PROJECTILE_DAMAGE,
  PROJECTILE_SIZE,
  PROJECTILE_COLOR,
} from "../constants";
import { getShotGeometry, SHOT_SPIN } from "../core/shotShapes.js";

const materialCache = new Map();
const collisionBox = new THREE.Box3();
const collisionCenter = new THREE.Vector3();
const collisionSize = new THREE.Vector3(
  PROJECTILE_SIZE,
  PROJECTILE_SIZE,
  PROJECTILE_SIZE
);

function getProjectileMaterial(color, glowing) {
  const key = `${color}_${glowing}`;
  let material = materialCache.get(key);
  if (!material) {
    material = glowing
      ? new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.5,
          flatShading: true,
        })
      : new THREE.MeshStandardMaterial({ color, flatShading: true });
    materialCache.set(key, material);
  }
  return material;
}

export class Projectile extends THREE.Mesh {
  constructor(
    position,
    direction,
    speed = PROJECTILE_SPEED_BASE,
    lifeTime = PROJECTILE_LIFETIME,
    damage = PROJECTILE_DAMAGE,
    glowing = false,
    pierce = 1,
    color = PROJECTILE_COLOR,
    isCritical = false,
    shape = "box"
  ) {
    super(getShotGeometry(shape), getProjectileMaterial(color, glowing));
    this.position.copy(position);
    this.spin = SHOT_SPIN[shape] ?? 0;
    if (shape === "arrow") {
      this.rotation.y = Math.atan2(direction.x, direction.z);
    }

    this.damage = damage;
    this.direction = direction;
    this.speed = speed;
    this.lifeTime = lifeTime;
    this.glowing = glowing;
    this.pierce = pierce;
    this.isCritical = isCritical;
    this.hitEnemies = new Set();
  }

  update(delta) {
    this.position.addScaledVector(this.direction, this.speed * delta);
    if (this.spin) {
      this.rotation.y += this.spin * delta;
    }

    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }

  getCollisionBox() {
    return collisionBox.setFromCenterAndSize(
      collisionCenter.set(
        this.position.x,
        this.position.y + 0.5,
        this.position.z
      ),
      collisionSize
    );
  }
}
