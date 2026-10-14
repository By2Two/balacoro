import * as THREE from "three";
import { valueNoise2D } from "./WorldNoise.js";

const DISPLAY_SIZE = 46;
const TRANSITION_SECONDS = 1.4;
const STAR_COUNT = 14;

const SUN_DAWN = new THREE.Color(0xff8a2a);
const SUN_NOON = new THREE.Color(0xfff2a0);
const MOON_LIGHT = new THREE.Color(0xdfe8ff);
const BLOOD_LIGHT = new THREE.Color(0xff3a2a);

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.55)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function craterGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const vertex = new THREE.Vector3();
  const craters = [
    [0.4, 0.5, 0.75, 0.32],
    [-0.3, 0.2, 0.93, 0.22],
    [0.1, -0.55, 0.83, 0.26],
    [0.7, -0.2, 0.68, 0.18],
    [-0.6, -0.4, 0.7, 0.2],
    [-0.2, 0.75, 0.62, 0.15],
  ].map(([x, y, z, radius]) => ({ center: new THREE.Vector3(x, y, z).normalize(), radius }));

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).normalize();
    let height = 1 + (valueNoise2D(vertex.x * 6 + vertex.z * 3, vertex.y * 6, 77) - 0.5) * 0.04;
    let shade = 0.82 + valueNoise2D(vertex.x * 9, vertex.y * 9 + vertex.z * 4, 31) * 0.18;
    for (const crater of craters) {
      const distance = vertex.distanceTo(crater.center);
      if (distance < crater.radius) {
        const t = distance / crater.radius;
        height -= (1 - t * t) * 0.07;
        shade *= 0.72 + t * 0.28;
      } else if (distance < crater.radius * 1.25) {
        height += 0.015;
        shade *= 1.06;
      }
    }
    vertex.multiplyScalar(height);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade * 1.04;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export class DayNightBadge {
  constructor(container) {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      top: "5px",
      right: "5px",
      width: `${DISPLAY_SIZE}px`,
      height: `${DISPLAY_SIZE}px`,
      zIndex: "20",
      pointerEvents: "none",
    });
    container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(DISPLAY_SIZE, DISPLAY_SIZE, false);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    this.camera.position.set(0, 0, 6.2);

    this.glowMap = glowTexture();
    this.disposables = [this.glowMap];
    this.time = 0;
    this.blend = 0;
    this.targetBlend = 0;
    this.initialized = false;

    this._buildSun();
    this._buildMoon();
  }

  _track(object) {
    this.disposables.push(object);
    return object;
  }

  _buildSun() {
    const sun = new THREE.Group();
    this.sunCoreMaterial = this._track(new THREE.MeshBasicMaterial({ color: 0xfff6d0 }));
    const core = new THREE.Mesh(this._track(new THREE.SphereGeometry(0.62, 24, 16)), this.sunCoreMaterial);
    sun.add(core);

    this.sunCoronaMaterial = this._track(
      new THREE.MeshBasicMaterial({
        color: 0xffc040,
        transparent: true,
        opacity: 0.45,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.sunCorona = new THREE.Mesh(this._track(new THREE.SphereGeometry(0.78, 24, 16)), this.sunCoronaMaterial);
    sun.add(this.sunCorona);

    this.sunRayMaterial = this._track(
      new THREE.MeshBasicMaterial({
        color: 0xffc040,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    const rayShape = new THREE.Shape();
    rayShape.moveTo(-0.13, 0);
    rayShape.lineTo(0.13, 0);
    rayShape.lineTo(0, 0.5);
    rayShape.closePath();
    const rayGeometry = this._track(new THREE.ShapeGeometry(rayShape));
    this.sunRays = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const ray = new THREE.Mesh(rayGeometry, this.sunRayMaterial);
      const length = i % 2 === 0 ? 1 : 0.65;
      ray.position.set(Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, -0.05);
      ray.rotation.z = angle - Math.PI / 2;
      ray.scale.set(1, length, 1);
      this.sunRays.add(ray);
    }
    sun.add(this.sunRays);

    this.sunGlowMaterial = this._track(
      new THREE.SpriteMaterial({
        map: this.glowMap,
        color: 0xffb040,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.sunGlow = new THREE.Sprite(this.sunGlowMaterial);
    this.sunGlow.scale.setScalar(3.4);
    this.sunGlow.position.z = -0.3;
    sun.add(this.sunGlow);

    this.sun = sun;
    this.scene.add(sun);
  }

  _buildMoon() {
    const moon = new THREE.Group();
    this.moonMaterial = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xe8ecf5,
        vertexColors: true,
        roughness: 0.95,
        flatShading: false,
      })
    );
    this.moonMesh = new THREE.Mesh(this._track(craterGeometry()), this.moonMaterial);
    this.moonMesh.scale.setScalar(0.72);
    this.moonMesh.rotation.set(0.3, -0.4, 0.1);
    moon.add(this.moonMesh);

    this.moonLight = new THREE.DirectionalLight(0xdfe8ff, 3.2);
    this.moonLight.position.set(-3, 0.8, -1.4);
    moon.add(this.moonLight);
    this.earthshine = new THREE.AmbientLight(0x6070a0, 0.12);
    moon.add(this.earthshine);

    this.moonGlowMaterial = this._track(
      new THREE.SpriteMaterial({
        map: this.glowMap,
        color: 0x8fb0ff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.moonGlow = new THREE.Sprite(this.moonGlowMaterial);
    this.moonGlow.scale.setScalar(2.9);
    this.moonGlow.position.z = -0.6;
    moon.add(this.moonGlow);

    const starPositions = new Float32Array(STAR_COUNT * 3);
    this.starPhases = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = (i / STAR_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 1.05 + Math.random() * 0.55;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = Math.sin(angle) * radius;
      starPositions[i * 3 + 2] = -0.8;
      this.starPhases.push(Math.random() * Math.PI * 2);
    }
    const starGeometry = this._track(new THREE.BufferGeometry());
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    this.starColors = new Float32Array(STAR_COUNT * 3);
    starGeometry.setAttribute("color", new THREE.BufferAttribute(this.starColors, 3));
    this.starMaterial = this._track(
      new THREE.PointsMaterial({
        size: 0.11,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.stars = new THREE.Points(starGeometry, this.starMaterial);
    moon.add(this.stars);

    this.moon = moon;
    this.scene.add(moon);
  }

  update(delta, { isNight, isFullMoon, dayProgress }) {
    this.time += delta;
    this.targetBlend = isNight ? 1 : 0;
    if (!this.initialized) {
      this.initialized = true;
      this.blend = this.targetBlend;
    }
    const step = delta / TRANSITION_SECONDS;
    this.blend += Math.max(Math.min(this.targetBlend - this.blend, step), -step);
    const sunVisibility = 1 - this.blend;
    const moonVisibility = this.blend;
    const time = this.time;

    this.sun.visible = sunVisibility > 0.01;
    this.sun.position.y = -1.8 * (1 - sunVisibility);
    this.sun.scale.setScalar(0.6 + sunVisibility * 0.4);
    const warmth = THREE.MathUtils.clamp(dayProgress * 2.2, 0, 1);
    const sunColor = SUN_DAWN.clone().lerp(SUN_NOON, warmth);
    this.sunCoreMaterial.color.copy(sunColor).lerp(new THREE.Color(0xffffff), 0.45);
    this.sunCoronaMaterial.color.copy(sunColor);
    this.sunCoronaMaterial.opacity = (0.35 + Math.sin(time * 2.4) * 0.12) * sunVisibility;
    this.sunCorona.scale.setScalar(1 + Math.sin(time * 2.4) * 0.05);
    this.sunRayMaterial.color.copy(sunColor);
    this.sunRayMaterial.opacity = 0.85 * sunVisibility;
    this.sunRays.rotation.z = time * 0.35;
    this.sunRays.scale.setScalar(1 + Math.sin(time * 3.1) * 0.06);
    this.sunGlowMaterial.color.copy(sunColor);
    this.sunGlowMaterial.opacity = (0.7 + Math.sin(time * 1.7) * 0.1) * sunVisibility;

    this.moon.visible = moonVisibility > 0.01;
    this.moon.position.y = 1.8 * (1 - moonVisibility);
    this.moon.scale.setScalar(0.6 + moonVisibility * 0.4);
    this.moonMesh.rotation.y = -0.4 + Math.sin(time * 0.3) * 0.08;
    const lightColor = isFullMoon ? BLOOD_LIGHT : MOON_LIGHT;
    this.moonLight.color.copy(lightColor);
    this.moonLight.intensity = (isFullMoon ? 3.8 : 3.2) * moonVisibility;
    this.moonMaterial.color.set(isFullMoon ? 0xff9a8a : 0xe8ecf5);
    this.earthshine.color.set(isFullMoon ? 0x7a2020 : 0x6070a0);
    this.earthshine.intensity = (isFullMoon ? 0.22 : 0.12) * moonVisibility;
    this.moonGlowMaterial.color.set(isFullMoon ? 0xff2a1a : 0x8fb0ff);
    this.moonGlowMaterial.opacity =
      (isFullMoon ? 0.65 + Math.sin(time * 3) * 0.2 : 0.4 + Math.sin(time * 1.2) * 0.05) *
      moonVisibility;
    for (let i = 0; i < STAR_COUNT; i++) {
      const twinkle = Math.max(Math.sin(time * 2.2 + this.starPhases[i]), 0) * moonVisibility;
      this.starColors[i * 3] = twinkle * (isFullMoon ? 1 : 0.85);
      this.starColors[i * 3 + 1] = twinkle * (isFullMoon ? 0.45 : 0.9);
      this.starColors[i * 3 + 2] = twinkle * (isFullMoon ? 0.4 : 1);
    }
    this.stars.geometry.getAttribute("color").needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const item of this.disposables) {
      item.dispose();
    }
    this.renderer.dispose();
    this.canvas.remove();
  }
}
