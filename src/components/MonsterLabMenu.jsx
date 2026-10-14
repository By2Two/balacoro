import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MENU_CSS } from "./MenuStage.jsx";
import {
  generateGenome,
  buildMonsterBody,
  animateMonsterParts,
  getBodyMaterial,
  eyeDayMaterial,
  eyeNightMaterial,
  ARCHETYPE_NAMES,
  DIFFICULTY_COLOR_MAX_LEVEL,
  MOUTH_TYPES,
  EYE_STYLES,
  PATTERN_TYPES,
} from "../objects/MonsterGenome.js";
import {
  buildMimicBody,
  setMimicAwakeColor,
  MIMIC_DISGUISE_COLOR,
  MIMIC_LID_DISGUISE_COLOR,
} from "../objects/Mimic.js";
import { SKULL_CRAZE_START } from "../objects/MonsterGenome.js";
import DifficultySkull from "./DifficultySkull.jsx";
import {
  BOSS_SIZE_MULTIPLIER,
  BOSS_HEALTH_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER,
  BOSS_XP_MULTIPLIER,
  BOSS_SPECIAL_COOLDOWN,
  BOSS_SPECIAL_RANGE,
  BOSS_TELEGRAPH_TIME,
  BOSS_CHARGE_TIME,
  BOSS_CHARGE_SPEED_MULTIPLIER,
  BOSS_SUMMON_COUNT,
  MIMIC_HEALTH_MULTIPLIER,
  MIMIC_COIN_MULTIPLIER,
  MIMIC_WAKE_DISTANCE,
  FULL_MOON_SPEED_MULTIPLIER,
  FULL_MOON_DAMAGE_MULTIPLIER,
  FULL_MOON_SPAWN_MULTIPLIER,
  FULL_MOON_COIN_MULTIPLIER,
} from "../constants.js";

const PIXEL_SCALE = 3;
const STAGE_X = 2.2;

const eliteAuraGeometry = new THREE.SphereGeometry(0.72, 12, 10);
const eliteAuraMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd23e,
  transparent: true,
  opacity: 0.16,
  side: THREE.BackSide,
  depthWrite: false,
});

const MONSTER_TYPES = [
  { id: "enemy", label: "ENEMY" },
  { id: "boss", label: "BOSS" },
  { id: "mimic", label: "MIMIC" },
  { id: "skull", label: "SKULL" },
];

const BEAM_HEIGHT = 4.6;

function disposeMonster(monster) {
  monster.coreGeometry.dispose();
  for (const geometry of monster.ownedGeometries ?? []) {
    geometry.dispose();
  }
  monster.material.dispose();
  if (monster.eliteAura) {
    monster.eliteAura.material.dispose();
  }
}

const IDLE_RESUME_SECONDS = 4;

function createDragRotator(canvas, camera, getTarget) {
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const rotation = { x: 0, y: 0 };
  const state = {
    active: false,
    lastX: 0,
    lastY: 0,
    targetY: 0,
    targetX: 0,
    velocityY: 0,
    velocityX: 0,
    idleTime: IDLE_RESUME_SECONDS,
  };

  const isPointerOnTarget = (event) => {
    const target = getTarget();
    if (!target) {
      return false;
    }
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.intersectObject(target, true).length > 0;
  };

  const onPointerDown = (event) => {
    if (!isPointerOnTarget(event)) {
      return;
    }
    state.active = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.targetY = rotation.y;
    state.targetX = rotation.x;
    state.velocityY = 0;
    state.velocityX = 0;
    state.idleTime = 0;
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (event) => {
    if (state.active) {
      state.targetY += (event.clientX - state.lastX) * 0.011;
      state.targetX += (event.clientY - state.lastY) * 0.011;
      state.targetX = Math.max(Math.min(state.targetX, 1.2), -1.2);
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.idleTime = 0;
      return;
    }
    canvas.style.cursor = isPointerOnTarget(event) ? "grab" : "default";
  };

  const onPointerUp = () => {
    if (!state.active) {
      return;
    }
    state.active = false;
    state.idleTime = 0;
    canvas.style.cursor = "default";
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  const update = (delta, idle) => {
    if (state.active) {
      const pull = Math.min(delta * 5, 1);
      const previousY = rotation.y;
      const previousX = rotation.x;
      rotation.y += (state.targetY - rotation.y) * pull;
      rotation.x += (state.targetX - rotation.x) * pull;
      if (delta > 0) {
        state.velocityY = (rotation.y - previousY) / delta;
        state.velocityX = (rotation.x - previousX) / delta;
      }
      return;
    }
    state.idleTime += delta;
    const friction = Math.exp(-delta * 2.2);
    state.velocityY *= friction;
    state.velocityX *= friction;
    if (Math.abs(state.velocityY) > 0.01) {
      rotation.y += state.velocityY * delta;
    }
    if (Math.abs(state.velocityX) > 0.01) {
      rotation.x = Math.max(
        Math.min(rotation.x + state.velocityX * delta, 1.2),
        -1.2
      );
    }
    if (state.idleTime >= IDLE_RESUME_SECONDS) {
      idle(rotation, delta);
    }
  };

  const dispose = () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  return { rotation, update, dispose };
}

function nextOption(options, current) {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length];
}

function useStageBase() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const lightsRef = useRef(null);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
    });
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080e);
    scene.fog = new THREE.FogExp2(0x08080e, 0.045);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(0, 2.6, 7);
    camera.lookAt(1.1, 1, 0);
    cameraRef.current = camera;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(
        Math.max(Math.floor(width / PIXEL_SCALE), 1),
        Math.max(Math.floor(height / PIXEL_SCALE), 1),
        false
      );
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x14141e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const spot = new THREE.SpotLight(0xfff2c0, 4, 20, Math.PI / 7, 0.4, 0);
    spot.position.set(STAGE_X, 5.5, 0);
    spot.target.position.set(STAGE_X, 0, 0);
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);

    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);

    const rim = new THREE.DirectionalLight(0x6aa8ff, 1.6);
    rim.position.set(STAGE_X - 2.5, 3, -4);
    rim.target.position.set(STAGE_X, 0.8, 0);
    scene.add(rim);
    scene.add(rim.target);

    const fill = new THREE.DirectionalLight(0xff9a6a, 0.35);
    fill.position.set(STAGE_X + 4, 1.5, 3);
    fill.target.position.set(STAGE_X, 0.8, 0);
    scene.add(fill);
    scene.add(fill.target);

    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(2, BEAM_HEIGHT, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c0,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(STAGE_X, BEAM_HEIGHT / 2 + 0.01, 0);
    scene.add(beam);

    lightsRef.current = { spot, beam, ambient };

    return () => {
      window.removeEventListener("resize", resize);
      ground.geometry.dispose();
      ground.material.dispose();
      beam.geometry.dispose();
      beam.material.dispose();
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      lightsRef.current = null;
    };
  }, []);

  return { canvasRef, sceneRef, rendererRef, cameraRef, lightsRef };
}

function MonsterStage({ genome, difficulty, elite, redEyes, previewScale }) {
  const { canvasRef, sceneRef, rendererRef, cameraRef, lightsRef } = useStageBase();
  const monsterRef = useRef(null);
  const eliteStateRef = useRef({ hue: 0 });

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !renderer || !camera) {
      return undefined;
    }

    const rotator = createDragRotator(
      renderer.domElement,
      camera,
      () => monsterRef.current?.group
    );

    const clock = new THREE.Clock();
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;

      const monster = monsterRef.current;
      if (monster) {
        rotator.update(delta, (rotation, idleDelta) => {
          rotation.y += idleDelta * 0.6;
          rotation.x += (0 - rotation.x) * Math.min(idleDelta * 2, 1);
        });
        monster.group.rotation.set(rotator.rotation.x, rotator.rotation.y, 0);
        animateMonsterParts(monster.animatedParts, elapsedTime, 7);
        if (monster.eliteAura) {
          eliteStateRef.current.hue = (eliteStateRef.current.hue + delta * 0.35) % 1;
          monster.material.color.setHSL(eliteStateRef.current.hue, 1, 0.55);
          monster.material.emissive.setHSL(eliteStateRef.current.hue, 1, 0.35);
          monster.eliteAura.material.color.setHSL(
            (eliteStateRef.current.hue + 0.15) % 1,
            1,
            0.6
          );
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      rotator.dispose();
    };
  }, [sceneRef, rendererRef, cameraRef]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) {
      return;
    }
    if (previewScale > 1) {
      camera.position.set(0, 5.5, 16);
      camera.lookAt(1.1, 2.2, 0);
    } else {
      camera.position.set(0, 2.4, 7);
      camera.lookAt(1.1, 0.75, 0);
    }
  }, [previewScale, cameraRef]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    if (monsterRef.current) {
      scene.remove(monsterRef.current.group);
      disposeMonster(monsterRef.current);
    }

    const material = getBodyMaterial(difficulty, elite).clone();
    const body = buildMonsterBody(genome, material);

    let eliteAura = null;
    if (elite) {
      eliteAura = new THREE.Mesh(eliteAuraGeometry, eliteAuraMaterial.clone());
      body.group.add(eliteAura);
    }
    eliteStateRef.current.hue = Math.random();

    for (const eye of body.eyes) {
      eye.material = redEyes ? eyeNightMaterial : eyeDayMaterial;
    }

    const scale = genome.sizeMult * previewScale;
    const centerY = 0.46 * genome.stretch.y * scale;
    body.group.scale.set(
      genome.stretch.x * scale,
      genome.stretch.y * scale,
      genome.stretch.z * scale
    );
    body.group.position.set(STAGE_X, centerY, 0);
    scene.add(body.group);
    monsterRef.current = { ...body, material, eliteAura };

    const lights = lightsRef.current;
    if (lights) {
      const rigHeight = centerY + scale * 1.6 + 2;
      lights.spot.position.set(STAGE_X, rigHeight, 0);
      lights.spot.target.position.set(STAGE_X, centerY, 0);
      lights.spot.target.updateMatrixWorld();
      lights.spot.distance = rigHeight + scale * 4;
      const beamScale = rigHeight / BEAM_HEIGHT;
      lights.beam.scale.setScalar(beamScale);
      lights.beam.position.set(STAGE_X, rigHeight / 2 + 0.01, 0);
    }
  }, [genome, difficulty, elite, redEyes, previewScale, sceneRef, lightsRef]);

  useEffect(
    () => () => {
      const scene = sceneRef.current;
      if (scene && monsterRef.current) {
        scene.remove(monsterRef.current.group);
        disposeMonster(monsterRef.current);
      }
    },
    [sceneRef]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        touchAction: "none",
      }}
    />
  );
}

function MimicStage({ difficulty, awake }) {
  const { canvasRef, sceneRef, rendererRef, cameraRef } = useStageBase();
  const mimicRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !renderer || !camera) {
      return undefined;
    }

    const rotator = createDragRotator(
      renderer.domElement,
      camera,
      () => mimicRef.current?.group
    );

    const clock = new THREE.Clock();
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;

      const mimic = mimicRef.current;
      if (mimic) {
        rotator.update(delta, (rotation, idleDelta) => {
          if (mimic.awake) {
            const turn = Math.PI * 2;
            const sway =
              Math.round(rotation.y / turn) * turn +
              Math.sin(elapsedTime * 0.5) * 0.3;
            rotation.y += (sway - rotation.y) * Math.min(idleDelta * 2, 1);
          } else {
            rotation.y += idleDelta;
          }
          rotation.x += (0 - rotation.x) * Math.min(idleDelta * 2, 1);
        });
        mimic.group.rotation.set(rotator.rotation.x, rotator.rotation.y, 0);
        if (!mimic.awake) {
          mimic.group.position.y = 0.4 + Math.sin(elapsedTime * 2) * 0.08;
        } else {
          mimic.group.position.y = 0.4;
          mimic.lidPivot.rotation.x = -(
            0.35 + Math.abs(Math.sin(elapsedTime * 6)) * 0.55
          );
          mimic.tongue.rotation.x = 0.25 + Math.sin(elapsedTime * 9) * 0.12;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      rotator.dispose();
    };
  }, [sceneRef, rendererRef, cameraRef]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    if (mimicRef.current) {
      scene.remove(mimicRef.current.group);
      mimicRef.current.bodyMaterial.dispose();
      mimicRef.current.lidMaterial.dispose();
    }

    const body = buildMimicBody();
    body.group.position.set(STAGE_X, 0.4, 0);
    body.group.scale.setScalar(1.6);

    if (awake) {
      for (const part of body.mouthParts) {
        part.visible = true;
      }
      setMimicAwakeColor(body.bodyMaterial, body.lidMaterial, difficulty);
    } else {
      body.bodyMaterial.color.set(MIMIC_DISGUISE_COLOR);
      body.lidMaterial.color.set(MIMIC_LID_DISGUISE_COLOR);
      body.bodyMaterial.emissive.set(0x000000);
    }

    scene.add(body.group);
    mimicRef.current = { ...body, awake };
  }, [difficulty, awake, sceneRef]);

  useEffect(
    () => () => {
      const scene = sceneRef.current;
      if (scene && mimicRef.current) {
        scene.remove(mimicRef.current.group);
        mimicRef.current.bodyMaterial.dispose();
        mimicRef.current.lidMaterial.dispose();
      }
    },
    [sceneRef]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
    />
  );
}

function LabSlider({ label, value, min, max, step, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        fontSize: "9px",
        color: "#aaa",
        letterSpacing: "1px",
      }}
    >
      <span>
        {label}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: "#ffee00", width: "100%" }}
      />
    </label>
  );
}

function LabCheckbox({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "10px",
        color: "#ccc",
        letterSpacing: "1px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ accentColor: "#ffee00", width: "16px", height: "16px" }}
      />
      {label}
    </label>
  );
}

const BOSS_ARCHETYPES = ["tank", "brute"];

export default function MonsterLabMenu({ onBack }) {
  const [monsterType, setMonsterType] = useState("enemy");
  const [archetype, setArchetype] = useState(null);
  const [difficulty, setDifficulty] = useState(0);
  const [elite, setElite] = useState(false);
  const [redEyes, setRedEyes] = useState(false);
  const [bloodMoon, setBloodMoon] = useState(false);
  const [genome, setGenome] = useState(() => generateGenome(false));
  const [mimicAwake, setMimicAwake] = useState(false);
  const [skullPower, setSkullPower] = useState(0);

  const isBossType = monsterType === "boss";
  const availableArchetypes = isBossType
    ? BOSS_ARCHETYPES
    : ARCHETYPE_NAMES;

  const regenerate = (forced = archetype) => {
    setGenome(generateGenome(isBossType, forced ?? undefined));
  };

  const pickArchetypeTab = (name) => {
    const next = archetype === name ? null : name;
    setArchetype(next);
    setGenome(generateGenome(isBossType, next ?? undefined));
  };

  const switchMonsterType = (type) => {
    setMonsterType(type);
    if (type === "mimic" || type === "skull") {
      return;
    }
    setArchetype(null);
    setGenome(generateGenome(type === "boss", undefined));
    if (type === "boss") {
      setElite(false);
    }
  };

  const patchGenome = (patch) => setGenome({ ...genome, ...patch });
  const patchParts = (patch) =>
    setGenome({ ...genome, parts: { ...genome.parts, ...patch } });

  const previewScale = isBossType ? BOSS_SIZE_MULTIPLIER : 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 50,
      }}
    >
      <style>{MENU_CSS}</style>

      {monsterType === "skull" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#08080e",
          }}
        >
          <DifficultySkull
            power={skullPower}
            progress={skullPower}
            size={260}
            style={{
              bottom: "auto",
              left: "55%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      ) : monsterType === "mimic" ? (
        <MimicStage difficulty={difficulty} awake={mimicAwake} />
      ) : (
        <MonsterStage
          genome={genome}
          difficulty={difficulty}
          elite={elite && !isBossType}
          redEyes={redEyes || bloodMoon}
          previewScale={previewScale}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "3vh 4vw",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "min(2.6vw, 28px)",
            letterSpacing: "5px",
            color: "#ffee00",
            textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
            margin: "0 0 2vh",
          }}
        >
          MONSTER LAB
        </h1>

        <div
          style={{
            pointerEvents: "auto",
            alignSelf: "flex-start",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(150px, 220px))",
            columnGap: "22px",
            rowGap: "9px",
            alignContent: "start",
            alignItems: "start",
          }}
        >
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {MONSTER_TYPES.map((type) => (
              <button
                key={type.id}
                className={`tab-button${
                  monsterType === type.id ? " active" : ""
                }`}
                onClick={() => switchMonsterType(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>

          {monsterType === "skull" ? (
            <>
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: "9px",
                  color: "#888",
                  letterSpacing: "1px",
                  lineHeight: "1.8",
                  maxWidth: "460px",
                }}
              >
                The difficulty meter
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <LabSlider
                  label="SKULL POWER"
                  value={skullPower}
                  min={0}
                  max={DIFFICULTY_COLOR_MAX_LEVEL}
                  step={1}
                  onChange={setSkullPower}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  className="menu-button"
                  style={{ fontSize: "13px" }}
                  onClick={() =>
                    setSkullPower((power) => Math.max(power - 1, 0))
                  }
                >
                  &lt; PREV
                </button>
                <button
                  className="menu-button"
                  style={{ fontSize: "13px" }}
                  onClick={() =>
                    setSkullPower((power) =>
                      Math.min(power + 1, DIFFICULTY_COLOR_MAX_LEVEL)
                    )
                  }
                >
                  NEXT &gt;
                </button>
              </div>
            </>
          ) : monsterType === "mimic" ? (
            <>
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: "9px",
                  color: "#888",
                  letterSpacing: "1px",
                  lineHeight: "1.8",
                  maxWidth: "460px",
                }}
              >
                Disguised as a treasure chest until you get within{" "}
                {MIMIC_WAKE_DISTANCE} units. HP x{MIMIC_HEALTH_MULTIPLIER},
                coins x{MIMIC_COIN_MULTIPLIER}. No shape options: only its
                awakened color follows the difficulty scale.
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <LabSlider
                  label="DIFFICULTY (AWAKE COLOR)"
                  value={difficulty}
                  min={0}
                  max={DIFFICULTY_COLOR_MAX_LEVEL}
                  step={1}
                  onChange={setDifficulty}
                />
              </div>

              <button
                className="menu-button"
                style={{ gridColumn: "1 / -1", fontSize: "13px" }}
                onClick={() => setMimicAwake((wasAwake) => !wasAwake)}
              >
                {mimicAwake ? "⟲ SHOW DISGUISE" : "⚠ REVEAL MIMIC"}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {availableArchetypes.map((name) => (
                  <button
                    key={name}
                    className={`tab-button${
                      archetype === name ? " active" : ""
                    }`}
                    onClick={() => pickArchetypeTab(name)}
                  >
                    {name.toUpperCase()}
                  </button>
                ))}
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: "9px",
                  color: "#888",
                  letterSpacing: "1px",
                  lineHeight: "1.7",
                }}
              >
                TYPE: {genome.archetype.toUpperCase()} | SPD x
                {genome.speedMult.toFixed(2)} | HP x
                {genome.healthMult.toFixed(2)} | DMG x
                {genome.damageMult.toFixed(2)}
                {isBossType && (
                  <>
                    <br />
                    BOSS MULT: HP x{BOSS_HEALTH_MULTIPLIER}, DMG x
                    {BOSS_DAMAGE_MULTIPLIER}, XP x{BOSS_XP_MULTIPLIER}, SIZE x
                    {BOSS_SIZE_MULTIPLIER}
                  </>
                )}
              </div>

              {isBossType && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "9px",
                    color: "#ff8888",
                    letterSpacing: "1px",
                    lineHeight: "1.7",
                    border: "1px solid #442222",
                    padding: "6px 8px",
                  }}
                >
                  SPECIAL ABILITIES (every {BOSS_SPECIAL_COOLDOWN.min} to{" "}
                  {BOSS_SPECIAL_COOLDOWN.max}s within {BOSS_SPECIAL_RANGE}u):{" "}
                  60% CHARGE ({BOSS_TELEGRAPH_TIME}s telegraph, then{" "}
                  {BOSS_CHARGE_SPEED_MULTIPLIER}x speed dash for{" "}
                  {BOSS_CHARGE_TIME}s), 40% SUMMON ({BOSS_SUMMON_COUNT} runner
                  minions)
                </div>
              )}

              <LabSlider
                label="EYES"
                value={genome.eyeCount}
                min={1}
                max={4}
                step={1}
                onChange={(value) => patchGenome({ eyeCount: value })}
              />
              <LabSlider
                label="EYE SIZE"
                value={genome.eyeScale.toFixed(2)}
                min={0.75}
                max={1.45}
                step={0.05}
                onChange={(value) => patchGenome({ eyeScale: value })}
              />
              <LabSlider
                label="SPIKES"
                value={genome.parts.spikes}
                min={0}
                max={6}
                step={1}
                onChange={(value) => patchParts({ spikes: value })}
              />
              <LabSlider
                label="LEGS"
                value={genome.parts.legs}
                min={0}
                max={6}
                step={2}
                onChange={(value) => patchParts({ legs: value })}
              />
              <LabSlider
                label="TAIL"
                value={genome.parts.tailSegments}
                min={0}
                max={5}
                step={1}
                onChange={(value) => patchParts({ tailSegments: value })}
              />
              <LabSlider
                label="PLATES"
                value={genome.parts.plates}
                min={0}
                max={4}
                step={1}
                onChange={(value) => patchParts({ plates: value })}
              />
              <LabSlider
                label="SIZE"
                value={genome.sizeMult.toFixed(2)}
                min={0.6}
                max={1.6}
                step={0.05}
                onChange={(value) => patchGenome({ sizeMult: value })}
              />
              <LabSlider
                label="DIFFICULTY (COLOR)"
                value={difficulty}
                min={0}
                max={DIFFICULTY_COLOR_MAX_LEVEL}
                step={1}
                onChange={setDifficulty}
              />

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className={`menu-button${
                    genome.parts.horns ? " selected" : ""
                  }`}
                  style={{ fontSize: "11px" }}
                  onClick={() => patchParts({ horns: !genome.parts.horns })}
                >
                  HORNS
                </button>
                <button
                  className={`menu-button${
                    genome.parts.antennae ? " selected" : ""
                  }`}
                  style={{ fontSize: "11px" }}
                  onClick={() =>
                    patchParts({ antennae: !genome.parts.antennae })
                  }
                >
                  ANTENNAE
                </button>
                {[
                  ["arms", "ARMS"],
                  ["wings", "WINGS"],
                  ["brows", "ANGRY BROWS"],
                ].map(([part, label]) => (
                  <button
                    key={part}
                    className={`menu-button${
                      genome.parts[part] ? " selected" : ""
                    }`}
                    style={{ fontSize: "11px" }}
                    onClick={() => patchParts({ [part]: !genome.parts[part] })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["mouth", "MOUTH", MOUTH_TYPES],
                  ["eyeStyle", "EYES", EYE_STYLES],
                  ["pattern", "SKIN", PATTERN_TYPES],
                ].map(([part, label, options]) => (
                  <button
                    key={part}
                    className="menu-button"
                    style={{ fontSize: "11px" }}
                    onClick={() =>
                      patchParts({
                        [part]: nextOption(options, genome.parts[part] ?? options[0]),
                      })
                    }
                  >
                    {label}: {(genome.parts[part] ?? options[0]).toUpperCase()}
                  </button>
                ))}
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "26px",
                  flexWrap: "wrap",
                  marginTop: "2px",
                }}
              >
                {!isBossType && (
                  <LabCheckbox
                    label="ELITE (rainbow, x5 HP)"
                    checked={elite}
                    onChange={setElite}
                  />
                )}
                <LabCheckbox
                  label="RED EYES (night / mist)"
                  checked={redEyes}
                  onChange={setRedEyes}
                />
                <LabCheckbox
                  label="BLOOD MOON"
                  checked={bloodMoon}
                  onChange={setBloodMoon}
                />
              </div>

              {bloodMoon && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "9px",
                    color: "#ff6666",
                    letterSpacing: "1px",
                    lineHeight: "1.7",
                    border: "1px solid #551111",
                    padding: "6px 8px",
                  }}
                >
                  BLOOD MOON FRENZY: SPD x{FULL_MOON_SPEED_MULTIPLIER}, DMG x
                  {FULL_MOON_DAMAGE_MULTIPLIER}, SPAWN RATE x
                  {FULL_MOON_SPAWN_MULTIPLIER}, COINS x
                  {FULL_MOON_COIN_MULTIPLIER}, RED EYES
                </div>
              )}

              <button
                className="menu-button"
                style={{ gridColumn: "1 / -1", fontSize: "15px", color: "#ffee00" }}
                onClick={() => regenerate()}
              >
                ⟳ GENERATE
              </button>
            </>
          )}

          <button
            className="menu-button"
            style={{ gridColumn: "1 / -1", fontSize: "12px" }}
            onClick={onBack}
          >
            &lt; BACK
          </button>
        </div>
      </div>
    </div>
  );
}
