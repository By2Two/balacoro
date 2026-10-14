import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createPlayerAvatar } from "../core/playerAvatar.js";
import { TrailEmitter, getTrailDefinitions } from "../core/trails.js";
import { getCenteredShotGeometry, SHOT_SPIN } from "../core/shotShapes.js";
import {
  spawnKillEffect,
  updateKillEffects,
  disposeKillEffects,
} from "../core/killEffects.js";
import { DEFAULT_CUSTOMIZATION } from "../core/customization.js";

const PIXEL_SCALE = 3;
const CUBE_X = 2.2;
const CUBE_Y = 0.8;
const IDLE_RESUME_SECONDS = 4;
const TRAIL_WIND = new THREE.Vector3(2.4, 0, 0);
const BASE_CAMERA = new THREE.Vector3(0, 2.6, 7);
const BASE_TARGET = new THREE.Vector3(1.1, 1, 0);
const FOCUS_TARGET = new THREE.Vector3(CUBE_X, 0.95, 0);
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.25;
const KILL_DEMO_INTERVAL = 2.4;
const DASH_DEMO_INTERVAL = 3.6;
const KILL_DEMO_POSITION = new THREE.Vector3(CUBE_X + 1.7, 0.1, 0.9);

export const MENU_CSS = `
  .menu-button {
    background: transparent;
    border: none;
    color: #ccc;
    font-family: inherit;
    font-size: 18px;
    text-align: left;
    letter-spacing: 2px;
    cursor: pointer;
    padding: 8px 0;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .menu-button:hover:not(:disabled) {
    color: #ffee00;
    transform: translateX(10px);
    text-shadow: 0 0 12px rgba(255, 238, 0, 0.6);
  }
  .menu-button:disabled {
    color: #444;
    cursor: default;
  }
  .menu-button.selected {
    color: #ffee00;
  }
  .tab-button {
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #888;
    font-family: inherit;
    font-size: 13px;
    letter-spacing: 2px;
    cursor: pointer;
    padding: 8px 2px;
    transition: color 0.15s ease;
  }
  .tab-button:hover {
    color: #fff;
  }
  .tab-button.active {
    color: #ffee00;
    border-bottom-color: #ffee00;
  }
  .swatch {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s ease, border-color 0.1s ease;
  }
  .swatch:hover {
    transform: scale(1.15);
  }
  .swatch.selected {
    border-color: #fff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }
`;

function structureKeyOf(look) {
  return [
    look.skin ?? "plain",
    look.eyes ?? "bead",
    look.brows ?? "none",
    (look.accessories ?? []).join(","),
  ].join("|");
}

export default function MenuStage({
  customization = DEFAULT_CUSTOMIZATION,
  showcase = false,
}) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const lookRef = useRef(customization);
  const showcaseRef = useRef(showcase);

  useEffect(() => {
    lookRef.current = customization;
    showcaseRef.current = showcase;
  }, [customization, showcase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080e);
    scene.fog = new THREE.FogExp2(0x08080e, 0.045);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.copy(BASE_CAMERA);
    camera.lookAt(BASE_TARGET);

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

    const holder = new THREE.Group();
    holder.position.set(CUBE_X, CUBE_Y, 0);
    scene.add(holder);
    const offset = new THREE.Group();
    offset.position.y = -0.35;
    holder.add(offset);

    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shieldMaterial);
    shield.scale.setScalar(1.3);
    shield.visible = false;
    holder.add(shield);

    const shotMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    const shot = new THREE.Mesh(getCenteredShotGeometry("box"), shotMaterial);
    shot.userData.shape = "box";
    scene.add(shot);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x14141e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const spot = new THREE.SpotLight(0xfff2c0, 4, 20, Math.PI / 7, 0.4, 0);
    spot.position.set(CUBE_X, 5.5, 0);
    spot.target = holder;
    spot.castShadow = true;
    scene.add(spot);

    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    const rim = new THREE.DirectionalLight(0x6aa8ff, 1.1);
    rim.position.set(CUBE_X - 2.5, 3, -4);
    rim.target = holder;
    scene.add(rim);

    const beamHeight = 4.6;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(2, beamHeight, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c0,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(CUBE_X, beamHeight / 2 + 0.01, 0);
    scene.add(beam);

    const stage = {
      scene,
      offset,
      shot,
      shotMaterial,
      shield,
      avatar: null,
      trail: null,
      structureKey: null,
      trailKey: null,
      ghosts: [],
    };
    stageRef.current = stage;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const dragState = {
      active: false,
      lastX: 0,
      lastY: 0,
      targetY: 0,
      targetX: 0,
      velocityY: 0,
      velocityX: 0,
    };
    let idleTime = IDLE_RESUME_SECONDS;
    let zoomTarget = 1;
    let zoom = 1;

    const isPointerOnAvatar = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      return raycaster.intersectObject(offset, true).length > 0;
    };

    const onPointerDown = (event) => {
      if (!isPointerOnAvatar(event)) {
        return;
      }
      dragState.active = true;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.targetY = holder.rotation.y;
      dragState.targetX = holder.rotation.x;
      dragState.velocityY = 0;
      dragState.velocityX = 0;
      idleTime = 0;
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (event) => {
      if (dragState.active) {
        dragState.targetY += (event.clientX - dragState.lastX) * 0.011;
        dragState.targetX += (event.clientY - dragState.lastY) * 0.011;
        dragState.targetX = Math.max(Math.min(dragState.targetX, 1.2), -1.2);
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;
        idleTime = 0;
        return;
      }
      renderer.domElement.style.cursor = isPointerOnAvatar(event)
        ? "grab"
        : "default";
    };

    const onPointerUp = () => {
      if (!dragState.active) {
        return;
      }
      dragState.active = false;
      idleTime = 0;
      renderer.domElement.style.cursor = "default";
    };

    const onWheel = (event) => {
      event.preventDefault();
      zoomTarget = THREE.MathUtils.clamp(
        zoomTarget * (event.deltaY > 0 ? 1.1 : 0.9),
        ZOOM_MIN,
        ZOOM_MAX
      );
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    const cameraTarget = new THREE.Vector3();
    const orbitVelocity = new THREE.Vector3();
    const holderWorld = new THREE.Vector3();
    const dashFrom = new THREE.Vector3();
    let killTimer = 0.8;
    let dashTimer = 1.6;
    let animationFrameId;

    const spawnDashGhosts = (color) => {
      for (let index = 0; index < 3; index++) {
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.25 + index * 0.08,
          depthWrite: false,
        });
        const ghost = new THREE.Mesh(stage.avatar.mesh.geometry, material);
        ghost.position.set(
          CUBE_X - 1.6 + index * 0.5,
          holder.position.y,
          0
        );
        ghost.rotation.copy(holder.rotation);
        scene.add(ghost);
        stage.ghosts.push({ mesh: ghost, life: 0.35, maxLife: 0.35 });
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.elapsedTime;
      const look = lookRef.current;

      if (dragState.active) {
        const pull = Math.min(delta * 5, 1);
        const previousY = holder.rotation.y;
        const previousX = holder.rotation.x;
        holder.rotation.y += (dragState.targetY - holder.rotation.y) * pull;
        holder.rotation.x += (dragState.targetX - holder.rotation.x) * pull;
        if (delta > 0) {
          dragState.velocityY = (holder.rotation.y - previousY) / delta;
          dragState.velocityX = (holder.rotation.x - previousX) / delta;
        }
      } else {
        idleTime += delta;
        const friction = Math.exp(-delta * 2.2);
        dragState.velocityY *= friction;
        dragState.velocityX *= friction;
        if (Math.abs(dragState.velocityY) > 0.01) {
          holder.rotation.y += dragState.velocityY * delta;
        }
        if (Math.abs(dragState.velocityX) > 0.01) {
          holder.rotation.x = Math.max(
            Math.min(holder.rotation.x + dragState.velocityX * delta, 1.2),
            -1.2
          );
        }
        if (idleTime >= IDLE_RESUME_SECONDS) {
          holder.rotation.y += delta * 0.9;
          holder.rotation.x += (0 - holder.rotation.x) * Math.min(delta * 2, 1);
        }
      }
      holder.position.y = CUBE_Y + Math.sin(elapsedTime * 1.6) * 0.1;
      stage.avatar?.update(delta, { moving: false });

      const orbitAngle = elapsedTime * 1.8;
      shot.position.set(
        CUBE_X + Math.cos(orbitAngle) * 1.4,
        1 + Math.sin(elapsedTime * 2.7) * 0.2,
        Math.sin(orbitAngle) * 1.4
      );
      const shape = shot.userData.shape;
      if (shape === "arrow") {
        orbitVelocity.set(-Math.sin(orbitAngle), 0, Math.cos(orbitAngle));
        shot.rotation.set(0, Math.atan2(orbitVelocity.x, orbitVelocity.z), 0);
      } else if (SHOT_SPIN[shape]) {
        shot.rotation.y += delta * SHOT_SPIN[shape];
      } else {
        shot.rotation.x += delta * 3;
        shot.rotation.y += delta * 2;
      }

      if (look.shieldColor != null) {
        shield.visible = true;
        shieldMaterial.color.set(look.shieldColor);
        shieldMaterial.opacity = 0.3 + Math.sin(elapsedTime * 3) * 0.12;
        shield.position.y = stage.avatar
          ? stage.avatar.body.position.y
          : 0;
      } else {
        shield.visible = false;
      }

      holder.getWorldPosition(holderWorld);
      stage.trail?.update(delta, holderWorld, true);

      if (showcaseRef.current) {
        killTimer -= delta;
        if (killTimer <= 0) {
          killTimer = KILL_DEMO_INTERVAL;
          spawnKillEffect(scene, KILL_DEMO_POSITION, look.killEffect ?? "pixels", {
            color: 0xff4d4d,
            size: 1,
          });
        }
        dashTimer -= delta;
        if (dashTimer <= 0 && stage.avatar) {
          dashTimer = DASH_DEMO_INTERVAL;
          spawnDashGhosts(look.dashColor ?? look.color);
          stage.avatar.impulse(0.3);
          dashFrom.copy(holderWorld).setX(holderWorld.x - 1.6);
          stage.trail?.burst(dashFrom, holderWorld);
        }
      }
      updateKillEffects(scene, delta);

      for (let index = stage.ghosts.length - 1; index >= 0; index--) {
        const ghost = stage.ghosts[index];
        ghost.life -= delta;
        if (ghost.life <= 0) {
          scene.remove(ghost.mesh);
          ghost.mesh.material.dispose();
          stage.ghosts.splice(index, 1);
          continue;
        }
        ghost.mesh.material.opacity = 0.45 * (ghost.life / ghost.maxLife);
        ghost.mesh.scale.setScalar(1 + (1 - ghost.life / ghost.maxLife) * 0.25);
      }

      zoom += (zoomTarget - zoom) * Math.min(delta * 8, 1);
      const focus = THREE.MathUtils.clamp((1 - zoom) / (1 - ZOOM_MIN), 0, 1);
      cameraTarget.lerpVectors(BASE_TARGET, FOCUS_TARGET, focus);
      camera.position
        .copy(BASE_CAMERA)
        .sub(BASE_TARGET)
        .multiplyScalar(zoom)
        .add(cameraTarget);
      camera.lookAt(cameraTarget);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      stage.avatar?.dispose();
      stage.trail?.dispose();
      for (const ghost of stage.ghosts) {
        ghost.mesh.material.dispose();
      }
      disposeKillEffects(scene);
      stageRef.current = null;
      shotMaterial.dispose();
      shield.geometry.dispose();
      shieldMaterial.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      beam.geometry.dispose();
      beam.material.dispose();
      renderer.dispose();
    };
  }, []);

  const structureKey = structureKeyOf(customization);
  const trailKey = (customization.accessories ?? []).join("|");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const look = lookRef.current;

    if (stage.structureKey !== structureKey) {
      stage.structureKey = structureKey;
      if (stage.avatar) {
        stage.offset.remove(stage.avatar.body);
        stage.avatar.dispose();
      }
      stage.avatar = createPlayerAvatar(look);
      stage.offset.add(stage.avatar.body);
    }

    if (stage.trailKey !== trailKey) {
      stage.trailKey = trailKey;
      stage.trail?.dispose();
      stage.trail = new TrailEmitter(
        stage.scene,
        getTrailDefinitions(look.accessories ?? []),
        { wind: TRAIL_WIND }
      );
    }
  }, [structureKey, trailKey]);

  const color = customization.color;
  const projectileColor = customization.projectileColor;
  const shotShape = customization.shotShape ?? "box";

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    stage.avatar?.setColor(color);
    stage.shotMaterial.color.set(projectileColor ?? 0x00ff00);
    stage.shotMaterial.emissive.set(projectileColor ?? 0x00ff00);
    if (stage.shot.userData.shape !== shotShape) {
      stage.shot.userData.shape = shotShape;
      stage.shot.geometry = getCenteredShotGeometry(shotShape);
      stage.shot.rotation.set(0, 0, 0);
    }
  }, [color, projectileColor, shotShape, structureKey]);

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
