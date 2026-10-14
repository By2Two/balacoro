import * as THREE from "three";

const MAX_SPEED = 25;
const MAX_ACCELERATION = 200;
const MAX_ANGULAR_SPEED = 20;
const MAX_ANGLE = 1;

const worldPosition = new THREE.Vector3();
const worldQuaternion = new THREE.Quaternion();
const inverseQuaternion = new THREE.Quaternion();
const deltaQuaternion = new THREE.Quaternion();
const velocity = new THREE.Vector3();
const acceleration = new THREE.Vector3();
const localVelocity = new THREE.Vector3();
const localAcceleration = new THREE.Vector3();
const angularVelocity = new THREE.Vector3();
const tip = new THREE.Vector3();
const tipVelocity = new THREE.Vector3();

export class AccessoryPhysics {
  constructor(anchor) {
    this.anchor = anchor;
    this.pivots = [];
    this.previousPosition = null;
    this.previousVelocity = new THREE.Vector3();
    this.previousQuaternion = new THREE.Quaternion();
    anchor.traverse((object) => {
      if (object.userData.wobble) {
        this.pivots.push({
          object,
          spec: object.userData.wobble,
          baseX: object.rotation.x,
          baseZ: object.rotation.z,
          angleX: 0,
          angleZ: 0,
          velocityX: 0,
          velocityZ: 0,
        });
      }
    });
  }

  reset() {
    this.previousPosition = null;
  }

  update(delta) {
    if (this.pivots.length === 0 || delta <= 0) {
      return;
    }
    const step = Math.min(delta, 0.05);

    this.anchor.updateWorldMatrix(true, false);
    this.anchor.getWorldPosition(worldPosition);
    this.anchor.getWorldQuaternion(worldQuaternion);

    if (!this.previousPosition) {
      this.previousPosition = worldPosition.clone();
      this.previousQuaternion.copy(worldQuaternion);
      this.previousVelocity.set(0, 0, 0);
      return;
    }

    velocity
      .subVectors(worldPosition, this.previousPosition)
      .divideScalar(delta)
      .clampLength(0, MAX_SPEED);
    acceleration
      .subVectors(velocity, this.previousVelocity)
      .divideScalar(delta)
      .clampLength(0, MAX_ACCELERATION);

    inverseQuaternion.copy(worldQuaternion).invert();
    localVelocity.copy(velocity).applyQuaternion(inverseQuaternion);
    localAcceleration.copy(acceleration).applyQuaternion(inverseQuaternion);

    deltaQuaternion
      .copy(this.previousQuaternion)
      .invert()
      .multiply(worldQuaternion);
    const w = THREE.MathUtils.clamp(deltaQuaternion.w, -1, 1);
    const angle = 2 * Math.acos(Math.abs(w));
    const sinHalf = Math.sqrt(1 - w * w);
    if (sinHalf > 1e-5 && angle > 1e-5) {
      const sign = w < 0 ? -1 : 1;
      angularVelocity
        .set(deltaQuaternion.x, deltaQuaternion.y, deltaQuaternion.z)
        .multiplyScalar((sign * angle) / (sinHalf * delta))
        .clampLength(0, MAX_ANGULAR_SPEED);
    } else {
      angularVelocity.set(0, 0, 0);
    }

    for (const pivot of this.pivots) {
      const { strength = 1, stiffness = 60, damping = 6, side = 0 } = pivot.spec;
      tip.copy(pivot.object.position);
      tip.y += 0.3;
      tipVelocity.crossVectors(angularVelocity, tip).add(localVelocity);

      const targetX = THREE.MathUtils.clamp(
        -(localAcceleration.z * 0.006 + tipVelocity.z * 0.05) * strength,
        -0.9,
        0.9
      );
      const targetZ = THREE.MathUtils.clamp(
        (localAcceleration.x * 0.006 + tipVelocity.x * 0.05) * strength -
          side * localAcceleration.y * 0.003 * strength,
        -0.9,
        0.9
      );

      pivot.velocityX +=
        ((targetX - pivot.angleX) * stiffness - pivot.velocityX * damping) * step;
      pivot.velocityZ +=
        ((targetZ - pivot.angleZ) * stiffness - pivot.velocityZ * damping) * step;
      pivot.angleX = THREE.MathUtils.clamp(
        pivot.angleX + pivot.velocityX * step,
        -MAX_ANGLE,
        MAX_ANGLE
      );
      pivot.angleZ = THREE.MathUtils.clamp(
        pivot.angleZ + pivot.velocityZ * step,
        -MAX_ANGLE,
        MAX_ANGLE
      );
      pivot.object.rotation.x = pivot.baseX + pivot.angleX;
      pivot.object.rotation.z = pivot.baseZ + pivot.angleZ;
    }

    this.previousPosition.copy(worldPosition);
    this.previousVelocity.copy(velocity);
    this.previousQuaternion.copy(worldQuaternion);
  }
}
