import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  getDifficultyColor,
  getDifficultyColorStyle,
  DIFFICULTY_COLOR_MAX_LEVEL,
  SKULL_CRAZE_START,
} from "../objects/MonsterGenome.js";

const CRAZE_START = SKULL_CRAZE_START;
const MAX_LEVEL = DIFFICULTY_COLOR_MAX_LEVEL;
const FLAME_CAPACITY = 90;
const UP = new THREE.Vector3(0, 1, 0);

function crazeAmount(power) {
  return Math.min(Math.max(power - CRAZE_START, 0) / (MAX_LEVEL - CRAZE_START), 1);
}

function growIn(power, start, full) {
  if (power < start) {
    return 0;
  }
  return Math.min(0.35 + ((power - start) / Math.max(full - start, 1)) * 0.65, 1);
}

function taperedChain(points, baseRadius, material, geometry, track) {
  const group = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const t = i / (points.length - 1);
    const isTip = i === points.length - 2;
    const radius = baseRadius * (1 - t * 0.8);
    const segment = new THREE.Mesh(isTip ? geometry.cone : geometry.cylinder, material);
    const direction = to.clone().sub(from);
    const length = direction.length();
    segment.position.copy(from).addScaledVector(direction, 0.5);
    segment.quaternion.setFromUnitVectors(UP, direction.normalize());
    segment.scale.set(radius, length * (isTip ? 1.1 : 1.05), radius);
    group.add(segment);
  }
  track(group);
  return group;
}

function curvePoints(start, control, end, count) {
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  return curve.getPoints(count);
}

function buildSkull() {
  const root = new THREE.Group();
  const skullGroup = new THREE.Group();
  root.add(skullGroup);

  const boneMaterial = new THREE.MeshStandardMaterial({ color: 0x2255ff, flatShading: true, roughness: 0.7 });
  const hornMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d0c0, flatShading: true, roughness: 0.55 });
  const socketMaterial = new THREE.MeshBasicMaterial({ color: 0x050508 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const crackMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a10 });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3a1a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const disposables = [boneMaterial, hornMaterial, socketMaterial, glowMaterial, crackMaterial, haloMaterial];
  const track = (object) => {
    object.traverse?.((child) => {
      if (child.geometry) {
        disposables.push(child.geometry);
      }
    });
    if (object.isBufferGeometry) {
      disposables.push(object);
    }
    return object;
  };

  const chainGeometry = {
    cylinder: track(new THREE.CylinderGeometry(1, 1, 1, 6)),
    cone: track(new THREE.ConeGeometry(1, 1, 6)),
  };

  const cranium = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.56, 2)), boneMaterial);
  cranium.scale.set(1, 0.94, 1.06);
  cranium.position.y = 0.22;
  skullGroup.add(cranium);

  const backSkull = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.5, 1)), boneMaterial);
  backSkull.position.set(0, 0.18, -0.16);
  skullGroup.add(backSkull);

  const browRidge = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.09, 0.14)), boneMaterial);
  browRidge.position.set(0, 0.34, 0.44);
  skullGroup.add(browRidge);

  const cheekGeometry = track(new THREE.BoxGeometry(0.2, 0.12, 0.2));
  const cheekSpikeGeometry = track(new THREE.ConeGeometry(0.05, 0.22, 5));
  const cheekSpikes = [];
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeometry, boneMaterial);
    cheek.position.set(side * 0.37, 0.04, 0.3);
    cheek.rotation.set(0, side * 0.35, side * -0.15);
    skullGroup.add(cheek);
    const spike = new THREE.Mesh(cheekSpikeGeometry, hornMaterial);
    spike.position.set(side * 0.52, 0.05, 0.24);
    spike.rotation.z = -side * 1.4;
    skullGroup.add(spike);
    cheekSpikes.push(spike);
  }

  const socketGeometry = track(new THREE.SphereGeometry(0.14, 10, 8));
  const glowGeometry = track(new THREE.SphereGeometry(0.06, 8, 6));
  const eyeGlows = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(socketGeometry, socketMaterial);
    socket.position.set(side * 0.21, 0.2, 0.43);
    socket.scale.set(1.05, 1.15, 0.55);
    socket.rotation.z = side * 0.25;
    skullGroup.add(socket);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(side * 0.21, 0.19, 0.5);
    skullGroup.add(glow);
    eyeGlows.push(glow);
  }

  const thirdEyeSocket = new THREE.Mesh(socketGeometry, socketMaterial);
  thirdEyeSocket.position.set(0, 0.5, 0.42);
  thirdEyeSocket.scale.set(0.55, 0.75, 0.45);
  skullGroup.add(thirdEyeSocket);
  const thirdEye = new THREE.Mesh(glowGeometry, glowMaterial);
  thirdEye.position.set(0, 0.5, 0.48);
  thirdEye.scale.set(0.8, 1.1, 0.8);
  skullGroup.add(thirdEye);

  const nasal = new THREE.Mesh(track(new THREE.ConeGeometry(0.08, 0.18, 3)), socketMaterial);
  nasal.rotation.x = Math.PI;
  nasal.position.set(0, 0.0, 0.52);
  skullGroup.add(nasal);

  const maxilla = new THREE.Mesh(track(new THREE.BoxGeometry(0.44, 0.15, 0.3)), boneMaterial);
  maxilla.position.set(0, -0.17, 0.28);
  skullGroup.add(maxilla);

  const toothGeometry = track(new THREE.BoxGeometry(0.055, 0.1, 0.06));
  const teeth = [-0.17, -0.1, -0.035, 0.035, 0.1, 0.17];
  for (const x of teeth) {
    const tooth = new THREE.Mesh(toothGeometry, hornMaterial);
    tooth.position.set(x, -0.28, 0.41);
    skullGroup.add(tooth);
  }

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.24, -0.08);
  skullGroup.add(jawPivot);
  const jaw = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.14, 0.46)), boneMaterial);
  jaw.position.set(0, -0.14, 0.22);
  jawPivot.add(jaw);
  const chin = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, 0.12, 0.12)), boneMaterial);
  chin.position.set(0, -0.16, 0.44);
  jawPivot.add(chin);
  for (const x of teeth) {
    const tooth = new THREE.Mesh(toothGeometry, hornMaterial);
    tooth.position.set(x, -0.04, 0.42);
    jawPivot.add(tooth);
  }

  const tuskGeometry = track(new THREE.ConeGeometry(0.06, 0.3, 5));
  const tusks = [];
  for (const side of [-1, 1]) {
    const tusk = new THREE.Mesh(tuskGeometry, hornMaterial);
    tusk.position.set(side * 0.24, 0.1, 0.42);
    tusk.rotation.set(0.2, 0, side * 0.25);
    jawPivot.add(tusk);
    tusks.push(tusk);
  }

  const crackGeometry = track(new THREE.BoxGeometry(0.03, 0.22, 0.03));
  const cracks = [];
  const crackSpots = [
    [0.18, 0.55, 0.3, 0.5],
    [-0.28, 0.48, 0.28, -0.6],
    [0.34, 0.34, 0.32, 0.9],
    [-0.08, 0.66, 0.2, 0.2],
    [0.0, 0.42, 0.52, 1.4],
    [-0.4, 0.2, 0.3, -1.1],
  ];
  for (const [x, y, z, angle] of crackSpots) {
    const crack = new THREE.Mesh(crackGeometry, crackMaterial);
    crack.position.set(x, y, z);
    crack.lookAt(x * 2, y * 2 - 0.2, z * 2);
    crack.rotateZ(angle);
    skullGroup.add(crack);
    cracks.push(crack);
  }

  const frontHorns = [];
  const ramHorns = [];
  for (const side of [-1, 1]) {
    const front = taperedChain(
      curvePoints(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * 0.35, 0.35, 0.05),
        new THREE.Vector3(side * 0.28, 0.85, -0.15),
        6
      ),
      0.1,
      hornMaterial,
      chainGeometry,
      track
    );
    front.position.set(side * 0.3, 0.58, 0.1);
    skullGroup.add(front);
    frontHorns.push(front);

    const ram = taperedChain(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * 0.22, 0.12, -0.12),
        new THREE.Vector3(side * 0.34, -0.08, -0.3),
        new THREE.Vector3(side * 0.3, -0.34, -0.2),
        new THREE.Vector3(side * 0.18, -0.4, 0.02),
        new THREE.Vector3(side * 0.1, -0.24, 0.12),
      ],
      0.11,
      hornMaterial,
      chainGeometry,
      track
    );
    ram.position.set(side * 0.46, 0.36, -0.05);
    skullGroup.add(ram);
    ramHorns.push(ram);
  }

  const crossBoneGeometry = track(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 6));
  const knobGeometry = track(new THREE.SphereGeometry(0.075, 6, 5));
  const buildBone = (length = 1) => {
    const bone = new THREE.Group();
    const shaft = new THREE.Mesh(crossBoneGeometry, hornMaterial);
    shaft.scale.y = length;
    bone.add(shaft);
    for (const end of [-1, 1]) {
      for (const offset of [-0.055, 0.055]) {
        const knob = new THREE.Mesh(knobGeometry, hornMaterial);
        knob.position.set(offset, end * 0.65 * length, 0);
        bone.add(knob);
      }
    }
    return bone;
  };
  const crossBones = [];
  for (const side of [-1, 1]) {
    const bone = buildBone();
    bone.position.set(0, -0.05, -0.36);
    bone.rotation.z = side * 0.7;
    root.add(bone);
    crossBones.push(bone);
  }

  const crownGeometry = track(new THREE.ConeGeometry(0.055, 0.28, 4));
  const crownSpikes = [];
  const crownOrder = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * 0.85 - (i / 8) * Math.PI * 0.7;
    const spike = new THREE.Mesh(crownGeometry, hornMaterial);
    spike.position.set(Math.cos(angle) * 0.46, 0.44 + Math.sin(angle) * 0.36, -0.14);
    spike.rotation.z = angle - Math.PI / 2;
    skullGroup.add(spike);
    crownSpikes[crownOrder.indexOf(i)] = spike;
  }

  const vertebraGeometry = track(new THREE.BoxGeometry(0.13, 0.1, 0.12));
  const collar = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 1.15 + (i / 6) * Math.PI * 0.7;
    const vertebra = new THREE.Mesh(vertebraGeometry, hornMaterial);
    vertebra.position.set(Math.cos(angle) * 0.55, -0.55 - Math.sin(angle + Math.PI) * 0.12, -0.05);
    vertebra.rotation.z = angle + Math.PI / 2;
    collar.add(vertebra);
  }
  root.add(collar);

  const rayGeometry = track(new THREE.ConeGeometry(0.06, 1, 4));
  const haloRays = [];
  const rayGroup = new THREE.Group();
  rayGroup.position.set(0, 0.2, -0.45);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const ray = new THREE.Mesh(rayGeometry, hornMaterial);
    ray.position.set(Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0);
    ray.rotation.z = angle - Math.PI / 2;
    ray.scale.set(1, 0.6 + (i % 2) * 0.35, 1);
    rayGroup.add(ray);
    haloRays.push(ray);
  }
  root.add(rayGroup);

  const fireRing = new THREE.Mesh(track(new THREE.RingGeometry(0.95, 1.2, 40)), haloMaterial);
  fireRing.position.set(0, 0.2, -0.5);
  root.add(fireRing);

  const orbiters = [];
  const orbitGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const bone = buildBone(0.35);
    bone.userData.phase = (i / 4) * Math.PI * 2;
    orbitGroup.add(bone);
    orbiters.push(bone);
  }
  root.add(orbitGroup);

  const flameMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(flameMaterial);
  const flames = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 1, 1)), flameMaterial, FLAME_CAPACITY);
  flames.frustumCulled = false;
  flames.count = 0;
  flames.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FLAME_CAPACITY * 3), 3);
  root.add(flames);

  return {
    root,
    skullGroup,
    boneMaterial,
    glowMaterial,
    crackMaterial,
    haloMaterial,
    jawPivot,
    eyeGlows,
    thirdEye,
    thirdEyeSocket,
    cheekSpikes,
    tusks,
    cracks,
    frontHorns,
    ramHorns,
    crossBones,
    crownSpikes,
    collar,
    rayGroup,
    haloRays,
    fireRing,
    orbitGroup,
    orbiters,
    flames,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
      flames.dispose();
    },
  };
}

function applyPower(skull, power) {
  const color = getDifficultyColor(power);
  const craze = crazeAmount(power);
  const isMax = power >= MAX_LEVEL;
  skull.boneMaterial.color.copy(color);
  const emissiveStrength = power <= 5 ? 0 : Math.min((power - 5) / 24, 0.35);
  skull.boneMaterial.emissive.copy(color).multiplyScalar(emissiveStrength);

  const setGrowth = (objects, amount, baseScale = 1) => {
    for (const object of objects) {
      object.visible = amount > 0;
      object.scale.setScalar(Math.max(amount, 0.001) * baseScale);
    }
  };

  const growth = Math.min(power / MAX_LEVEL, 1);
  skull.skullGroup.scale.setScalar(0.78 + growth * 0.3);

  const frontHorn = growIn(power, 6, 14) * (1 + Math.max(power - 14, 0) * 0.03);
  setGrowth(skull.frontHorns, frontHorn);
  setGrowth(skull.cheekSpikes, growIn(power, 9, 16));
  setGrowth(skull.crossBones, growIn(power, 10, 18) * (1 + growth * 0.25));
  setGrowth(skull.ramHorns, growIn(power, 15, 24) * (1 + Math.max(power - 24, 0) * 0.03));
  setGrowth(skull.tusks, growIn(power, 19, 25));
  skull.collar.visible = power >= 21;
  skull.collar.scale.setScalar(Math.max(growIn(power, 21, 28), 0.001));
  skull.thirdEye.visible = power >= 23;
  skull.thirdEyeSocket.visible = power >= 23;
  skull.rayGroup.visible = power >= 27;
  skull.rayGroup.scale.setScalar(Math.max(growIn(power, 27, MAX_LEVEL) * (isMax ? 1.25 : 1), 0.001));
  skull.orbitGroup.visible = power >= 29;
  skull.fireRing.visible = power >= 33;

  const crownCount =
    power >= 30 ? 9 : power >= 25 ? 7 : power >= 21 ? 5 : power >= 17 ? 3 : 0;
  skull.crownSpikes.forEach((spike, index) => {
    spike.visible = index < crownCount;
    spike.scale.setScalar(1 + growth * 0.8 + (index === 0 ? 0.4 : 0));
  });

  const crackCount = power >= 4 ? Math.min(1 + Math.floor((power - 4) / 5), skull.cracks.length) : 0;
  skull.cracks.forEach((crack, index) => {
    crack.visible = index < crackCount;
  });
  skull.crackMaterial.color.set(craze > 0 ? 0xff4a1a : 0x0a0a10);

  for (const glow of skull.eyeGlows) {
    glow.visible = power >= 13;
  }
  skull.haloMaterial.opacity = isMax ? 0.85 : 0.5;
}

class FlameField {
  constructor(mesh) {
    this.mesh = mesh;
    this.particles = [];
    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3();
    this.color = new THREE.Color();
    this.hot = new THREE.Color(0xfff1a8);
  }

  emit(x, y, z, options) {
    if (this.particles.length >= FLAME_CAPACITY) {
      return;
    }
    this.particles.push({
      x,
      y,
      z,
      vx: options.vx ?? (Math.random() - 0.5) * 0.3,
      vy: options.vy ?? 0.9 + Math.random() * 0.6,
      vz: options.vz ?? 0.1,
      life: options.life,
      maxLife: options.life,
      size: options.size,
      color: options.color,
    });
  }

  update(delta) {
    const colors = this.mesh.instanceColor.array;
    let index = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= delta;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.z += particle.vz * delta;
      const progress = 1 - particle.life / particle.maxLife;
      const size = particle.size * (1 - progress * 0.85);
      this.matrix.compose(
        this.position.set(particle.x, particle.y, particle.z),
        this.quaternion.setFromAxisAngle(UP, progress * 3),
        this.scale.set(size, size * 1.4, size)
      );
      this.mesh.setMatrixAt(index, this.matrix);
      this.color.copy(this.hot).lerp(particle.color, Math.min(progress * 1.6, 1)).multiplyScalar(1.6 * (1 - progress));
      colors[index * 3] = this.color.r;
      colors[index * 3 + 1] = this.color.g;
      colors[index * 3 + 2] = this.color.b;
      index += 1;
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

export default function DifficultySkull({
  power = 0,
  progress = power,
  size = 96,
  style,
}) {
  const RING_THICKNESS = Math.max(Math.round(size / 14), 5);
  const canvasRef = useRef(null);
  const powerRef = useRef(power);
  const skullRef = useRef(null);

  useEffect(() => {
    powerRef.current = power;
  }, [power]);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.35);
    rim.position.set(-3, 1, -2);
    scene.add(rim);
    const underLight = new THREE.PointLight(0xff3a1a, 0, 6);
    underLight.position.set(0, -1, 1.5);
    scene.add(underLight);

    const skull = buildSkull();
    scene.add(skull.root);
    skullRef.current = skull;
    applyPower(skull, powerRef.current);
    const flames = new FlameField(skull.flames);
    const flameColor = new THREE.Color(0xff3a1a);
    let flameTimer = 0;
    let framing = 3.3;

    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const currentPower = powerRef.current;
      const craze = crazeAmount(currentPower);
      const isMax = currentPower >= MAX_LEVEL;
      const growth = Math.min(currentPower / MAX_LEVEL, 1);

      const targetFraming = 3.3 + growth * 1.3 + (isMax ? 0.3 : 0);
      framing += (targetFraming - framing) * Math.min(delta * 3, 1);
      camera.position.set(0, 0.2, framing);
      camera.lookAt(0, 0.12, 0);

      skull.root.position.y = Math.sin(t * 1.6) * 0.045;
      skull.root.rotation.y = Math.sin(t * 0.7) * 0.16 + Math.sin(t * 21) * 0.05 * craze;
      skull.root.rotation.x = Math.sin(t * 24.5) * 0.04 * craze;
      skull.root.rotation.z = Math.sin(t * 18) * 0.04 * craze;

      const breathe = 0.05 + Math.max(Math.sin(t * 1.3), 0) * 0.06;
      const chatter = Math.abs(Math.sin(t * 16)) * 0.5 * craze;
      skull.jawPivot.rotation.x = breathe + chatter;

      const flicker = 0.8 + 0.2 * Math.sin(t * (6 + craze * 18)) * (0.5 + craze * 0.5);
      skull.glowMaterial.color.set(0xff2020).multiplyScalar(flicker * (isMax ? 1.4 : 1));
      const glowScale = 1 + 0.2 * Math.sin(t * 5) + craze * 0.5;
      for (const glow of skull.eyeGlows) {
        glow.scale.setScalar(glowScale);
      }
      skull.thirdEye.scale.set(0.8 * glowScale, 1.1 * glowScale, 0.8);

      if (craze > 0) {
        const heat = 0.6 + Math.sin(t * 7) * 0.4;
        skull.crackMaterial.color.setRGB(1, 0.25 + heat * 0.3, 0.05).multiplyScalar(0.7 + heat * 0.6);
      }

      skull.rayGroup.rotation.z += delta * (0.3 + craze * 1.2);
      skull.fireRing.rotation.z -= delta * 2;
      skull.haloMaterial.opacity = (isMax ? 0.7 : 0.4) + Math.sin(t * 9) * 0.15;
      skull.fireRing.scale.setScalar(1 + Math.sin(t * 6) * 0.05);

      const orbitSpeed = 1.2 + craze * 2.5 + (isMax ? 2 : 0);
      skull.orbiters.forEach((bone, index) => {
        const angle = t * orbitSpeed + bone.userData.phase;
        bone.position.set(Math.cos(angle) * 1.05, 0.2 + Math.sin(angle * 2 + index) * 0.25, Math.sin(angle) * 0.6);
        bone.rotation.set(angle * 2, angle, Math.PI / 4);
      });

      underLight.intensity = isMax ? 2.5 + Math.sin(t * 8) * 1 : craze * 1.5;

      flameColor.set(isMax ? 0xff2a0a : 0xff4a1a);
      flameTimer -= delta;
      if (craze > 0 && flameTimer <= 0) {
        flameTimer = isMax ? 0.012 : 0.05 - craze * 0.03;
        const scale = skull.skullGroup.scale.x;
        for (const side of [-1, 1]) {
          flames.emit(side * 0.21 * scale, 0.22 * scale, 0.5 * scale, {
            vx: side * 0.15,
            vy: 1 + Math.random() * 0.5,
            life: 0.45 + Math.random() * 0.25,
            size: 0.07 + craze * 0.05,
            color: flameColor,
          });
        }
        if (isMax) {
          const angle = Math.random() * Math.PI * 2;
          flames.emit(Math.cos(angle) * 0.5 * scale, 0.35 * scale + Math.random() * 0.4, Math.sin(angle) * 0.35 * scale, {
            vy: 1.2 + Math.random() * 0.8,
            life: 0.6 + Math.random() * 0.4,
            size: 0.1 + Math.random() * 0.08,
            color: flameColor,
          });
        }
      }
      flames.update(delta);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      skull.dispose();
      renderer.dispose();
      skullRef.current = null;
    };
  }, [size]);

  useEffect(() => {
    if (skullRef.current) {
      applyPower(skullRef.current, power);
    }
  }, [power]);

  const lapProgress = Math.min(Math.max(progress - power, 0), 1);
  const ringColor = getDifficultyColorStyle(power);
  const isMaxed = lapProgress >= 0.985;
  const craze = crazeAmount(power);
  const isMaxLevel = power >= MAX_LEVEL;
  const wrapperSize = size + RING_THICKNESS * 2;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        width: `${wrapperSize}px`,
        height: `${wrapperSize}px`,
        pointerEvents: "none",
        zIndex: 15,
        ...style,
      }}
    >
      <style>{`
        @keyframes skull-ring-pulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px currentColor); }
          50% { opacity: 0.6; filter: drop-shadow(0 0 12px currentColor); }
        }
        @keyframes skull-max-aura {
          0%, 100% { box-shadow: 0 0 18px 4px rgba(255, 40, 10, 0.75), 0 0 40px 10px rgba(255, 90, 20, 0.35); }
          50% { box-shadow: 0 0 28px 8px rgba(255, 60, 10, 0.95), 0 0 60px 18px rgba(255, 120, 30, 0.5); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: isMaxLevel
            ? "conic-gradient(#ff2a0a, #ff9a2a, #ff2a0a, #7a0a0a, #ff2a0a)"
            : `conic-gradient(${ringColor} ${lapProgress * 360}deg, rgba(255,255,255,0.12) ${lapProgress * 360}deg 360deg)`,
          color: ringColor,
          animation: isMaxLevel
            ? "skull-max-aura 1.1s ease-in-out infinite"
            : isMaxed
              ? "skull-ring-pulse 1.4s ease-in-out infinite"
              : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${RING_THICKNESS}px`,
          borderRadius: "50%",
          background: isMaxLevel
            ? "radial-gradient(circle at 50% 60%, #3a0806 0%, #120204 70%)"
            : "#08080e",
          boxShadow:
            craze > 0
              ? `0 0 ${10 + craze * 22}px rgba(255, 20, 20, ${0.25 + craze * 0.4}) inset, 0 0 ${6 + craze * 14}px rgba(255, 20, 20, ${0.2 + craze * 0.35})`
              : "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: `${RING_THICKNESS}px`,
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    </div>
  );
}
