import * as THREE from "three";

const STRIDE = 32;
const PX = 0;
const PY = 1;
const PZ = 2;
const VX = 3;
const VY = 4;
const VZ = 5;
const LIFE = 6;
const MAX_LIFE = 7;
const SIZE = 8;
const SIZE_END = 9;
const RX = 10;
const RY = 11;
const RZ = 12;
const SPIN_X = 13;
const SPIN_Y = 14;
const SPIN_Z = 15;
const GRAVITY = 16;
const DRAG = 17;
const R0 = 18;
const G0 = 19;
const B0 = 20;
const R1 = 21;
const G1 = 22;
const B1 = 23;
const ALPHA = 24;
const FLICKER = 25;
const WOBBLE = 26;
const SEED = 27;
const SHAPE_X = 28;
const SHAPE_Y = 29;
const SHAPE_Z = 30;
const FADE_OUT = 31;

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();
const startColor = new THREE.Color();
const endColor = new THREE.Color();

function patchInstanceAlpha(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float instanceAlpha;\nvarying float vInstanceAlpha;"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvInstanceAlpha = instanceAlpha;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vInstanceAlpha;"
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a *= vInstanceAlpha;"
      );
  };
  material.customProgramCacheKey = () => "balacoro-instance-alpha";
  return material;
}

export class ParticleSystem {
  constructor(parent, { geometry, capacity = 256, additive = false }) {
    this.parent = parent;
    this.capacity = capacity;
    this.active = 0;
    this.time = 0;
    this.data = new Float32Array(capacity * STRIDE);

    this.geometry = geometry.clone();
    this.alphaAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    this.alphaAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("instanceAlpha", this.alphaAttribute);

    this.material = patchInstanceAlpha(
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      })
    );

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3
    );
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = additive ? 3 : 2;
    parent.add(this.mesh);
  }

  emit(options) {
    if (this.active >= this.capacity) {
      return;
    }
    const base = this.active * STRIDE;
    this.active += 1;
    const data = this.data;
    const life = options.life ?? 1;
    const size = options.size ?? 0.2;
    startColor.set(options.color ?? 0xffffff);
    endColor.set(options.colorEnd ?? options.color ?? 0xffffff);
    const intensity = options.intensity ?? 1;

    data[base + PX] = options.x ?? 0;
    data[base + PY] = options.y ?? 0;
    data[base + PZ] = options.z ?? 0;
    data[base + VX] = options.vx ?? 0;
    data[base + VY] = options.vy ?? 0;
    data[base + VZ] = options.vz ?? 0;
    data[base + LIFE] = life;
    data[base + MAX_LIFE] = life;
    data[base + SIZE] = size;
    data[base + SIZE_END] = options.sizeEnd ?? size;
    data[base + RX] = options.rx ?? Math.random() * Math.PI * 2;
    data[base + RY] = options.ry ?? Math.random() * Math.PI * 2;
    data[base + RZ] = options.rz ?? Math.random() * Math.PI * 2;
    data[base + SPIN_X] = options.spinX ?? 0;
    data[base + SPIN_Y] = options.spinY ?? 0;
    data[base + SPIN_Z] = options.spinZ ?? 0;
    data[base + GRAVITY] = options.gravity ?? 0;
    data[base + DRAG] = options.drag ?? 0;
    data[base + R0] = startColor.r * intensity;
    data[base + G0] = startColor.g * intensity;
    data[base + B0] = startColor.b * intensity;
    data[base + R1] = endColor.r * intensity;
    data[base + G1] = endColor.g * intensity;
    data[base + B1] = endColor.b * intensity;
    data[base + ALPHA] = options.alpha ?? 1;
    data[base + FLICKER] = options.flicker ?? 0;
    data[base + WOBBLE] = options.wobble ?? 0;
    data[base + SEED] = Math.random() * 100;
    data[base + SHAPE_X] = options.shapeX ?? 1;
    data[base + SHAPE_Y] = options.shapeY ?? 1;
    data[base + SHAPE_Z] = options.shapeZ ?? 1;
    data[base + FADE_OUT] = options.fadeOut ?? 1;
  }

  update(delta) {
    this.time += delta;
    const data = this.data;
    const colors = this.mesh.instanceColor.array;
    const alphas = this.alphaAttribute.array;
    let index = 0;

    while (index < this.active) {
      const base = index * STRIDE;
      data[base + LIFE] -= delta;
      if (data[base + LIFE] <= 0) {
        this.active -= 1;
        if (index !== this.active) {
          const last = this.active * STRIDE;
          data.copyWithin(base, last, last + STRIDE);
        }
        continue;
      }

      data[base + VY] -= data[base + GRAVITY] * delta;
      const drag = data[base + DRAG];
      if (drag > 0) {
        const damping = Math.exp(-drag * delta);
        data[base + VX] *= damping;
        data[base + VY] *= damping;
        data[base + VZ] *= damping;
      }
      data[base + PX] += data[base + VX] * delta;
      data[base + PY] += data[base + VY] * delta;
      data[base + PZ] += data[base + VZ] * delta;

      const wobble = data[base + WOBBLE];
      if (wobble > 0) {
        const seed = data[base + SEED];
        data[base + PX] += Math.sin(this.time * 6 + seed) * wobble * delta;
        data[base + PZ] += Math.cos(this.time * 5 + seed * 1.3) * wobble * delta;
      }

      data[base + RX] += data[base + SPIN_X] * delta;
      data[base + RY] += data[base + SPIN_Y] * delta;
      data[base + RZ] += data[base + SPIN_Z] * delta;

      const progress = 1 - data[base + LIFE] / data[base + MAX_LIFE];
      const size =
        data[base + SIZE] + (data[base + SIZE_END] - data[base + SIZE]) * progress;
      const fadeOut = data[base + FADE_OUT];
      let alpha = data[base + ALPHA] * Math.min(1, (1 - progress) / fadeOut);
      const flicker = data[base + FLICKER];
      if (flicker > 0) {
        alpha *= 1 - flicker * Math.random();
      }

      position.set(data[base + PX], data[base + PY], data[base + PZ]);
      quaternion.setFromEuler(
        euler.set(data[base + RX], data[base + RY], data[base + RZ])
      );
      scale.set(
        size * data[base + SHAPE_X],
        size * data[base + SHAPE_Y],
        size * data[base + SHAPE_Z]
      );
      matrix.compose(position, quaternion, scale);
      this.mesh.setMatrixAt(index, matrix);

      const colorIndex = index * 3;
      colors[colorIndex] =
        data[base + R0] + (data[base + R1] - data[base + R0]) * progress;
      colors[colorIndex + 1] =
        data[base + G0] + (data[base + G1] - data[base + G0]) * progress;
      colors[colorIndex + 2] =
        data[base + B0] + (data[base + B1] - data[base + B0]) * progress;
      alphas[index] = alpha;

      index += 1;
    }

    const wasVisible = this.mesh.count > 0;
    this.mesh.count = this.active;
    if (this.active > 0 || wasVisible) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
      this.alphaAttribute.needsUpdate = true;
    }
  }

  clear() {
    this.active = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.parent.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
