import * as THREE from "three";
import {
  BOSS_SIZE_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER,
  BOSS_XP_MULTIPLIER,
  ELITE_CHANCE,
  ELITE_HEALTH_MULTIPLIER,
  ELITE_DAMAGE_MULTIPLIER,
  ELITE_SIZE_MULTIPLIER,
  ELITE_SPEED_MULTIPLIER,
  ELITE_XP_MULTIPLIER,
  ELITE_COIN_MULTIPLIER,
  ENEMY_DEATH_DURATION,
  ENEMY_FLASH_DURATION,
  BOSS_SPECIAL_COOLDOWN,
  BOSS_SPECIAL_RANGE,
  BOSS_TELEGRAPH_TIME,
  BOSS_CHARGE_TIME,
  BOSS_CHARGE_SPEED_MULTIPLIER,
  CRITICAL_FLASH_DURATION,
  CRITICAL_FLASH_COLOR,
  CRITICAL_PUNCH_SCALE,
  FULL_MOON_SPEED_MULTIPLIER,
  ENEMY_WALK_ANIMATION,
  POST_MAX_ELITE_CHANCE_PER_LEVEL,
  ELITE_SWIFT_SPEED_MULTIPLIER,
  SPLITTER_SPAWN_GRACE,
  BOMBER_FUSE_TIME,
  PLAYER_RADIUS,
  STALKER_REVEAL_DISTANCE,
  STALKER_RECLOAK_DISTANCE,
  STALKER_CLOAK_OPACITY,
  STALKER_HIT_REVEAL_TIME,
  STALKER_LUNGE_TIME,
  STALKER_LUNGE_SPEED_MULTIPLIER,
  STALKER_WHISPER_DISTANCE,
  MORTAR_RANGE,
  MORTAR_MIN_DISTANCE,
  MORTAR_FIRE_INTERVAL,
  MORTAR_WINDUP_TIME,
} from "../constants.js";
import {
  pickEliteModifier,
  getMaxShield,
  absorbDamage,
  rechargeShield,
  regenerateHealth,
  canSplit,
  shouldArmBomber,
  getBlastRadius,
} from "./enemyTraits.js";
import { fxSystem, spread } from "../core/powerFx.js";
import {
  generateGenome,
  buildMonsterBody,
  animateMonsterParts,
  getBodyMaterial,
  eyeDayMaterial,
  eyeNightMaterial,
  DIFFICULTY_COLOR_MAX_LEVEL,
} from "./MonsterGenome.js";
import { audio } from "../core/AudioEngine.js";
import { spawnKillEffect } from "../core/killEffects.js";

const freezeGeometry = new THREE.SphereGeometry(1, 16, 16);

const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const criticalFlashMaterial = new THREE.MeshBasicMaterial({
  color: CRITICAL_FLASH_COLOR,
});
const freezeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});
const chargeIndicatorGeometry = new THREE.PlaneGeometry(1, 1);
chargeIndicatorGeometry.rotateX(-Math.PI / 2);
chargeIndicatorGeometry.translate(0, 0, 0.5);
const collisionBoxCenter = new THREE.Vector3();
const collisionBoxSize = new THREE.Vector3();
const KNOCKBACK_DECAY = 10;
const toTarget = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const PATH_CHECK_INTERVAL = 0.25;
const KILL_EFFECT_SOUNDS = {
  confetti: "killConfetti",
  hearts: "killHearts",
  explosion: "killExplosion",
};
const DIRECT_PATH_LOOKAHEAD = 12;
const ENEMY_TURN_RATE = 9;
const eliteAuraGeometry = new THREE.SphereGeometry(0.72, 12, 10);
const eliteAuraMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd23e,
  transparent: true,
  opacity: 0.16,
  side: THREE.BackSide,
  depthWrite: false,
});
const ELITE_MODIFIER_COLORS = {
  shield: 0x59c8ff,
  swift: 0xffe14a,
  regen: 0x5dff7a,
};
const shieldBubbleGeometry = new THREE.IcosahedronGeometry(0.85, 1);
const shieldEdgesGeometry = new THREE.EdgesGeometry(shieldBubbleGeometry);
const modifierIconMaterials = new Map();
const blastRingGeometry = new THREE.RingGeometry(0.9, 1, 40);
blastRingGeometry.rotateX(-Math.PI / 2);
const blastDiscGeometry = new THREE.CircleGeometry(1, 40);
blastDiscGeometry.rotateX(-Math.PI / 2);
const bomberFlashMaterial = new THREE.MeshBasicMaterial({ color: 0xff3020 });
const MORTAR_RECOIL_TIME = 0.4;
const MORTAR_REST_TILT = 0.5;
const MORTAR_AIM_TILT = 0.22;
const muzzlePosition = new THREE.Vector3();

function randomInRange({ min, max }) {
  return min + Math.random() * (max - min);
}

function drawModifierIcon(ctx, modifier, color) {
  ctx.fillStyle = "rgba(10, 12, 20, 0.75)";
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  if (modifier === "shield") {
    ctx.moveTo(32, 12);
    ctx.lineTo(48, 18);
    ctx.quadraticCurveTo(48, 42, 32, 52);
    ctx.quadraticCurveTo(16, 42, 16, 18);
    ctx.closePath();
  } else if (modifier === "swift") {
    ctx.moveTo(36, 10);
    ctx.lineTo(18, 36);
    ctx.lineTo(30, 36);
    ctx.lineTo(26, 54);
    ctx.lineTo(46, 26);
    ctx.lineTo(34, 26);
    ctx.closePath();
  } else {
    ctx.rect(27, 14, 10, 36);
    ctx.rect(14, 27, 36, 10);
  }
  ctx.fill();
}

function getModifierIconMaterial(modifier) {
  let material = modifierIconMaterials.get(modifier);
  if (!material) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const color = `#${new THREE.Color(ELITE_MODIFIER_COLORS[modifier]).getHexString()}`;
    drawModifierIcon(canvas.getContext("2d"), modifier, color);
    material = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    });
    modifierIconMaterials.set(modifier, material);
  }
  return material;
}

export class Enemy extends THREE.Object3D {
  constructor(
    target,
    spawnPosition,
    speed = 4,
    health = 1,
    difficulty = 0,
    isBoss = false,
    forcedArchetype = undefined,
    savedState = null
  ) {
    super();
    this.target = target;
    this.genome = savedState?.genome ?? generateGenome(isBoss, forcedArchetype);
    const eliteChance =
      ELITE_CHANCE +
      Math.max(difficulty - DIFFICULTY_COLOR_MAX_LEVEL, 0) *
        POST_MAX_ELITE_CHANCE_PER_LEVEL;
    this.isElite = savedState
      ? savedState.isElite === true
      : !isBoss && Math.random() < eliteChance;
    this.eliteModifier = this.isElite
      ? savedState?.eliteModifier ?? pickEliteModifier()
      : null;
    this.canSummon = savedState?.canSummon ?? true;
    this.speed =
      speed *
      this.genome.speedMult *
      (this.isElite ? ELITE_SPEED_MULTIPLIER : 1) *
      (this.eliteModifier === "swift" ? ELITE_SWIFT_SPEED_MULTIPLIER : 1);
    this.maxHealth = Math.max(
      1,
      Math.round(
        health *
          this.genome.healthMult *
          (this.isElite ? ELITE_HEALTH_MULTIPLIER : 1)
      )
    );
    this.health = this.maxHealth;
    this.isBoss = isBoss;
    this.size =
      (isBoss ? BOSS_SIZE_MULTIPLIER : 1) *
      this.genome.sizeMult *
      (this.isElite ? ELITE_SIZE_MULTIPLIER : 1);
    this.hitboxRadius = this.size / 2;
    this.damageMultiplier =
      (isBoss ? BOSS_DAMAGE_MULTIPLIER : 1) *
      this.genome.damageMult *
      (this.isElite ? ELITE_DAMAGE_MULTIPLIER : 1);
    this.playerContactTime = 0;
    this.difficulty = difficulty;
    const baseReward = isBoss
      ? (difficulty || 1) * BOSS_XP_MULTIPLIER
      : difficulty || 1;
    const rewardScale =
      (this.genome.healthMult + this.genome.damageMult) / 2;
    this.xpReward =
      Math.max(1, Math.round(baseReward * rewardScale)) *
      (this.isElite ? ELITE_XP_MULTIPLIER : 1);
    this.coinReward = this.isElite
      ? this.xpReward * ELITE_COIN_MULTIPLIER
      : this.xpReward;

    this.baseMaterial = getBodyMaterial(this.difficulty, this.isElite);
    if (this.isElite) {
      this.baseMaterial = this.baseMaterial.clone();
    }
    const body = buildMonsterBody(this.genome, this.baseMaterial);
    this.mesh = body.group;
    this.core = body.core;
    this.canSplit = !isBoss && canSplit(this.genome);
    this.isBomber = !isBoss && this.genome.archetype === "bomber";
    this.isStalker = !isBoss && this.genome.archetype === "stalker";
    this.isMortar = !isBoss && this.genome.archetype === "mortar";
    this.cannon = body.cannon;
    this.mortarCooldown = randomInRange(MORTAR_FIRE_INTERVAL) * 0.5;
    this.mortarWindup = null;
    this.recoilTime = 0;
    this.fuseTimer = null;
    this.hasDetonated = false;
    this.flashEntries = body.flashEntries;
    this.eyes = body.eyes;
    this.animatedParts = body.animatedParts;
    this.coreGeometry = body.coreGeometry;
    this.ownedGeometries = body.ownedGeometries ?? [];

    this.bodyScale = new THREE.Vector3(
      this.genome.stretch.x,
      this.genome.stretch.y,
      this.genome.stretch.z
    ).multiplyScalar(this.size);
    this.mesh.scale.copy(this.bodyScale);
    this.mesh.position.y = this.bodyScale.y * 0.42;
    this.add(this.mesh);

    if (this.isElite) {
      this.eliteAura = new THREE.Mesh(
        eliteAuraGeometry,
        eliteAuraMaterial.clone()
      );
      this.mesh.add(this.eliteAura);
      this.eliteHue = Math.random();
      this._createEliteModifierVisuals();
    }

    if (this.isStalker) {
      this._createCloak();
    }

    this.eyesGlowing = false;
    this.animTime = Math.random() * Math.PI * 2;

    this.damageTimer = 0;
    this.flashTime = 0;
    this.critPunchTime = 0;
    this.slowTimer = 0;
    this.isDying = false;
    this.deathTimer = 0;

    this.velocity = new THREE.Vector3();
    this.knockbackVelocity = new THREE.Vector3();
    this.collisionBox = new THREE.Box3();

    this.stuckTime = 0;
    this.detourActive = false;
    this.detourTimeLeft = 0;
    this.recentDetourTime = 0;
    this.detourSide = Math.random() < 0.5 ? 1 : -1;
    this.detourDirection = new THREE.Vector3();

    this.bossState = "chase";
    this.bossStateTime = 0;
    this.bossCooldown =
      BOSS_SPECIAL_COOLDOWN.min +
      Math.random() * (BOSS_SPECIAL_COOLDOWN.max - BOSS_SPECIAL_COOLDOWN.min);
    this.chargeDirection = new THREE.Vector3();

    this.position.copy(spawnPosition);

    if (savedState) {
      this.maxHealth = savedState.maxHealth ?? this.maxHealth;
      this.health = Math.min(
        savedState.health ?? this.maxHealth,
        this.maxHealth
      );
    }

    this.maxShield = getMaxShield(this.eliteModifier, this.maxHealth);
    this.shield = this.maxShield;
    this.timeSinceDamage = Infinity;
    this.spawnGrace = 0;

    setTimeout(() => {
      this.createHealthBar();
    }, 0);
  }

  captureState() {
    return {
      kind: this.isMimic ? "mimic" : this.isBoss ? "boss" : "enemy",
      position: { x: this.position.x, z: this.position.z },
      difficulty: this.difficulty,
      health: this.health,
      maxHealth: this.maxHealth,
      isElite: this.isElite,
      eliteModifier: this.eliteModifier,
      canSummon: this.canSummon,
      isDormant: this.isDormant === true,
      genome: this.genome,
    };
  }

  createHealthBar() {
    this.healthCanvas = document.createElement("canvas");
    this.healthCanvas.width = 64;
    this.healthCanvas.height = 8;
    this.healthContext = this.healthCanvas.getContext("2d");

    this.healthTexture = new THREE.CanvasTexture(this.healthCanvas);
    this.healthTexture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.healthTexture,
      transparent: true,
    });
    this.healthBarSprite = new THREE.Sprite(spriteMaterial);
    this.healthBarSprite.scale.set(1.5 * this.size, 0.2 * this.size, 1);
    this.healthBarSprite.position.set(0, this.size + 0.2, 0);
    this.healthBarSprite.visible = !this.isDying && this._shouldShowHealthBar();
    this.add(this.healthBarSprite);

    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.healthContext) {
      return;
    }
    const ctx = this.healthContext;
    const width = this.healthCanvas.width;
    const height = this.healthCanvas.height;
    const percentage = this.health / this.maxHealth;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, width * percentage, height);

    if (this.maxShield > 0 && this.shield > 0) {
      ctx.fillStyle = "#59c8ff";
      ctx.fillRect(0, 0, width * (this.shield / this.maxShield), height / 2);
    }

    this.healthTexture.needsUpdate = true;
  }

  _shouldShowHealthBar() {
    return (
      this.isBoss ||
      this.health < this.maxHealth ||
      (this.maxShield > 0 && this.shield < this.maxShield)
    );
  }

  _createEliteModifierVisuals() {
    const color = ELITE_MODIFIER_COLORS[this.eliteModifier];
    if (!color) {
      return;
    }
    this.eliteAura.material.color.setHex(color);
    this.eliteAura.material.opacity = 0.24;

    this.modifierIcon = new THREE.Sprite(
      getModifierIconMaterial(this.eliteModifier)
    );
    this.modifierIcon.scale.setScalar(0.55 + this.size * 0.15);
    this.modifierIcon.position.y = this.size + 0.75;
    this.add(this.modifierIcon);

    if (this.eliteModifier === "shield") {
      this.shieldBubble = new THREE.Group();
      this.shieldBubbleMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.shieldEdgesMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      this.shieldBubble.add(
        new THREE.Mesh(shieldBubbleGeometry, this.shieldBubbleMaterial),
        new THREE.LineSegments(shieldEdgesGeometry, this.shieldEdgesMaterial)
      );
      this.shieldBubble.scale.setScalar(this.size * 1.05);
      this.shieldBubble.position.y = this.size * 0.42;
      this.shieldFlash = 0;
      this.add(this.shieldBubble);
    }
  }

  removeElite() {
    if (!this.isElite) {
      return;
    }
    this.baseMaterial.dispose();
    this.eliteAura.material.dispose();
    this.eliteAura = null;
    if (this.modifierIcon) {
      this.remove(this.modifierIcon);
      this.modifierIcon = null;
    }
    this._disposeShieldBubble();
    if (this.eliteModifier === "swift") {
      this.speed /= ELITE_SWIFT_SPEED_MULTIPLIER;
    }
    this.eliteModifier = null;
    this.maxShield = 0;
    this.shield = 0;
    this.isElite = false;
  }

  _disposeShieldBubble() {
    if (!this.shieldBubble) {
      return;
    }
    this.remove(this.shieldBubble);
    this.shieldBubbleMaterial.dispose();
    this.shieldEdgesMaterial.dispose();
    this.shieldBubble = null;
  }

  _updateEliteModifier(delta) {
    this.timeSinceDamage += delta;

    if (this.eliteModifier === "shield") {
      const previousShield = this.shield;
      this.shield = rechargeShield(
        this.shield,
        this.maxShield,
        this.timeSinceDamage,
        delta
      );
      if (this.shield !== previousShield) {
        this.updateHealthBar();
      }
      if (this.shieldBubble) {
        const ratio = this.shield / this.maxShield;
        this.shieldFlash = Math.max(this.shieldFlash - delta * 4, 0);
        this.shieldBubble.visible = this.shield > 0 && !this.isCloaked;
        this.shieldBubble.rotation.y += delta * 0.8;
        this.shieldBubbleMaterial.opacity = 0.08 + 0.1 * ratio + this.shieldFlash * 0.4;
        this.shieldEdgesMaterial.opacity = 0.25 + 0.35 * ratio + this.shieldFlash * 0.4;
      }
    } else if (this.eliteModifier === "regen") {
      const previousHealth = this.health;
      this.health = regenerateHealth(
        this.health,
        this.maxHealth,
        this.timeSinceDamage,
        delta
      );
      if (this.health !== previousHealth) {
        this.updateHealthBar();
        this.regenMoteTimer = (this.regenMoteTimer ?? 0) - delta;
        if (this.regenMoteTimer <= 0 && this.parent && !this.isCloaked) {
          this.regenMoteTimer = 0.12;
          fxSystem(this.parent, "glow").emit({
            x: this.position.x + spread(this.size * 0.45),
            y: this.size * 0.3,
            z: this.position.z + spread(this.size * 0.45),
            vy: 1.6,
            life: 0.7,
            size: 0.12,
            sizeEnd: 0.03,
            color: ELITE_MODIFIER_COLORS.regen,
            intensity: 1.4,
          });
        }
      }
    }
  }

  _emitSwiftTrail(delta) {
    this.swiftTrailTimer = (this.swiftTrailTimer ?? 0) - delta;
    if (this.swiftTrailTimer > 0 || !this.parent || !this.heading) {
      return;
    }
    this.swiftTrailTimer = 0.04;
    fxSystem(this.parent, "sparks").emit({
      x: this.position.x - this.heading.x * this.size * 0.5 + spread(0.2),
      y: 0.15 + Math.random() * this.size * 0.5,
      z: this.position.z - this.heading.z * this.size * 0.5 + spread(0.2),
      vx: -this.heading.x * 2,
      vz: -this.heading.z * 2,
      life: 0.35,
      size: 0.14,
      sizeEnd: 0.02,
      shapeX: 0.4,
      shapeZ: 2.2,
      ry: Math.atan2(this.heading.x, this.heading.z),
      rx: 0,
      rz: 0,
      color: ELITE_MODIFIER_COLORS.swift,
      intensity: 1.5,
    });
  }

  _updateBomber(delta) {
    if (this.fuseTimer == null) {
      const distance = Math.hypot(
        this.target.position.x - this.position.x,
        this.target.position.z - this.position.z
      );
      if (!shouldArmBomber(distance, this.hitboxRadius)) {
        return false;
      }
      this.fuseTimer = 0;
      this._showBlastIndicator();
    }

    this.fuseTimer += delta;
    const progress = Math.min(this.fuseTimer / BOMBER_FUSE_TIME, 1);
    this.mesh.scale.copy(this.bodyScale).multiplyScalar(1 + progress * 0.35);
    this.mesh.position.x = Math.sin(this.fuseTimer * 60) * 0.05 * progress;

    const blinkOn = Math.sin(this.fuseTimer * (8 + progress * 30)) > 0;
    if (blinkOn !== this.bomberBlinkOn && this.flashTime <= 0) {
      this.bomberBlinkOn = blinkOn;
      if (blinkOn) {
        for (const entry of this.flashEntries) {
          entry.mesh.material = bomberFlashMaterial;
        }
      } else {
        this._restoreMaterials();
      }
    }

    if (this.blastIndicator) {
      this.blastRingMaterial.opacity = 0.45 + 0.45 * progress;
      this.blastDiscMaterial.opacity = 0.06 + 0.22 * progress * (blinkOn ? 1 : 0.6);
    }

    if (this.fuseTimer >= BOMBER_FUSE_TIME) {
      this.detonate();
    }
    return true;
  }

  _showBlastIndicator() {
    if (this.blastIndicator) {
      return;
    }
    this.blastRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3020,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.blastDiscMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3020,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    this.blastIndicator = new THREE.Group();
    this.blastIndicator.add(
      new THREE.Mesh(blastRingGeometry, this.blastRingMaterial),
      new THREE.Mesh(blastDiscGeometry, this.blastDiscMaterial)
    );
    this.blastIndicator.position.y = 0.07;
    this.blastIndicator.scale.setScalar(getBlastRadius(this.size));
    this.blastIndicator.renderOrder = 1;
    this.add(this.blastIndicator);
  }

  _hideBlastIndicator() {
    if (!this.blastIndicator) {
      return;
    }
    this.remove(this.blastIndicator);
    this.blastRingMaterial.dispose();
    this.blastDiscMaterial.dispose();
    this.blastIndicator = null;
  }

  detonate() {
    if (this.hasDetonated) {
      return;
    }
    this.hasDetonated = true;
    this._hideBlastIndicator();
    this.parent?.detonateBomber?.(this);
    if (!this.isDying) {
      this.xpReward = 0;
      this.coinReward = 0;
      this.die();
    }
  }

  _createCloak() {
    this.cloakMaterial = new THREE.MeshStandardMaterial({
      color: this.baseMaterial.color.clone(),
      transparent: true,
      opacity: STALKER_CLOAK_OPACITY,
      depthWrite: false,
      flatShading: true,
    });
    this.hitRevealTimer = 0;
    this.lungeTimer = 0;
    this.whisperTimer = 2 + Math.random() * 4;
    this.isCloaked = false;
    this._setCloaked(true, true);
  }

  _setCloaked(cloaked, instant = false) {
    if (!this.cloakMaterial || this.isCloaked === cloaked) {
      return;
    }
    this.isCloaked = cloaked;
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = !cloaked;
      }
    });
    if (this.eliteAura) {
      this.eliteAura.visible = !cloaked;
    }
    if (cloaked) {
      this.cloakMaterial.opacity = instant ? STALKER_CLOAK_OPACITY : 0.85;
    }
    this._restoreMaterials();
  }

  _getGapToTarget() {
    return (
      Math.hypot(
        this.target.position.x - this.position.x,
        this.target.position.z - this.position.z
      ) -
      this.hitboxRadius -
      PLAYER_RADIUS
    );
  }

  _updateStalker(delta) {
    this.hitRevealTimer = Math.max(this.hitRevealTimer - delta, 0);
    this.lungeTimer = Math.max(this.lungeTimer - delta, 0);
    const gap = this._getGapToTarget();

    if (!this.isCloaked) {
      if (gap > STALKER_RECLOAK_DISTANCE && this.hitRevealTimer <= 0) {
        audio.play("stalkerCloak", { position: this.position });
        this._setCloaked(true);
      }
      return;
    }

    if (gap <= STALKER_REVEAL_DISTANCE) {
      this._ambushReveal();
      return;
    }

    this.cloakMaterial.color.copy(this.baseMaterial.color);
    const shimmer =
      STALKER_CLOAK_OPACITY + Math.sin(this.animTime * 2.7) * 0.02;
    this.cloakMaterial.opacity +=
      (shimmer - this.cloakMaterial.opacity) * Math.min(delta * 3, 1);

    this.whisperTimer -= delta;
    if (this.whisperTimer <= 0) {
      this.whisperTimer = 4 + Math.random() * 5;
      if (gap < STALKER_WHISPER_DISTANCE) {
        audio.play("stalkerWhisper", { position: this.position });
      }
    }
  }

  _ambushReveal() {
    this._setCloaked(false);
    this.lungeTimer = STALKER_LUNGE_TIME;
    this.critPunchTime = CRITICAL_FLASH_DURATION;
    audio.play("stalkerReveal", { position: this.position });
    if (!this.parent) {
      return;
    }
    const color = this.baseMaterial.color.getHex();
    const smoke = fxSystem(this.parent, "smoke");
    for (let index = 0; index < 14; index++) {
      const angle = (index / 14) * Math.PI * 2;
      smoke.emit({
        x: this.position.x + Math.cos(angle) * this.size * 0.4,
        y: this.size * (0.3 + Math.random() * 0.6),
        z: this.position.z + Math.sin(angle) * this.size * 0.4,
        vx: Math.cos(angle) * 2.5,
        vy: 0.6 + Math.random(),
        vz: Math.sin(angle) * 2.5,
        drag: 3,
        life: 0.5 + Math.random() * 0.3,
        size: 0.3,
        sizeEnd: 0.9,
        color: 0x1a0d12,
        colorEnd: color,
        alpha: 0.6,
        fadeOut: 0.7,
      });
    }
  }

  _updateMortar(delta, distanceToTarget) {
    this._updateCannonRecoil(delta);

    if (this.mortarWindup != null) {
      this.mortarWindup += delta;
      const progress = Math.min(this.mortarWindup / MORTAR_WINDUP_TIME, 1);
      if (this.cannon) {
        this.cannon.pivot.rotation.x =
          MORTAR_REST_TILT - (MORTAR_REST_TILT - MORTAR_AIM_TILT) * progress;
        this.cannon.barrel.position.x =
          Math.sin(this.mortarWindup * 70) * 0.02 * progress;
      }
      if (progress >= 1) {
        this.mortarWindup = null;
        this._fireMortar();
      }
      return "hold";
    }

    this.mortarCooldown -= delta;
    if (distanceToTarget > MORTAR_RANGE) {
      return "chase";
    }
    if (this.mortarCooldown <= 0) {
      this.mortarCooldown = randomInRange(MORTAR_FIRE_INTERVAL);
      this.mortarWindup = 0;
      return "hold";
    }
    return distanceToTarget < MORTAR_MIN_DISTANCE ? "retreat" : "hold";
  }

  _updateCannonRecoil(delta) {
    if (!this.cannon || this.recoilTime <= 0) {
      return;
    }
    this.recoilTime = Math.max(this.recoilTime - delta, 0);
    const kick = this.recoilTime / MORTAR_RECOIL_TIME;
    this.cannon.barrel.position.y = -0.18 * kick * kick;
    this.cannon.pivot.rotation.x =
      MORTAR_REST_TILT - (MORTAR_REST_TILT - MORTAR_AIM_TILT) * kick;
  }

  _fireMortar() {
    if (!this.parent?.fireMortarShell) {
      return;
    }
    (this.cannon?.muzzle ?? this.mesh).getWorldPosition(muzzlePosition);
    this.parent.fireMortarShell(
      this,
      muzzlePosition.clone(),
      this.target.position.clone()
    );
    this.recoilTime = MORTAR_RECOIL_TIME;
    if (this.cannon) {
      this.cannon.barrel.position.x = 0;
    }
    audio.play("mortarFire", { position: this.position });

    const smoke = fxSystem(this.parent, "smoke");
    for (let index = 0; index < 8; index++) {
      smoke.emit({
        x: muzzlePosition.x + spread(0.15),
        y: muzzlePosition.y,
        z: muzzlePosition.z + spread(0.15),
        vx: spread(1.2),
        vy: 1.5 + Math.random() * 1.5,
        vz: spread(1.2),
        drag: 2.5,
        life: 0.7 + Math.random() * 0.4,
        size: 0.25,
        sizeEnd: 0.9,
        color: 0x6a6468,
        colorEnd: 0x2a282c,
        alpha: 0.6,
        fadeOut: 0.8,
      });
    }
    fxSystem(this.parent, "glow").emit({
      x: muzzlePosition.x,
      y: muzzlePosition.y,
      z: muzzlePosition.z,
      life: 0.15,
      size: 0.8,
      sizeEnd: 0.1,
      color: 0xfff1a8,
      colorEnd: this.baseMaterial.color.getHex(),
      intensity: 2.5,
    });
  }

  _faceDirection(direction, delta) {
    if (!this.heading) {
      this.heading = direction.clone();
    }
    this.heading.lerp(direction, 1 - Math.exp(-ENEMY_TURN_RATE * delta));
    if (this.heading.lengthSq() < 1e-6) {
      this.heading.copy(direction);
    }
    this.heading.normalize();
    this.lookAt(
      lookTarget.set(
        this.position.x + this.heading.x,
        this.position.y,
        this.position.z + this.heading.z
      )
    );
  }

  _updateSplitterPulse() {
    if (!this.canSplit || !this.core) {
      return;
    }
    const wobble = Math.sin(this.animTime * 5.5) * 0.07;
    this.core.scale.set(1 + wobble, 1 - wobble, 1 + wobble);
  }

  update(delta) {
    if (this.isDying) {
      this._updateDeath(delta);
      return;
    }

    const eyesShouldGlow =
      (this.parent?.isNight ?? false) || this.parent?.isMist === true;
    if (eyesShouldGlow !== this.eyesGlowing) {
      this.eyesGlowing = eyesShouldGlow;
      if (!this.isCloaked) {
        const material = eyesShouldGlow ? eyeNightMaterial : eyeDayMaterial;
        for (const eye of this.eyes) {
          eye.material = material;
        }
      }
    }

    if (this.healthBarSprite) {
      this.healthBarSprite.visible =
        this.parent?.isMist !== true &&
        !this.isHiddenInGrass &&
        !this.isCloaked &&
        this._shouldShowHealthBar();
    }
    if (this.modifierIcon) {
      this.modifierIcon.visible =
        this.parent?.isMist !== true && !this.isHiddenInGrass && !this.isCloaked;
    }

    if (this.spawnGrace > 0) {
      this.spawnGrace -= delta;
    }

    if (this.isElite) {
      this.eliteHue = (this.eliteHue + delta * 0.35) % 1;
      this.baseMaterial.color.setHSL(this.eliteHue, 1, 0.55);
      this.baseMaterial.emissive.setHSL(this.eliteHue, 1, 0.35);
      if (!this.eliteModifier) {
        this.eliteAura.material.color.setHSL((this.eliteHue + 0.15) % 1, 1, 0.6);
      }
      this._updateEliteModifier(delta);
    }

    if (this.flashTime > 0) {
      this.flashTime -= delta;
      if (this.flashTime <= 0) {
        this._restoreMaterials();
      }
    }

    if (this.critPunchTime > 0) {
      this.critPunchTime -= delta;
      const punch = Math.max(this.critPunchTime / CRITICAL_FLASH_DURATION, 0);
      this.mesh.scale
        .copy(this.bodyScale)
        .multiplyScalar(1 + punch * CRITICAL_PUNCH_SCALE);
    }

    if (this.isFrozen) {
      this.freezeTimer -= delta;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
        if (this.freezeEffect) {
          this.remove(this.freezeEffect);
          this.freezeEffect = null;
        }
      }
      return;
    }

    this.animTime += delta;
    const animSpeed = 3 + this.genome.speedMult * 4;
    animateMonsterParts(this.animatedParts, this.animTime, animSpeed);
    this._updateSplitterPulse();
    if (!ENEMY_WALK_ANIMATION && !this.isMimic && this.bossState !== "telegraph") {
      this.mesh.position.y =
        this.bodyScale.y * 0.42 +
        Math.abs(Math.sin(this.animTime * animSpeed)) * 0.05 * this.size;
    }

    if (this.knockbackVelocity.lengthSq() > 0.0001) {
      const pushed = this.position
        .clone()
        .addScaledVector(this.knockbackVelocity, delta);
      if (
        this.parent?.tileManager?.isCircleBlocked(
          pushed.x,
          pushed.z,
          this.hitboxRadius * 0.85
        )
      ) {
        this.knockbackVelocity.set(0, 0, 0);
      } else {
        this.position.copy(pushed);
        this.knockbackVelocity.multiplyScalar(
          Math.exp(-KNOCKBACK_DECAY * delta)
        );
      }
    }

    if (this.isBoss && this._updateBossSpecial(delta)) {
      return;
    }
    if (this.isBomber && this._updateBomber(delta)) {
      return;
    }
    if (this.isStalker) {
      this._updateStalker(delta);
    }

    const tileManager = this.parent?.tileManager;
    const groundEffect = tileManager?.getGroundEffect(this.position.x, this.position.z);
    this.isHiddenInGrass = groundEffect?.hides === true && !this.isBoss;
    if (groundEffect?.damage) {
      this.burnTimer = (this.burnTimer ?? 0) - delta;
      if (this.burnTimer <= 0) {
        this.burnTimer = 0.5;
        this.burn(Math.max(this.maxHealth * 0.06, 1));
        if (this.isDying) {
          return;
        }
      }
    }

    toTarget.subVectors(this.target.position, this.position).setY(0);
    const distanceToTarget = toTarget.length();
    if (distanceToTarget < 1e-4) {
      return;
    }
    toTarget.divideScalar(distanceToTarget);
    const collisionRadius = this.hitboxRadius * 0.85;

    if (this.isMortar) {
      const stance = this._updateMortar(delta, distanceToTarget);
      if (stance !== "chase") {
        this._faceDirection(toTarget, delta);
        const startX = this.position.x;
        const startZ = this.position.z;
        if (stance === "retreat") {
          const step =
            this.speed * 0.6 * (groundEffect?.speed ?? 1) * delta;
          const nextX = this.position.x - toTarget.x * step;
          const nextZ = this.position.z - toTarget.z * step;
          if (tileManager) {
            tileManager.moveCircle(this.position, nextX, nextZ, collisionRadius);
          } else {
            this.position.x = nextX;
            this.position.z = nextZ;
          }
        }
        if (ENEMY_WALK_ANIMATION && delta > 0) {
          const speed =
            Math.hypot(this.position.x - startX, this.position.z - startZ) / delta;
          this._updateRunAnimation(delta, speed);
        }
        return;
      }
    }

    this.pathCheckTimer = (this.pathCheckTimer ?? Math.random() * PATH_CHECK_INTERVAL) - delta;
    if (this.pathCheckTimer <= 0) {
      this.pathCheckTimer = PATH_CHECK_INTERVAL * (0.8 + Math.random() * 0.4);
      this.directPathClear =
        !tileManager ||
        distanceToTarget <= 2.5 ||
        tileManager.isSegmentClear(
          this.position.x,
          this.position.z,
          this.target.position.x,
          this.target.position.z,
          collisionRadius * 0.8,
          DIRECT_PATH_LOOKAHEAD
        );
    }

    const followsFlow =
      this.directPathClear === false &&
      tileManager?.getFlowDirection(this.position, moveDirection) === true;
    if (!followsFlow) {
      moveDirection.copy(toTarget);
    }

    this._faceDirection(moveDirection, delta);
    moveDirection.copy(this.heading);

    let moveSpeed =
      this.speed *
      (this.parent?.isFullMoon ? FULL_MOON_SPEED_MULTIPLIER : 1) *
      (groundEffect?.speed ?? 1) *
      (this.lungeTimer > 0 ? STALKER_LUNGE_SPEED_MULTIPLIER : 1);
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      moveSpeed *= 0.4;
    }

    const startX = this.position.x;
    const startZ = this.position.z;
    const nextX = this.position.x + moveDirection.x * moveSpeed * delta;
    const nextZ = this.position.z + moveDirection.z * moveSpeed * delta;
    if (tileManager) {
      tileManager.moveCircle(this.position, nextX, nextZ, collisionRadius);
    } else {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    if (ENEMY_WALK_ANIMATION && !this.isMimic && delta > 0) {
      const speed = Math.hypot(this.position.x - startX, this.position.z - startZ) / delta;
      this._updateRunAnimation(delta, speed);
    }
    if (this.eliteModifier === "swift" && !this.isHiddenInGrass && !this.isCloaked) {
      this._emitSwiftTrail(delta);
    }
  }

  _updateRunAnimation(delta, speed) {
    const walking = speed > 0.4;
    this.runBlend = THREE.MathUtils.lerp(
      this.runBlend ?? 0,
      walking ? 1 : 0,
      1 - Math.exp(-delta * 10)
    );
    if (walking) {
      this.runPhase = (this.runPhase ?? Math.random() * Math.PI) + delta * (5 + speed * 1.4);
    }
    const hop = Math.abs(Math.sin(this.runPhase ?? 0)) * this.runBlend;
    this.mesh.position.y = this.bodyScale.y * 0.42 + hop * 0.14 * this.size;

    if (this.critPunchTime <= 0) {
      const stretch = 1 + (hop - 0.5 * this.runBlend) * 0.18;
      const widen = 1 / Math.sqrt(stretch);
      this.mesh.scale.set(
        this.bodyScale.x * widen,
        this.bodyScale.y * stretch,
        this.bodyScale.z * widen
      );
    }

    const lean = 0.2 * this.runBlend;
    this.mesh.rotation.x += (lean - this.mesh.rotation.x) * Math.min(delta * 10, 1);
  }

  burn(amount) {
    if (this.isDying) {
      return;
    }
    this.health -= amount;
    this.timeSinceDamage = 0;
    this.updateHealthBar();
    if (this.health <= 0) {
      this.die();
    }
  }

  _updateBossSpecial(delta) {
    if (this.bossState === "chase") {
      this.bossCooldown -= delta;
      const distSq = this.position.distanceToSquared(this.target.position);
      if (
        this.bossCooldown <= 0 &&
        distSq < BOSS_SPECIAL_RANGE * BOSS_SPECIAL_RANGE
      ) {
        this.bossState =
          Math.random() < 0.6 || !this.canSummon ? "telegraph" : "summon";
        this.bossStateTime = 0;
        if (this.bossState === "telegraph") {
          audio.play("bossTelegraph", { position: this.position });
        }
      }
      return false;
    }

    this.bossStateTime += delta;

    if (this.bossState === "telegraph") {
      this.lookAt(
        new THREE.Vector3(
          this.target.position.x,
          this.position.y,
          this.target.position.z
        )
      );
      this.mesh.position.x = Math.sin(this.bossStateTime * 45) * 0.15;
      this._showChargeIndicator(this.bossStateTime / BOSS_TELEGRAPH_TIME);
      if (this.bossStateTime >= BOSS_TELEGRAPH_TIME) {
        this.mesh.position.x = 0;
        this._hideChargeIndicator();
        this.chargeDirection
          .subVectors(this.target.position, this.position)
          .setY(0)
          .normalize();
        this.bossState = "charge";
        this.bossStateTime = 0;
      }
      return true;
    }

    if (this.bossState === "charge") {
      const step =
        this.speed *
        (this.parent?.isFullMoon ? FULL_MOON_SPEED_MULTIPLIER : 1) *
        BOSS_CHARGE_SPEED_MULTIPLIER *
        delta;
      const candidate = this.position
        .clone()
        .addScaledVector(this.chargeDirection, step);
      const blocked = this.parent?.tileManager?.intersectsSolid(
        this.getCollisionBoxAt(candidate)
      );
      if (!blocked) {
        this.position.copy(candidate);
      }
      if (blocked || this.bossStateTime >= BOSS_CHARGE_TIME) {
        this._endBossSpecial();
      }
      return true;
    }

    if (this.bossState === "summon") {
      this.mesh.rotation.y += delta * 10;
      if (this.bossStateTime >= 0.6) {
        this.mesh.rotation.y = 0;
        if (this.parent?.spawnMinions) {
          audio.play("bossSummon", { position: this.position });
          this.parent.spawnMinions(this);
        }
        this._endBossSpecial();
      }
      return true;
    }

    return false;
  }

  applyKnockback(direction, force) {
    if (this.isBoss || this.isDying || this.isDormant) {
      return;
    }
    this.knockbackVelocity.x += direction.x * (force / Math.max(this.size, 1));
    this.knockbackVelocity.z += direction.z * (force / Math.max(this.size, 1));
    const maxKnockback = force * 2;
    if (this.knockbackVelocity.lengthSq() > maxKnockback * maxKnockback) {
      this.knockbackVelocity.setLength(maxKnockback);
    }
  }

  _showChargeIndicator(progress) {
    if (!this.chargeIndicator) {
      this.chargeIndicator = new THREE.Mesh(
        chargeIndicatorGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xff2a2a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      this.chargeIndicator.position.y = 0.06;
      this.chargeIndicator.renderOrder = 1;
      this.add(this.chargeIndicator);
    }
    const chargeLength =
      this.speed *
      (this.parent?.isFullMoon ? FULL_MOON_SPEED_MULTIPLIER : 1) *
      BOSS_CHARGE_SPEED_MULTIPLIER *
      BOSS_CHARGE_TIME;
    this.chargeIndicator.scale.set(
      this.size * 0.8,
      1,
      chargeLength * Math.min(progress * 1.5, 1)
    );
    this.chargeIndicator.material.opacity =
      0.18 + 0.3 * progress + Math.sin(progress * 40) * 0.08;
  }

  _hideChargeIndicator() {
    if (this.chargeIndicator) {
      this.remove(this.chargeIndicator);
      this.chargeIndicator.material.dispose();
      this.chargeIndicator = null;
    }
  }

  _endBossSpecial() {
    this._hideChargeIndicator();
    this.bossState = "chase";
    this.bossStateTime = 0;
    this.bossCooldown =
      BOSS_SPECIAL_COOLDOWN.min +
      Math.random() * (BOSS_SPECIAL_COOLDOWN.max - BOSS_SPECIAL_COOLDOWN.min);
  }

  _updateDeath(delta) {
    this.deathTimer -= delta;
    const shrinkProgress = Math.max(this.deathTimer / ENEMY_DEATH_DURATION, 0);
    this.mesh.scale.copy(this.bodyScale).multiplyScalar(shrinkProgress);

    if (this.deathTimer <= 0) {
      this.dispose();
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }

  _spawnDeathParticles() {
    if (!this.parent) {
      return;
    }
    const style = this.target?.killEffect ?? "pixels";
    spawnKillEffect(this.parent, this.position, style, {
      color: this.baseMaterial.color.getHex(),
      size: this.size,
    });
    const killSound = KILL_EFFECT_SOUNDS[style];
    if (killSound) {
      audio.play(killSound, { position: this.position });
    }
  }

  freeze(duration) {
    if (this.isDying) {
      return;
    }

    this.isFrozen = true;
    this.freezeTimer = Math.max(this.freezeTimer ?? 0, duration);
    this.knockbackVelocity.set(0, 0, 0);

    audio.play("powerIceFreeze", { position: this.position });

    if (!this.freezeEffect) {
      this.freezeEffect = new THREE.Mesh(freezeGeometry, freezeMaterial);
      this.freezeEffect.scale.setScalar(0.6 * this.size);
      this.freezeEffect.position.y = this.bodyScale.y * 0.42;
      this.add(this.freezeEffect);
    }
  }

  resolveCollision(otherEnemy) {
    if (this.isDying || otherEnemy.isDying) {
      return;
    }
    if (this.isDormant || otherEnemy.isDormant) {
      return;
    }

    const distance = this.position.distanceTo(otherEnemy.position);
    const minDistance = this.hitboxRadius + otherEnemy.hitboxRadius;

    if (distance < minDistance && distance > 0) {
      const overlap = minDistance - distance;
      const repulsion = new THREE.Vector3()
        .subVectors(this.position, otherEnemy.position)
        .normalize()
        .multiplyScalar(overlap / 2);

      const tileManager = this.parent?.tileManager;
      const newThisPos = this.position.clone().add(repulsion);
      const newOtherPos = otherEnemy.position.clone().sub(repulsion);

      const isValid = (pos) =>
        !tileManager?.isCircleBlocked(pos.x, pos.z, this.hitboxRadius * 0.85);

      const canMoveThis = isValid(newThisPos);
      const canMoveOther = isValid(newOtherPos);

      if (canMoveThis && canMoveOther) {
        this.position.copy(newThisPos);
        otherEnemy.position.copy(newOtherPos);
      } else if (canMoveThis) {
        this.position.copy(newThisPos);
      } else if (canMoveOther) {
        otherEnemy.position.copy(newOtherPos);
      }
    }
  }

  _restoreMaterials() {
    if (this.isCloaked) {
      for (const entry of this.flashEntries) {
        entry.mesh.material = this.cloakMaterial;
      }
      for (const eye of this.eyes) {
        eye.material = this.cloakMaterial;
      }
      return;
    }
    for (const entry of this.flashEntries) {
      entry.mesh.material = entry.material;
    }
    const eyeMaterial = this.eyesGlowing ? eyeNightMaterial : eyeDayMaterial;
    for (const eye of this.eyes) {
      eye.material = eyeMaterial;
    }
  }

  hit(damage = 1, isCritical = false, critSoundOverride = null) {
    if (this.isDying || this.spawnGrace > 0) {
      return;
    }

    this.timeSinceDamage = 0;
    if (this.isStalker) {
      this.hitRevealTimer = STALKER_HIT_REVEAL_TIME;
      this._setCloaked(false);
    }
    if (this.shield > 0) {
      const result = absorbDamage(this.shield, damage);
      this.shield = result.shield;
      damage = result.damage;
      this.shieldFlash = 1;
      if (this.shield <= 0) {
        this._breakShield();
      } else if (damage <= 0) {
        this.updateHealthBar();
        audio.play("enemyHit", { position: this.position });
        return;
      }
    }

    this.health -= damage;
    this.updateHealthBar();

    audio.play(
      isCritical ? (critSoundOverride ?? "enemyCrit") : "enemyHit",
      { position: this.position }
    );

    const material = isCritical ? criticalFlashMaterial : flashMaterial;
    for (const entry of this.flashEntries) {
      entry.mesh.material = material;
    }
    for (const eye of this.eyes) {
      eye.material = material;
    }
    this.flashTime = isCritical
      ? CRITICAL_FLASH_DURATION
      : ENEMY_FLASH_DURATION;
    if (isCritical) {
      this.critPunchTime = CRITICAL_FLASH_DURATION;
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  _breakShield() {
    this.shield = 0;
    if (this.shieldBubble) {
      this.shieldBubble.visible = false;
    }
    audio.play("enemyCrit", { position: this.position });
    if (!this.parent) {
      return;
    }
    const shards = fxSystem(this.parent, "shards");
    for (let index = 0; index < 14; index++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      shards.emit({
        x: this.position.x,
        y: this.size * 0.5,
        z: this.position.z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        gravity: 12,
        drag: 1.5,
        life: 0.6,
        size: 0.16,
        sizeEnd: 0.04,
        spinX: spread(10),
        spinY: spread(10),
        color: ELITE_MODIFIER_COLORS.shield,
      });
    }
  }

  die() {
    if (this.isDying) {
      return;
    }
    this.isDying = true;
    this.deathTimer = ENEMY_DEATH_DURATION;
    this.flashTime = 0;
    this.critPunchTime = 0;
    this.mortarWindup = null;
    this._setCloaked(false);
    this._restoreMaterials();
    this._hideChargeIndicator();
    this.mesh.position.x = 0;

    if (this.healthBarSprite) {
      this.healthBarSprite.visible = false;
    }
    if (this.modifierIcon) {
      this.modifierIcon.visible = false;
    }
    if (this.shieldBubble) {
      this.shieldBubble.visible = false;
    }
    if (this.freezeEffect) {
      this.remove(this.freezeEffect);
      this.freezeEffect = null;
      this.isFrozen = false;
    }

    this._spawnDeathParticles();

    const hasKillSound = KILL_EFFECT_SOUNDS[this.target?.killEffect] != null;
    if (this.isBoss) {
      audio.play("bossDeath", { position: this.position });
    } else if (!hasKillSound) {
      const deathSound =
        this.isStalker && audio.repository.isEnabled("stalkerDeath")
          ? "stalkerDeath"
          : "enemyDeath";
      audio.play(deathSound, { position: this.position });
    }

    if (this.target?.gainXP && this.xpReward > 0) {
      this.target.gainXP(this.xpReward);
    }
    if (this.parent?.addCoins && this.coinReward > 0) {
      this.parent.addCoins(this.coinReward);
    }
    if (this.target?.onEnemyKilled) {
      this.target.onEnemyKilled();
    }
    if (this.isBoss) {
      this.parent?.onBossKilled?.();
    }
    if (this.isBoss && this.dropsChest !== false && this.parent?.spawnBossChest) {
      this.parent.spawnBossChest(this.position);
    }
    if (this.canSplit && this.parent?.spawnSplitlings) {
      this.parent.spawnSplitlings(this);
    }
    if (this.isBomber && this.fuseTimer != null) {
      this.detonate();
    }
    this._hideBlastIndicator();
  }

  disposeBodyGeometries() {
    this.coreGeometry.dispose();
    for (const geometry of this.ownedGeometries ?? []) {
      geometry.dispose();
    }
    this.ownedGeometries = [];
  }

  dispose() {
    this.disposeBodyGeometries();
    if (this.isElite) {
      this.baseMaterial.dispose();
      this.eliteAura.material.dispose();
    }
    this._disposeShieldBubble();
    this._hideBlastIndicator();
    this.cloakMaterial?.dispose();
    if (this.healthTexture) {
      this.healthTexture.dispose();
    }
    if (this.healthBarSprite) {
      this.healthBarSprite.material.dispose();
    }
  }

  lightenColor(color, amount = 0.4) {
    const r = color.r + (1 - color.r) * amount;
    const g = color.g + (1 - color.g) * amount;
    const b = color.b + (1 - color.b) * amount;
    return new THREE.Color(r, g, b);
  }

  addPersonalLight(color) {
    this.personalLight = new THREE.PointLight(
      this.lightenColor(color, 0.3),
      1,
      10
    );
    this.personalLight.position.set(0, 1.5, 0);
    this.add(this.personalLight);
  }

  getCollisionBoxAt(pos) {
    return this.collisionBox.setFromCenterAndSize(
      collisionBoxCenter.set(pos.x, pos.y + this.size / 2, pos.z),
      collisionBoxSize.set(this.size, this.size, this.size)
    );
  }
}
