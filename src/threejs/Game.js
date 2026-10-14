import * as THREE from "three";
import { MainScene } from "../scenes/MainScene";
import { Minimap } from "../core/Minimap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { ColorGradingShader } from "../core/ColorGradingShader.js";
import { disposeKillEffects } from "../core/killEffects.js";
import { disposePowerFx } from "../core/powerFx.js";
import { DayNightBadge } from "../core/DayNightBadge.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setFloatingTextCamera } from "../components/createFloatingText.js";
import { isDebugMode } from "../core/debug.js";
import { audio } from "../core/AudioEngine.js";
import { setNightLights } from "../core/biomes/lightMaterials.js";
import { DIFFICULTY_COLOR_MAX_LEVEL } from "../objects/MonsterGenome.js";
import {
  DAY_DURATION,
  NIGHT_DURATION,
  ENABLE_MINI_VIEW,
  FULL_MOON_NIGHT_INTERVAL,
  DEFAULT_FOG_DENSITY,
  MIST_FOG_DENSITY,
  MIST_CHECK_INTERVAL,
  MIST_CHANCE,
  MIST_DURATION,
  RAIN_CHECK_INTERVAL,
  RAIN_CHANCE,
  RAIN_DURATION,
  WEATHER_FADE_SPEED,
  SWAMP_FOG_DENSITY,
  VOLCANIC_FOG_DENSITY,
  TONE_MAPPING_EXPOSURE,
  SUN_INTENSITY,
  DAY_AMBIENT,
  MOON_LIGHT,
  NIGHT_AMBIENT,
  BLOOM_ENABLED,
  BLOOM_RADIUS,
  BLOOM_STRENGTH,
  BLOOM_THRESHOLD,
  GRADING_SATURATION,
  GRADING_CONTRAST,
  GRADING_VIGNETTE,
  GRADING_MIST_SATURATION,
  GRADING_TINTS,
} from "../constants";

const TOTAL_CYCLE = DAY_DURATION + NIGHT_DURATION;
const MOON_DIRECTION = new THREE.Vector3(-0.35, 0.82, 0.45).normalize();
const TWILIGHT_BLEND = 0.3;
const MIN_SUN_LIGHT_ELEVATION = 25;
const ETERNAL_BLOOD_MOON_DIFFICULTY = DIFFICULTY_COLOR_MAX_LEVEL + 5;

export class Game {
  constructor(container, savedRun = null) {
    this.container = container;
    this.savedRun = savedRun;
    this.startTime = Date.now() - (DAY_DURATION / 2) * 1000;
    this.totalElapsedTime = DAY_DURATION / 2;
    this.lastFrameTime = Date.now();
    this.init();
  }

  createSaveSnapshot() {
    return {
      scene: this.scene.createSnapshot(),
      game: {
        totalElapsedTime: this.totalElapsedTime,
        nightCount: this.nightCount ?? 0,
        bloodMoonEnded: this.bloodMoonEnded === true,
        weather: { ...this.weatherState },
        music: audio.getMusicSnapshot(),
      },
    };
  }

  init() {
    this.initRenderer();
    this.initSceneAndCamera();
    this.bloodMoonEnded = false;
    if (this.savedRun) {
      this.scene.restoreSnapshot(this.savedRun.scene);
      this.totalElapsedTime =
        this.savedRun.game?.totalElapsedTime ?? this.totalElapsedTime;
      this.nightCount = this.savedRun.game?.nightCount ?? 0;
      this.bloodMoonEnded = this.savedRun.game?.bloodMoonEnded === true;
      const cycleProgress =
        (this.totalElapsedTime % TOTAL_CYCLE) / TOTAL_CYCLE;
      this._wasNight = cycleProgress >= DAY_DURATION / TOTAL_CYCLE;
      const music = this.savedRun.game?.music;
      if (music?.name) {
        audio.primeResume(music.name, music.offset ?? 0);
      }
    }
    this.initLights();
    this.initSky();
    this.initPostProcessing();
    this.initInteraction();
    this.initDayNightIcon();
    this.initMinimap();
    this.initWeather();
    this._restoreWeather(this.savedRun?.game?.weather);
    audio.onMusicEnded = (name) => {
      if (name === "musicBloodMoon") {
        this.bloodMoonEnded = true;
      }
    };
    if (ENABLE_MINI_VIEW) {
      this.initMiniView();
    }
    this.animate();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE.noon;
    this.container.appendChild(this.renderer.domElement);
  }

  initSceneAndCamera() {
    this.scene = new MainScene();
    this.scene.fog = new THREE.FogExp2(0xb3b3b3, 0.01);
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 10);
    setFloatingTextCamera(this.camera);
  }

  initLights() {
    this.sunHorizonColor = new THREE.Color(0xff8c42);
    this.sunNoonColor = new THREE.Color(0xfff6e8);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0001;

    const shadowCamera = this.sunLight.shadow.camera;
    shadowCamera.left = -60;
    shadowCamera.right = 60;
    shadowCamera.top = 60;
    shadowCamera.bottom = -60;
    shadowCamera.near = 1;
    shadowCamera.far = 500;

    this.sunLight.target = new THREE.Object3D();
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambientLight);

    this.sun = new THREE.Vector3();
    this.sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    this.scene.add(this.sunSphere);
  }

  initSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const uniforms = this.sky.material.uniforms;
    uniforms["turbidity"].value = 10;
    uniforms["rayleigh"].value = 3;
    uniforms["mieCoefficient"].value = 0.005;
    uniforms["mieDirectionalG"].value = 0.7;

    this.updateSunPosition(0);
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPixelatedPass = new RenderPixelatedPass(
      3,
      this.scene,
      this.camera
    );
    this.renderPixelatedPass.normalEdgeStrength = 0.3;
    this.renderPixelatedPass.depthEdgeStrength = 0.2;
    this.composer.addPass(this.renderPixelatedPass);

    if (BLOOM_ENABLED) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(
          this.container.clientWidth,
          this.container.clientHeight
        ),
        BLOOM_STRENGTH.noon,
        BLOOM_RADIUS,
        BLOOM_THRESHOLD.noon
      );
      this.composer.addPass(this.bloomPass);
    }

    this.composer.addPass(new OutputPass());

    this.gradingPass = new ShaderPass(ColorGradingShader);
    this.gradingPass.uniforms.uSaturation.value = GRADING_SATURATION;
    this.gradingPass.uniforms.uContrast.value = GRADING_CONTRAST;
    this.gradingPass.uniforms.uVignette.value = GRADING_VIGNETTE;
    this.composer.addPass(this.gradingPass);

    this._gradingShadowTarget = new THREE.Vector3();
    this._gradingHighlightTarget = new THREE.Vector3();
  }

  _updatePostProcessing(smoothProgress, deltaSeconds) {
    this.renderer.toneMappingExposure =
      THREE.MathUtils.lerp(
        TONE_MAPPING_EXPOSURE.night,
        TONE_MAPPING_EXPOSURE.noon,
        smoothProgress
      ) * (this.scene.screenExposure ?? 1);

    if (this.bloomPass) {
      this.bloomPass.strength = THREE.MathUtils.lerp(
        BLOOM_STRENGTH.night,
        BLOOM_STRENGTH.noon,
        smoothProgress
      );
      this.bloomPass.threshold = THREE.MathUtils.lerp(
        BLOOM_THRESHOLD.night,
        BLOOM_THRESHOLD.noon,
        smoothProgress
      );
    }

    const uniforms = this.gradingPass.uniforms;
    const tints = this.isNight
      ? this.isFullMoon
        ? GRADING_TINTS.bloodmoon
        : GRADING_TINTS.night
      : GRADING_TINTS.day;
    this._gradingShadowTarget.fromArray(tints.shadow);
    this._gradingHighlightTarget.fromArray(tints.highlight);

    const blend =
      deltaSeconds > 0 ? Math.min(deltaSeconds * 0.5, 1) : 0;
    if (this._gradingInitialized) {
      uniforms.uShadowTint.value.lerp(this._gradingShadowTarget, blend);
      uniforms.uHighlightTint.value.lerp(this._gradingHighlightTarget, blend);
    } else {
      this._gradingInitialized = true;
      uniforms.uShadowTint.value.copy(this._gradingShadowTarget);
      uniforms.uHighlightTint.value.copy(this._gradingHighlightTarget);
    }

    const saturationTarget = this.weatherState?.mistActive
      ? GRADING_MIST_SATURATION
      : GRADING_SATURATION;
    uniforms.uSaturation.value +=
      (saturationTarget - uniforms.uSaturation.value) * blend;
  }

  initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._aimPoint = new THREE.Vector3();
    this.hasMouseAim = false;

    this.container.addEventListener("pointermove", this.onMouseMove);
    window.addEventListener("resize", this.onWindowResize);
  }

  initMiniView() {
    this.isMiniViewVisible = false;

    this.miniCanvas = document.createElement("canvas");
    Object.assign(this.miniCanvas.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      width: "200px",
      height: "200px",
      border: "1px solid #ccc",
      zIndex: "10",
      display: "none",
    });
    this.container.appendChild(this.miniCanvas);

    this.miniRenderer = new THREE.WebGLRenderer({
      canvas: this.miniCanvas,
      antialias: true,
      alpha: true,
    });
    this.miniRenderer.setSize(200, 200);
    this.miniRenderer.shadowMap.enabled = true;

    this.miniCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.miniCamera.position.set(20, 20, 20);
    this.miniCamera.lookAt(0, 0, 0);

    this.miniControls = new OrbitControls(this.miniCamera, this.miniCanvas);
    this.miniControls.enablePan = true;
    this.miniControls.enableZoom = true;
    this.miniControls.enableRotate = true;

    window.addEventListener("keydown", this.onMiniViewKeyDown);
  }

  onMiniViewKeyDown = (event) => {
    if (event.code === "Digit1" && isDebugMode()) {
      this.isMiniViewVisible = !this.isMiniViewVisible;
      this.miniCanvas.style.display = this.isMiniViewVisible ? "block" : "none";
    }
  };

  initMinimap() {
    this.minimap = new Minimap(this.container);
  }

  _randRange(range) {
    return range.min + Math.random() * (range.max - range.min);
  }

  initWeather() {
    this.defaultFogColor = new THREE.Color(0xb3b3b3);
    this.mistFogColor = new THREE.Color(0x9aa8b0);
    this.bloodFogColor = new THREE.Color(0x401015);

    this.weatherState = {
      mistActive: false,
      mistTimer: this._randRange(MIST_CHECK_INTERVAL),
      rainActive: false,
      rainTimer: this._randRange(RAIN_CHECK_INTERVAL),
    };

    const makePoints = (count, color, size, options = {}) => {
      const positions = new Float32Array(count * 3);
      const colors = options.palette ? new Float32Array(count * 3) : null;
      const paletteColor = new THREE.Color();
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = Math.random() * 25;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        if (colors) {
          paletteColor.set(
            options.palette[Math.floor(Math.random() * options.palette.length)]
          );
          colors[i * 3] = paletteColor.r;
          colors[i * 3 + 1] = paletteColor.g;
          colors[i * 3 + 2] = paletteColor.b;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      if (colors) {
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      }
      const material = new THREE.PointsMaterial({
        color: colors ? 0xffffff : color,
        size,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        vertexColors: Boolean(colors),
        blending: options.additive
          ? THREE.AdditiveBlending
          : THREE.NormalBlending,
      });
      const points = new THREE.Points(geometry, material);
      points.visible = false;
      points.frustumCulled = false;
      return points;
    };

    this.rainPoints = makePoints(600, 0x88aaff, 0.12);
    this.snowPoints = makePoints(450, 0xffffff, 0.22);
    this.rainBaseOpacity = this.rainPoints.material.opacity;
    this.snowBaseOpacity = this.snowPoints.material.opacity;
    this.rainOpacity = 0;
    this.snowOpacity = 0;

    this.biomeParticles = [
      {
        points: makePoints(350, 0x7a7474, 0.18),
        fall: 1.6,
        drift: 1,
        weight: (weights) => weights.volcanic,
      },
      {
        points: makePoints(160, 0xff7a2a, 0.16, { additive: true }),
        fall: -1.8,
        drift: 0.6,
        weight: (weights) => weights.volcanic,
      },
      {
        points: makePoints(180, 0, 0.26, {
          palette: [0xd9822b, 0xc0392b, 0xe5b33a, 0xa8541c],
        }),
        fall: 1.4,
        drift: 2.2,
        weight: (weights) => weights.autumn,
      },
      {
        points: makePoints(220, 0, 0.15, {
          additive: true,
          palette: [0x5ff3ff, 0xff5fe0, 0xa36bff, 0xffffff],
        }),
        fall: -0.6,
        drift: 0.8,
        weight: (weights) => weights.crystal,
      },
      {
        points: makePoints(180, 0xb8ff7a, 0.12, { additive: true }),
        fall: -0.3,
        drift: 1.2,
        weight: (weights) => weights.swamp,
      },
    ];
    for (const layer of this.biomeParticles) {
      layer.baseOpacity = layer.points.material.opacity;
      layer.opacity = 0;
    }

    this.swampFogColor = new THREE.Color(0x6f7d62);
    this.volcanicFogColor = new THREE.Color(0x4a3028);
    this.targetFogColor = new THREE.Color();

    this.weatherGroup = new THREE.Group();
    this.weatherGroup.add(
      this.rainPoints,
      this.snowPoints,
      ...this.biomeParticles.map((layer) => layer.points)
    );
    this.scene.add(this.weatherGroup);
  }

  _restoreWeather(saved) {
    if (!saved) {
      return;
    }
    const state = this.weatherState;
    for (const key of ["mistActive", "rainActive"]) {
      if (typeof saved[key] === "boolean") {
        state[key] = saved[key];
      }
    }
    for (const key of ["mistTimer", "rainTimer"]) {
      if (Number.isFinite(saved[key])) {
        state[key] = saved[key];
      }
    }
    this.scene.isMist = state.mistActive;
    if (state.mistActive) {
      this.scene._mistAnnounced = true;
      this.scene.fog.density = MIST_FOG_DENSITY;
      this.scene.fog.color.copy(this.mistFogColor);
    }
  }

  updateWeather(deltaSeconds) {
    if (deltaSeconds <= 0) {
      return;
    }

    const player = this.scene.player;
    this.weatherGroup.position.set(player.position.x, 0, player.position.z);

    const state = this.weatherState;
    if (this.isNight && state.mistActive) {
      state.mistActive = false;
      state.mistTimer = this._randRange(MIST_CHECK_INTERVAL);
    }
    state.mistTimer -= deltaSeconds;
    if (state.mistTimer <= 0) {
      if (this.isNight) {
        state.mistTimer = this._randRange(MIST_CHECK_INTERVAL);
      } else if (state.mistActive) {
        state.mistActive = false;
        state.mistTimer = this._randRange(MIST_CHECK_INTERVAL);
      } else if (Math.random() < MIST_CHANCE) {
        state.mistActive = true;
        state.mistTimer = this._randRange(MIST_DURATION);
      } else {
        state.mistTimer = this._randRange(MIST_CHECK_INTERVAL);
      }
    }
    this.scene.isMist = state.mistActive;

    state.rainTimer -= deltaSeconds;
    if (state.rainTimer <= 0) {
      if (state.rainActive) {
        state.rainActive = false;
        state.rainTimer = this._randRange(RAIN_CHECK_INTERVAL);
      } else if (Math.random() < RAIN_CHANCE) {
        state.rainActive = true;
        state.rainTimer = this._randRange(RAIN_DURATION);
      } else {
        state.rainTimer = this._randRange(RAIN_CHECK_INTERVAL);
      }
    }

    const weights = this.scene.tileManager?.getSmoothBiomeWeights(
      player.position.x,
      player.position.z
    ) ?? { forest: 0, snow: 0, desert: 0 };
    this.biomeWeights = weights;

    const rainTarget = state.rainActive
      ? Math.min(
          (weights.forest ?? 0) +
            (weights.autumn ?? 0) +
            (weights.swamp ?? 0),
          1
        )
      : 0;
    const snowTarget = weights.snow;
    const fadeStep = Math.min(deltaSeconds * WEATHER_FADE_SPEED, 1);
    this.rainOpacity += (rainTarget - this.rainOpacity) * fadeStep;
    this.snowOpacity += (snowTarget - this.snowOpacity) * fadeStep;

    const raining = this.rainOpacity > 0.02;
    const snowing = this.snowOpacity > 0.02;
    this.rainPoints.visible = raining;
    this.snowPoints.visible = snowing;
    this.rainPoints.material.opacity = this.rainOpacity * this.rainBaseOpacity;
    this.snowPoints.material.opacity = this.snowOpacity * this.snowBaseOpacity;

    if (raining) {
      this._dropPoints(this.rainPoints, 24 * deltaSeconds, 0);
    }
    if (snowing) {
      this._dropPoints(this.snowPoints, 3.5 * deltaSeconds, deltaSeconds);
    }

    for (const layer of this.biomeParticles) {
      const target = Math.min(layer.weight(weights) ?? 0, 1);
      layer.opacity += (target - layer.opacity) * fadeStep;
      const visible = layer.opacity > 0.02;
      layer.points.visible = visible;
      layer.points.material.opacity = layer.opacity * layer.baseOpacity;
      if (visible) {
        this._dropPoints(
          layer.points,
          layer.fall * deltaSeconds,
          deltaSeconds * layer.drift
        );
      }
    }

    const swampWeight = weights.swamp ?? 0;
    const volcanicWeight = weights.volcanic ?? 0;
    const fog = this.scene.fog;
    const targetDensity = state.mistActive
      ? MIST_FOG_DENSITY
      : Math.max(
          DEFAULT_FOG_DENSITY,
          DEFAULT_FOG_DENSITY +
            (SWAMP_FOG_DENSITY - DEFAULT_FOG_DENSITY) * swampWeight +
            (VOLCANIC_FOG_DENSITY - DEFAULT_FOG_DENSITY) * volcanicWeight
        );
    fog.density += (targetDensity - fog.density) * Math.min(deltaSeconds, 1);

    const targetColor = state.mistActive
      ? this.mistFogColor
      : this.isFullMoon && this.isNight
        ? this.bloodFogColor
        : this.targetFogColor
            .copy(this.defaultFogColor)
            .lerp(this.swampFogColor, swampWeight)
            .lerp(this.volcanicFogColor, volcanicWeight);
    fog.color.lerp(targetColor, Math.min(deltaSeconds, 1));
  }

  _syncAudio(deltaSeconds) {
    audio.setListenerPosition(this.scene.player.position);
    audio.update(deltaSeconds);

    const phase = this.isNight
      ? this.isFullMoon
        ? "bloodmoon"
        : "night"
      : "day";
    if (phase !== this._audioPhase) {
      const isFirstSync = this._audioPhase === undefined;
      const previousPhase = this._audioPhase;
      this._audioPhase = phase;

      if (phase === "day") {
        if (!isFirstSync) {
          audio.play("eventDay");
        }
        if (previousPhase === "bloodmoon") {
          this.scene.onBloodMoonSurvived?.();
        }
        audio.playMusic("musicDay");
      } else if (phase === "night") {
        if (previousPhase !== "bloodmoon") {
          audio.play("eventNightfall");
        }
        audio.playMusic("musicNight");
      } else {
        audio.play("eventBloodMoon");
        audio.playMusic("musicBloodMoon");
      }

      audio.setScheduler("ambienceNight", phase === "night");
      audio.setScheduler("ambienceBloodmoon", phase === "bloodmoon");
      audio.setScheduler("creepyEffectBloodmoon", phase === "bloodmoon");
    }

    const mistActive = this.weatherState.mistActive;
    if (mistActive !== this._audioMist) {
      this._audioMist = mistActive;
      if (mistActive) {
        audio.play("eventMist");
        audio.startLoop("ambienceMist");
        audio.duckMusic(true);
      } else {
        audio.stopLoop("ambienceMist");
        audio.duckMusic(false);
      }
      audio.setScheduler("creepyEffectMist", mistActive);
    }

    const raining = this.rainOpacity > 0.05;
    if (raining) {
      audio.startLoop("ambienceRain");
      audio.setLoopVolume("ambienceRain", this.rainOpacity);
    } else {
      audio.stopLoop("ambienceRain");
    }
    audio.setScheduler("thunder", raining);

    const snowing = this.snowOpacity > 0.05;
    if (snowing) {
      audio.startLoop("ambienceSnowWind");
      audio.setLoopVolume("ambienceSnowWind", this.snowOpacity);
    } else {
      audio.stopLoop("ambienceSnowWind");
    }
    audio.setScheduler("snowWindGust", snowing);

    audio.setScheduler(
      "desertWind",
      (this.biomeWeights?.desert ?? 0) > 0.4
    );

    const weights = this.biomeWeights ?? {};
    const biomeLoops = [
      ["ambienceSwamp", weights.swamp ?? 0],
      ["ambienceVolcanic", weights.volcanic ?? 0],
      ["ambienceCrystal", weights.crystal ?? 0],
      ["ambienceAutumn", weights.autumn ?? 0],
      ["ambienceForestDay", this.isNight ? 0 : weights.forest ?? 0],
    ];
    for (const [loopName, weight] of biomeLoops) {
      if (weight > 0.05) {
        audio.startLoop(loopName);
        audio.setLoopVolume(loopName, Math.min(weight, 1));
      } else {
        audio.stopLoop(loopName);
      }
    }
    audio.setScheduler("swampFrog", (weights.swamp ?? 0) > 0.4);
    audio.setScheduler("lavaBubble", (weights.volcanic ?? 0) > 0.4);
    audio.setScheduler("volcanicRumble", (weights.volcanic ?? 0) > 0.4);
    audio.setScheduler("crystalChime", (weights.crystal ?? 0) > 0.4);
  }

  _dropPoints(points, fallStep, driftDelta) {
    const positions = points.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - fallStep;
      if (y < 0) {
        y += 25;
      } else if (y > 25) {
        y -= 25;
      }
      positions.setY(i, y);
      if (driftDelta > 0) {
        positions.setX(
          i,
          positions.getX(i) + Math.sin(y * 2 + i) * driftDelta
        );
      }
    }
    positions.needsUpdate = true;
  }

  initDayNightIcon() {
    this.dayNightBadge = new DayNightBadge(this.container);
  }

  updateSunPosition(elapsedSeconds) {
    const dayRatio = DAY_DURATION / TOTAL_CYCLE;
    const cycleProgress = (elapsedSeconds % TOTAL_CYCLE) / TOTAL_CYCLE;
    const isDay = cycleProgress < dayRatio;
    const dayProgress = isDay ? cycleProgress / dayRatio : 0;
    const smoothProgress = isDay ? Math.sin(dayProgress * Math.PI) : 0;

    const elevation = smoothProgress * 75;
    this.isNight = smoothProgress === 0;
    setNightLights(this.isNight);

    if (this.isNight && !this._wasNight) {
      this.nightCount = (this.nightCount ?? 0) + 1;
      if (this.nightCount === 1) {
        this.scene.onFirstNightfall?.();
      }
    }
    this._wasNight = this.isNight;
    if (!this.isNight) {
      this.bloodMoonEnded = false;
    }
    const eternalBloodMoon =
      (this.scene.currentDifficulty ?? 0) >= ETERNAL_BLOOD_MOON_DIFFICULTY;
    this.isFullMoon =
      this.isNight &&
      (eternalBloodMoon ||
        (!this.bloodMoonEnded &&
          (this.nightCount ?? 0) > 0 &&
          this.nightCount % FULL_MOON_NIGHT_INTERVAL === 0));
    this.scene.isFullMoon = this.isFullMoon;

    let hours;
    if (isDay) {
      hours = 6 + dayProgress * 12;
    } else {
      const nightProgress = (cycleProgress - dayRatio) / (1 - dayRatio);
      hours = (18 + nightProgress * 12) % 24;
    }
    const hh = Math.floor(hours);
    const mm = Math.floor((hours - hh) * 60);
    this.clockText = `${String(hh).padStart(2, "0")}:${String(mm).padStart(
      2,
      "0"
    )}`;

    const azimuthDegrees = 90 + dayProgress * 180;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuthDegrees);

    this.sun.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);

    const playerPosition = this.scene?.player?.position;
    const anchor = playerPosition ?? new THREE.Vector3();
    if (!this._lightDirection) {
      this._lightDirection = new THREE.Vector3();
      this._lightingSun = new THREE.Vector3();
      this._nightLightColor = new THREE.Color();
      this._dayLightColor = new THREE.Color();
      this._nightAmbientColor = new THREE.Color();
    }
    const twilight = this.isNight
      ? 0
      : THREE.MathUtils.smoothstep(smoothProgress, 0, TWILIGHT_BLEND);
    this._lightingSun.setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - Math.max(elevation, MIN_SUN_LIGHT_ELEVATION)),
      theta
    );
    const lightDirection = this._lightDirection
      .copy(MOON_DIRECTION)
      .lerp(this._lightingSun, twilight)
      .normalize();
    this.sunLight.position
      .copy(anchor)
      .addScaledVector(lightDirection, 150);
    this.sunLight.target.position.copy(anchor);
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.updateMatrixWorld(true);

    this.sunSphere.position.copy(anchor).addScaledVector(this.sun, 5000);

    this.sunLight.visible = true;
    this._nightLightColor.setHex(
      this.isFullMoon ? MOON_LIGHT.bloodColor : MOON_LIGHT.color
    );
    this._nightAmbientColor.setHex(
      this.isFullMoon ? NIGHT_AMBIENT.bloodColor : NIGHT_AMBIENT.color
    );
    this._dayLightColor.lerpColors(
      this.sunHorizonColor,
      this.sunNoonColor,
      Math.min(smoothProgress * 1.8, 1)
    );
    const dayIntensity = THREE.MathUtils.lerp(
      SUN_INTENSITY.horizon,
      SUN_INTENSITY.noon,
      smoothProgress
    );
    const dayAmbient = THREE.MathUtils.lerp(
      DAY_AMBIENT.horizon,
      DAY_AMBIENT.noon,
      smoothProgress
    );
    this.sunLight.intensity = THREE.MathUtils.lerp(
      MOON_LIGHT.intensity,
      dayIntensity,
      twilight
    );
    this.sunLight.color.lerpColors(
      this._nightLightColor,
      this._dayLightColor,
      twilight
    );
    this.ambientLight.intensity = THREE.MathUtils.lerp(
      NIGHT_AMBIENT.intensity,
      dayAmbient,
      twilight
    );
    this.ambientLight.color.lerpColors(
      this._nightAmbientColor,
      this._dayLightColor.clone().lerp(new THREE.Color(0xffffff), 0.7),
      twilight
    );
    this.sunSmoothProgress = smoothProgress;

  }

  onMouseMove = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.hasMouseAim = true;
    this._updateMouseAim();
  };

  _updateMouseAim() {
    if (!this.hasMouseAim) {
      return;
    }
    const player = this.scene.player;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (
      this.raycaster.ray.intersectPlane(this.groundPlane, this._aimPoint)
    ) {
      player.aimWorldPoint = (player.aimWorldPoint ?? new THREE.Vector3()).copy(
        this._aimPoint
      );
      this._aimPoint.sub(player.position).setY(0);
      if (this._aimPoint.lengthSq() > 0.0001) {
        player.lastDirection.copy(this._aimPoint.normalize());
      }
    }
  }

  animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.scene.update(this.camera);
    if (!this.scene.isPaused) {
      this._updateMouseAim();
    }
    const now = Date.now();
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (!this.scene.isPaused) {
      this.totalElapsedTime += deltaMs / 1000;
    }

    this.updateSunPosition(this.totalElapsedTime);
    this.dayNightBadge?.update(Math.min(deltaMs / 1000, 0.1), {
      isNight: this.isNight,
      isFullMoon: this.isFullMoon,
      dayProgress: this.sunSmoothProgress ?? 1,
    });
    this.scene.isNight = this.isNight;
    this.updateWeather(this.scene.isPaused ? 0 : deltaMs / 1000);
    this._updatePostProcessing(
      this.sunSmoothProgress ?? 1,
      this.scene.isPaused ? 0 : deltaMs / 1000
    );
    this._syncAudio(this.scene.isPaused ? 0 : deltaMs / 1000);
    this.minimap.update(
      this.scene.player,
      this.scene.enemies,
      this.scene.items,
      this.scene.tileManager
    );
    if (ENABLE_MINI_VIEW && this.isMiniViewVisible) {
      this.miniRenderer.render(this.scene, this.miniCamera);
    }
    this.composer.render();
  };

  onWindowResize = () => {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.composer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
  };

  dispose() {
    audio.onMusicEnded = null;
    audio.stopAll();
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.onWindowResize);
    this.container.removeEventListener("pointermove", this.onMouseMove);
    if (ENABLE_MINI_VIEW) {
      window.removeEventListener("keydown", this.onMiniViewKeyDown);
    }
    this.minimap.dispose();
    this.dayNightBadge?.dispose();
    disposeKillEffects(this.scene);
    disposePowerFx(this.scene);
    this.scene.player?.trailEmitter?.dispose();
    this.bloomPass?.dispose();
    this.gradingPass?.dispose();
    if (this.weatherGroup) {
      for (const points of [
        this.rainPoints,
        this.snowPoints,
        ...this.biomeParticles.map((layer) => layer.points),
      ]) {
        points.geometry.dispose();
        points.material.dispose();
      }
    }
    if (this.miniRenderer) {
      this.miniRenderer.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement
        );
      }
    }
  }

  isCurrentlyNight() {
    return this.isNight;
  }
}
