import * as THREE from "three";
import { InputController } from "../core/InputController.js";
import { WorldTileManager } from "../core/WorldTileManager.js";
import { Player } from "../objects/Player.js";
import { Enemy } from "../objects/Enemy.js";
import { Mimic } from "../objects/Mimic.js";
import { Item } from "../objects/Item.js";
import { showDamageText } from "../components/DamageText.js";
import { audio } from "../core/AudioEngine.js";
import { spawnRingWave } from "../core/powers.js";
import { updateKillEffects } from "../core/killEffects.js";
import {
  updatePowerFx,
  spawnGroundRing,
  spawnExplosion,
} from "../core/powerFx.js";
import {
  createSplitlingGenome,
  getSplitlingHealth,
  getBlastRadius,
  getBlastDamage,
} from "../objects/enemyTraits.js";
import { getAchievementReward } from "../core/shopCatalog.js";
import {
  ACHIEVEMENTS,
  incrementStat,
  raiseStat,
} from "../core/achievements.js";
import {
  DIFFICULTY_COLOR_MAX_LEVEL,
  SKULL_CRAZE_START,
} from "../objects/MonsterGenome.js";
import {
  PLAYER_RADIUS,
  ENEMY_SPAWN_INTERVAL,
  BASE_ENEMY_HEALTH,
  ENEMY_HEALTH_GROWTH,
  BASE_ENEMY_DAMAGE,
  ENEMY_DAMAGE_GROWTH,
  ITEM_SPAWN_INTERVAL,
  ITEM_SPAWN_DISTANCE,
  ENEMY_SPAWN_DISTANCE,
  ENEMY_DESPAWN_DISTANCE,
  INITIAL_DIFFICULTY,
  DIFFICULTY_INCREASE_INTERVAL_SECONDS,
  PLAYER_PASSIVES,
  PROJECTILE_SIZE,
  LEVELS_PER_ENEMY_POWER,
  ENEMY_BIOME_BIAS_CHANCE,
  ENEMY_SOLID_CHECK_INTERVAL,
  BOSS_SUMMON_COUNT,
  MIMIC_SPAWN_INTERVAL,
  MIMIC_HEALTH_MULTIPLIER,
  FULL_MOON_SPAWN_MULTIPLIER,
  FULL_MOON_COIN_MULTIPLIER,
  COIN_REWARD_MULTIPLIER,
  FULL_MOON_DAMAGE_MULTIPLIER,
  BOSS_HEALTH_MULTIPLIER,
  BOSS_SPEED,
  BOSS_SPAWN_EVERY_LEVELS,
  POST_MAX_BOSS_CHANCE_PER_LEVEL,
  CAMP_TRIGGER_DISTANCE,
  CAMP_GUARD_COUNT,
  SPLITTER_CHILD_COUNT,
  SPLITTER_CHILD_REWARD,
  SPLITTER_SPAWN_GRACE,
  BOMBER_DAMAGE_MULTIPLIER,
  BOMBER_ENEMY_DAMAGE_FRACTION,
  MORTAR_DAMAGE_MULTIPLIER,
} from "../constants.js";
import { spawnMortarShell } from "../objects/mortarShell.js";

const MAX_FRAME_DELTA = 0.05;
const NON_REPEATABLE_SKILLS = new Set([
  "glowing",
  "projectGlowing",
  "twinShot",
  "secondWind",
]);
export class MainScene extends THREE.Scene {
  constructor() {
    super();
    this.isPaused = false;
    this.isManuallyPaused = false;
    this.isLevelUpModalOpen = false;
    this.isSkillChoiceModalOpen = false;
    this.pendingLevelUps = 0;
    this.isGameOver = false;
    this.onGameOver = null;
    this.onPauseChange = null;
    this.clock = new THREE.Clock();
    this.inputController = new InputController();
    this.tileManager = new WorldTileManager(this, 20);
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.powerEffects = [];
    this.coinsEarned = 0;
    this.coinsBanked = 0;
    this.isNight = false;

    this.shakeTime = 0;
    this.shakeDuration = 0.25;
    this.shakeIntensity = 0;
    this.elapsedTime = 0;
    this.currentDifficulty = 0;
    this.highestBossDifficultySpawned = 0;
    this.lootedCamps = new Set();

    this.enemySpawnTimer = 0;
    this.nextEnemySpawnTime = this._getRandomFloat(
      ENEMY_SPAWN_INTERVAL.min,
      ENEMY_SPAWN_INTERVAL.max
    );
    this.itemSpawnTimer = 0;
    this.nextItemSpawnTime = this._getRandomFloat(
      ITEM_SPAWN_INTERVAL.min,
      ITEM_SPAWN_INTERVAL.max
    );
    this.mimicSpawnTimer = 0;
    this.nextMimicSpawnTime = this._getRandomFloat(
      MIMIC_SPAWN_INTERVAL.min,
      MIMIC_SPAWN_INTERVAL.max
    );

    this._initPlayer();
  }

  _initPlayer() {
    this.player = new Player(this.inputController);
    this.player.onLevelUp = () => {
      this.pendingLevelUps += 1;
      this.isPaused = true;
      this.clock.stop();
      if (!this.isSkillChoiceModalOpen) {
        this._showLevelUpOptions();
      }
    };
    this.player.onGameOver = () => {
      this.isPaused = true;
      this.isGameOver = true;
      this.clock.stop();
      if (this.onGameOver) {
        this.onGameOver({
          level: this.player.level,
          elapsedTime: this.elapsedTime,
          coins: this.coinsEarned,
          power: this.currentDifficulty,
        });
      }
    };
    this.add(this.player);
  }

  createSnapshot() {
    return {
      elapsedTime: this.elapsedTime,
      coinsEarned: this.coinsEarned,
      highestBossDifficultySpawned: this.highestBossDifficultySpawned,
      lootedCamps: [...this.lootedCamps],
      worldSeed: this.tileManager.seed,
      player: this.player.captureState(),
      enemies: this.enemies
        .filter((enemy) => !enemy.isDying)
        .map((enemy) => enemy.captureState()),
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }
    this.elapsedTime = snapshot.elapsedTime ?? 0;
    this.coinsEarned = snapshot.coinsEarned ?? 0;
    this.coinsBanked = this.coinsEarned;
    this.highestBossDifficultySpawned =
      snapshot.highestBossDifficultySpawned ?? 0;
    this.lootedCamps = new Set(snapshot.lootedCamps ?? []);
    if (snapshot.worldSeed != null) {
      this.tileManager = new WorldTileManager(this, 20, snapshot.worldSeed);
    }
    if (snapshot.player) {
      this.player.restoreState(snapshot.player);
    }
    if (Array.isArray(snapshot.enemies)) {
      for (const enemyState of snapshot.enemies) {
        this._restoreEnemy(enemyState);
      }
    }
  }

  _restoreEnemy(state) {
    if (!state?.position) {
      return;
    }
    const position = new THREE.Vector3(state.position.x, 0, state.position.z);
    const power = state.difficulty ?? 0;
    const baseHealth = BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH;

    let enemy;
    if (state.kind === "mimic") {
      enemy = new Mimic(
        this.player,
        position,
        4.5,
        baseHealth * MIMIC_HEALTH_MULTIPLIER,
        power
      );
      enemy.maxHealth = state.maxHealth ?? enemy.maxHealth;
      enemy.health = Math.min(state.health ?? enemy.maxHealth, enemy.maxHealth);
      if (!state.isDormant) {
        enemy.wake();
      }
    } else {
      const isBoss = state.kind === "boss";
      enemy = new Enemy(
        this.player,
        position,
        isBoss ? BOSS_SPEED : 4,
        baseHealth * (isBoss ? BOSS_HEALTH_MULTIPLIER : 1),
        power,
        isBoss,
        undefined,
        state
      );
    }
    this.add(enemy);
    this.enemies.push(enemy);
  }

  takeUnbankedCoins() {
    const unbanked = Math.max(this.coinsEarned - this.coinsBanked, 0);
    this.coinsBanked = this.coinsEarned;
    return unbanked;
  }

  addCoins(amount) {
    this.coinsEarned += Math.round(
      amount *
        COIN_REWARD_MULTIPLIER *
        (this.isFullMoon ? FULL_MOON_COIN_MULTIPLIER : 1) *
        (this.player.coinMultiplier ?? 1)
    );
    audio.play("coin");
  }

  debugAdjustDifficulty(steps) {
    this.elapsedTime = Math.max(
      0,
      this.elapsedTime + steps * DIFFICULTY_INCREASE_INTERVAL_SECONDS
    );
  }

  debugSpawnItemNearby() {
    const spawnPosition = this._getRandomSpawnAroundPlayer(3, 6);
    spawnPosition.y = 0.25;
    const item = new Item(spawnPosition, 0.05, 0x800080);
    this.add(item);
    this.items.push(item);
  }

  spawnMinions(boss) {
    for (let i = 0; i < BOSS_SUMMON_COUNT; i++) {
      const angle = (i / BOSS_SUMMON_COUNT) * Math.PI * 2 + Math.random();
      const spawnPosition = new THREE.Vector3(
        boss.position.x + Math.cos(angle) * (boss.size + 1.5),
        0,
        boss.position.z + Math.sin(angle) * (boss.size + 1.5)
      );
      const minion = new Enemy(
        this.player,
        spawnPosition,
        4,
        BASE_ENEMY_HEALTH + boss.difficulty * ENEMY_HEALTH_GROWTH,
        boss.difficulty,
        false,
        "runner"
      );
      this.add(minion);
      this.enemies.push(minion);
    }
  }

  spawnSplitlings(parent) {
    const genome = createSplitlingGenome(parent.genome);
    const health = getSplitlingHealth(parent.maxHealth);
    const angleOffset = Math.random() * Math.PI * 2;
    const pushDirection = new THREE.Vector3();
    for (let i = 0; i < SPLITTER_CHILD_COUNT; i++) {
      const angle = angleOffset + (i / SPLITTER_CHILD_COUNT) * Math.PI * 2;
      pushDirection.set(Math.cos(angle), 0, Math.sin(angle));
      const spawnPosition = parent.position
        .clone()
        .addScaledVector(pushDirection, parent.hitboxRadius * 0.5);
      spawnPosition.y = 0;
      this.tileManager.pushOutCircle(spawnPosition, parent.hitboxRadius * 0.5);
      const child = new Enemy(
        this.player,
        spawnPosition,
        4,
        health,
        parent.difficulty,
        false,
        undefined,
        { genome, isElite: false }
      );
      child.maxHealth = health;
      child.health = health;
      child.xpReward = Math.max(
        1,
        Math.round(parent.xpReward * SPLITTER_CHILD_REWARD)
      );
      child.coinReward = child.xpReward;
      child.spawnGrace = SPLITTER_SPAWN_GRACE;
      child.applyKnockback(pushDirection, 9);
      this.add(child);
      this.enemies.push(child);
    }
    spawnGroundRing(this, parent.position, {
      color: parent.baseMaterial.color.getHex(),
      radius: parent.size * 1.6,
      duration: 0.4,
    });
  }

  detonateBomber(bomber) {
    const origin = bomber.position.clone();
    const radius = getBlastRadius(bomber.size);
    spawnExplosion(this, origin, { radius, color: 0xff5a1e });
    audio.play("bomberExplode", { position: origin });
    this._triggerScreenShake(0.35, 0.5);

    const playerDistance =
      Math.hypot(
        this.player.position.x - origin.x,
        this.player.position.z - origin.z
      ) - PLAYER_RADIUS;
    const playerDamage = getBlastDamage(
      (BASE_ENEMY_DAMAGE + ENEMY_DAMAGE_GROWTH * bomber.difficulty) *
        bomber.damageMultiplier *
        BOMBER_DAMAGE_MULTIPLIER *
        (this.isFullMoon ? FULL_MOON_DAMAGE_MULTIPLIER : 1),
      playerDistance,
      radius
    );
    if (playerDamage > 0) {
      this.player.takeDamage(Math.floor(playerDamage), null);
    }

    const pushDirection = new THREE.Vector3();
    for (const enemy of [...this.enemies]) {
      if (
        enemy === bomber ||
        enemy.isDying ||
        enemy.isBoss ||
        enemy.isDormant
      ) {
        continue;
      }
      pushDirection.subVectors(enemy.position, origin).setY(0);
      const distance = pushDirection.length() - enemy.hitboxRadius;
      const damage = getBlastDamage(
        enemy.maxHealth * BOMBER_ENEMY_DAMAGE_FRACTION,
        distance,
        radius
      );
      if (damage <= 0) {
        continue;
      }
      enemy.hit(damage);
      if (pushDirection.lengthSq() > 1e-6) {
        enemy.applyKnockback(pushDirection.normalize(), 8);
      }
    }
  }

  fireMortarShell(mortar, origin, target) {
    const baseDamage =
      (BASE_ENEMY_DAMAGE + ENEMY_DAMAGE_GROWTH * mortar.difficulty) *
      mortar.damageMultiplier *
      MORTAR_DAMAGE_MULTIPLIER;
    spawnMortarShell(this, {
      origin,
      target,
      color: mortar.baseMaterial.color.getHex(),
      onImpact: (landing, radius) => {
        if (this.isGameOver) {
          return;
        }
        const playerDistance =
          Math.hypot(
            this.player.position.x - landing.x,
            this.player.position.z - landing.z
          ) - PLAYER_RADIUS;
        const damage = getBlastDamage(
          baseDamage * (this.isFullMoon ? FULL_MOON_DAMAGE_MULTIPLIER : 1),
          playerDistance,
          radius
        );
        if (damage > 0) {
          this.player.takeDamage(Math.max(1, Math.floor(damage)), null);
        }
      },
    });
  }

  _spawnMimic(difficulty) {
    const spawnPosition = this._getRandomSpawnAroundPlayer(25, 50);
    const power = difficulty;
    const mimic = new Mimic(
      this.player,
      spawnPosition,
      4.5,
      (BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH) *
        MIMIC_HEALTH_MULTIPLIER,
      power
    );
    this.add(mimic);
    this.enemies.push(mimic);
  }

  togglePause() {
    if (this.isGameOver) {
      return;
    }
    if (this.isLevelUpModalOpen || this.isSkillChoiceModalOpen) {
      return;
    }

    this.isManuallyPaused = !this.isManuallyPaused;
    this.isPaused = this.isManuallyPaused;

    if (this.isManuallyPaused) {
      this.clock.stop();
    } else {
      this.clock.start();
    }

    if (this.onPauseChange) {
      this.onPauseChange(this.isManuallyPaused);
    }
  }

  _showLevelUpOptions() {
    this.isLevelUpModalOpen = true;
    if (this.onShowLevelUp) {
      this.onShowLevelUp(this.pendingLevelUps);
    }
  }

  _resumeAfterChoice() {
    if (this.pendingLevelUps > 0) {
      this._showLevelUpOptions();
      return;
    }
    this.clock.start();
    this.isPaused = false;
  }

  choosePassive(passive) {
    const value = PLAYER_PASSIVES[passive].increment;
    this.player.applyPassiveEffect({ type: passive, value });
    this.isLevelUpModalOpen = false;
    this.pendingLevelUps = Math.max(this.pendingLevelUps - 1, 0);
    this._resumeAfterChoice();
  }

  chooseSkill(skill) {
    this.player.applySkillEffect(skill);
    this.isSkillChoiceModalOpen = false;
    this._resumeAfterChoice();
  }

  _getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  _getRandomSpawnAroundPlayer(min, max) {
    const maximumAttempts = 20;
    const { x, z } = this.player.position;
    const spawnBox = new THREE.Box3();
    const spawnCenter = new THREE.Vector3();

    for (let attempt = 0; attempt < maximumAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this._getRandomFloat(min, max);
      const candidateX = x + Math.cos(angle) * dist;
      const candidateZ = z + Math.sin(angle) * dist;

      spawnBox.setFromCenterAndSize(
        spawnCenter.set(candidateX, 1.5, candidateZ),
        new THREE.Vector3(3, 3, 3)
      );
      if (
        !this.tileManager.intersectsSolid(spawnBox) &&
        !this.tileManager.isHazardAt(candidateX, candidateZ)
      ) {
        return new THREE.Vector3(candidateX, 0, candidateZ);
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = this._getRandomFloat(min, max);
    return new THREE.Vector3(
      x + Math.cos(angle) * dist,
      0,
      z + Math.sin(angle) * dist
    );
  }

  _spawnItem() {
    const spawnPosition = this._getRandomSpawnAroundPlayer(
      ITEM_SPAWN_DISTANCE.min,
      ITEM_SPAWN_DISTANCE.max
    );
    this._spawnItemAt(spawnPosition);
  }

  _spawnItemAt(position) {
    const spawnPosition = position.clone();
    spawnPosition.y = 0.25;
    const item = new Item(spawnPosition, 0.05, 0x800080);
    this.add(item);
    this.items.push(item);
  }

  spawnBossChest(position) {
    this._spawnItemAt(position);
  }

  _updateCamps() {
    const { x, z } = this.player.position;
    for (const poi of this.tileManager.getPointsOfInterest()) {
      if (poi.type !== "camp" || this.lootedCamps.has(poi.id)) {
        continue;
      }
      if (Math.hypot(poi.x - x, poi.z - z) > CAMP_TRIGGER_DISTANCE) {
        continue;
      }
      this.lootedCamps.add(poi.id);
      const towardPlayer = new THREE.Vector3(x - poi.x, 0, z - poi.z);
      if (towardPlayer.lengthSq() < 1e-4) {
        towardPlayer.set(1, 0, 0);
      }
      const chestPosition = new THREE.Vector3(poi.x, 0, poi.z).addScaledVector(
        towardPlayer.normalize(),
        2.4
      );
      this.tileManager.pushOutCircle(chestPosition, 0.6);
      this._spawnItemAt(chestPosition);
      const guards = CAMP_GUARD_COUNT + Math.floor(this.currentDifficulty / 10);
      for (let index = 0; index < guards; index++) {
        const angle = (index / guards) * Math.PI * 2;
        const spawn = new THREE.Vector3(
          poi.x + Math.cos(angle) * 5.5,
          0,
          poi.z + Math.sin(angle) * 5.5
        );
        this.tileManager.pushOutCircle(spawn, 0.8);
        const power = this.currentDifficulty;
        const guard = new Enemy(
          this.player,
          spawn,
          4,
          BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH,
          power,
          false,
          undefined,
          { isElite: true }
        );
        this.add(guard);
        this.enemies.push(guard);
      }
      audio.play("campAlert");
      this._announce(
        "ABANDONED CAMP",
        "#ffb050",
        "⛺",
        "ELITES GUARD THE LOOT"
      );
    }
  }

  _spawnEnemy(difficulty) {
    const postMaxLevels = Math.max(
      this.currentDifficulty - DIFFICULTY_COLOR_MAX_LEVEL,
      0
    );
    if (
      postMaxLevels > 0 &&
      Math.random() < postMaxLevels * POST_MAX_BOSS_CHANCE_PER_LEVEL
    ) {
      this._spawnBoss(difficulty, {
        announce: false,
        canSummon: false,
        dropsChest: false,
      });
      return;
    }

    const spawnPosition = this._getRandomSpawnAroundPlayer(
      ENEMY_SPAWN_DISTANCE.min,
      ENEMY_SPAWN_DISTANCE.max
    );
    const biome = this.tileManager.getBiomeNameAt(
      spawnPosition.x,
      spawnPosition.z
    );
    const biasMap = {
      snow: "tank",
      desert: "runner",
      volcanic: "brute",
      crystal: "runner",
      swamp: "tank",
    };
    const bias = biasMap[biome];
    const forcedArchetype =
      bias && Math.random() < ENEMY_BIOME_BIAS_CHANCE ? bias : undefined;
    const power = difficulty;
    const enemy = new Enemy(
      this.player,
      spawnPosition,
      4,
      BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH,
      power,
      false,
      forcedArchetype
    );
    this.add(enemy);
    this.enemies.push(enemy);
  }

  _spawnEnemyPack(difficulty) {
    const count = Math.random() < 0.2 + difficulty * 0.01 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this._spawnEnemy(difficulty);
    }
  }

  _spawnBoss(difficulty, options = {}) {
    const spawnPosition = this._getRandomSpawnAroundPlayer(
      ENEMY_SPAWN_DISTANCE.min,
      ENEMY_SPAWN_DISTANCE.max
    );
    const power = difficulty;
    const health =
      (BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH) *
      BOSS_HEALTH_MULTIPLIER;
    const boss = new Enemy(
      this.player,
      spawnPosition,
      BOSS_SPEED,
      health,
      power,
      true
    );
    boss.canSummon = options.canSummon ?? true;
    boss.dropsChest = options.dropsChest ?? true;
    this.add(boss);
    this.enemies.push(boss);

    if (options.announce !== false) {
      audio.play("bossSpawn");
      this._announce("A BOSS HAS APPEARED", "#ff3333", "☠", "IT HUNTS YOU");
    }
  }

  _announceAchievements(achievementIds) {
    for (const id of achievementIds) {
      const achievement = ACHIEVEMENTS[id];
      if (!achievement) {
        continue;
      }
      audio.play("achievementUnlock");
      this.onAchievement?.({
        id,
        label: achievement.label,
        description: achievement.description,
        reward: getAchievementReward(id),
      });
    }
  }

  onBossKilled() {
    this._announceAchievements(incrementStat("bossKills"));
  }

  onFirstNightfall() {
    if (!this.player.hasTakenDamage) {
      this._announceAchievements(incrementStat("flawlessDays"));
    }
  }

  onBloodMoonSurvived() {
    if (!this.isGameOver) {
      this._announceAchievements(incrementStat("bloodMoonsSurvived"));
    }
  }

  _announce(text, color, icon, sub) {
    if (this.onBanner) {
      this.onBanner({
        text,
        color,
        icon,
        sub,
        key: Date.now() + Math.random(),
      });
    }
  }

  addPowerEffect(effect) {
    this.powerEffects.push(effect);
  }

  _updatePowerEffects(delta) {
    for (let i = this.powerEffects.length - 1; i >= 0; i--) {
      const effect = this.powerEffects[i];
      if (!effect.update(delta)) {
        effect.dispose?.();
        this.powerEffects.splice(i, 1);
      }
    }
  }

  _updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);
      if (!projectile.parent) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  _updateEnemies(delta) {
    const despawnDistSq = ENEMY_DESPAWN_DISTANCE * ENEMY_DESPAWN_DISTANCE;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const prevX = enemy.position.x;
      const prevZ = enemy.position.z;
      enemy.update(delta);
      if (delta > 0 && enemy.velocity) {
        enemy.velocity.set(
          (enemy.position.x - prevX) / delta,
          0,
          (enemy.position.z - prevZ) / delta
        );
      }
      if (!enemy.parent) {
        this.enemies.splice(i, 1);
        continue;
      }

      if (
        !enemy.isDying &&
        enemy.position.distanceToSquared(this.player.position) > despawnDistSq
      ) {
        const spawnPosition = this._getRandomSpawnAroundPlayer(
          ENEMY_SPAWN_DISTANCE.min,
          ENEMY_SPAWN_DISTANCE.max
        );
        enemy.position.copy(spawnPosition);
        continue;
      }

      enemy.solidCheckTimer = (enemy.solidCheckTimer ?? Math.random()) - delta;
      if (enemy.solidCheckTimer <= 0) {
        enemy.solidCheckTimer = ENEMY_SOLID_CHECK_INTERVAL;
        if (
          !enemy.isDying &&
          !enemy.isDormant &&
          this.tileManager.isCircleBlocked(
            enemy.position.x,
            enemy.position.z,
            Math.max(enemy.hitboxRadius * 0.35, 0.1)
          )
        ) {
          const spawnPosition = this._getRandomSpawnAroundPlayer(
            ENEMY_SPAWN_DISTANCE.min,
            ENEMY_SPAWN_DISTANCE.max
          );
          enemy.position.copy(spawnPosition);
        }
      }
    }
  }

  _updateItems(delta) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(delta);
      if (
        !this.isPaused &&
        item.position.distanceToSquared(this.player.position) < 1
      ) {
        audio.play("chestPickup");
        this.isPaused = true;
        this.clock.stop();
        this._showSkillChoices();

        if (item.parent) {
          item.parent.remove(item);
        }
        this.items.splice(i, 1);
      }
    }
  }

  _showSkillChoices() {
    this.isSkillChoiceModalOpen = true;

    const skills = Object.keys(this.player.active_skills).filter((skill) => {
      const data = this.player.active_skills[skill];
      if (!data?.enabled) {
        return true;
      }
      if (NON_REPEATABLE_SKILLS.has(skill)) {
        return false;
      }
      const keys = Object.keys(data || {});
      return keys.length > 1;
    });
    const chosen = [];
    while (chosen.length < 3 && skills.length > 0) {
      const skill = skills.splice(
        Math.floor(Math.random() * skills.length),
        1
      )[0];
      if (skill) {
        chosen.push(skill);
      }
    }

    if (this.onShowSkillChoices) {
      this.onShowSkillChoices(chosen, this.player.rerollsLeft ?? 0);
    }
  }

  rerollSkillChoices() {
    if (!this.isSkillChoiceModalOpen || (this.player.rerollsLeft ?? 0) <= 0) {
      return;
    }
    this.player.rerollsLeft -= 1;
    this._showSkillChoices();
  }

  _resolveEnemyCollisions() {
    const cellSize = 4;
    const grid = new Map();

    for (let enemyIndex = 0; enemyIndex < this.enemies.length; enemyIndex++) {
      const enemy = this.enemies[enemyIndex];
      const key = `${Math.floor(enemy.position.x / cellSize)}_${Math.floor(
        enemy.position.z / cellSize
      )}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(enemyIndex);
    }

    for (let enemyIndex = 0; enemyIndex < this.enemies.length; enemyIndex++) {
      const enemy = this.enemies[enemyIndex];
      const cellX = Math.floor(enemy.position.x / cellSize);
      const cellZ = Math.floor(enemy.position.z / cellSize);

      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
          const cell = grid.get(`${cellX + offsetX}_${cellZ + offsetZ}`);
          if (!cell) {
            continue;
          }
          for (const neighborIndex of cell) {
            if (neighborIndex <= enemyIndex) {
              continue;
            }
            enemy.resolveCollision(this.enemies[neighborIndex]);
          }
        }
      }
    }
  }

  _triggerScreenShake(duration = 0.25, intensity = 0.35) {
    this.shakeTime = duration;
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  _resolveCollisions(delta) {
    const playerRadius = PLAYER_RADIUS;

    this._resolveEnemyCollisions();

    for (const projectile of this.projectiles) {
      if (!projectile.parent) {
        continue;
      }
      const projectileBox = projectile.getCollisionBox();
      const hitTerrain = this.tileManager.intersectsSolid(projectileBox);
      if (hitTerrain && projectile.parent) {
        projectile.parent.remove(projectile);
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.isDying || projectile.hitEnemies.has(enemy)) {
          continue;
        }
        const hitDistance = enemy.hitboxRadius + PROJECTILE_SIZE / 2;
        if (
          projectile.position.distanceToSquared(enemy.position) <
          hitDistance * hitDistance
        ) {
          const projectileDamage = projectile.damage;
          const overchargeSkill = this.player.active_skills.overcharge;
          enemy.hit(
            projectileDamage,
            projectile.isCritical,
            overchargeSkill?.enabled ? "powerOvercharge" : null
          );
          enemy.applyKnockback?.(
            projectile.direction,
            projectile.isCritical ? 7 : 4
          );
          if (projectile.isCritical) {
            const hitPosition = enemy.position.clone();
            hitPosition.y += enemy.size ?? 1;
            showDamageText(Math.round(projectileDamage), hitPosition, true);

            if (overchargeSkill?.enabled) {
              const burstOrigin = enemy.position.clone();
              spawnRingWave(this, burstOrigin, {
                maxRadius: overchargeSkill.range,
                duration: 0.35,
                color: 0xffee00,
                onWaveHit: (target) => {
                  if (target !== enemy) {
                    target.hit(overchargeSkill.damage);
                  }
                },
              });
            }
          }
          projectile.hitEnemies.add(enemy);
          if (this.player.lifeSteal > 0) {
            this.player.health = Math.min(
              this.player.health + projectileDamage * this.player.lifeSteal,
              this.player.maxHealth
            );
          }

          projectile.pierce -= 1;
          if (projectile.pierce <= 0) {
            if (projectile.parent) {
              projectile.parent.remove(projectile);
            }
            break;
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isDying || enemy.isDormant) {
        continue;
      }
      const minDist = playerRadius + enemy.hitboxRadius;
      const distVec = new THREE.Vector3().subVectors(
        enemy.position,
        this.player.position
      );
      const distSq = distVec.lengthSq();
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const push = minDist - Math.sqrt(distSq);
        enemy.position.add(distVec.normalize().multiplyScalar(push));
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.parent || enemy.isDying || enemy.isDormant) {
        continue;
      }
      enemy.damageTimer = (enemy.damageTimer || 0) - delta;
      const minDist = playerRadius + enemy.hitboxRadius;
      const distSq = enemy.position.distanceToSquared(this.player.position);
      if (
        distSq < minDist * minDist &&
        enemy.damageTimer <= 0 &&
        !enemy.isFrozen
      ) {
        const damage =
          (BASE_ENEMY_DAMAGE + ENEMY_DAMAGE_GROWTH * enemy.difficulty) *
          enemy.damageMultiplier *
          (this.isFullMoon ? FULL_MOON_DAMAGE_MULTIPLIER : 1);
        const tookDamage = this.player.takeDamage(Math.floor(damage), enemy);
        if (tookDamage) {
          this._triggerScreenShake();
          if (enemy.isBoss) {
            audio.play("bossAttack", { position: enemy.position });
          } else if (enemy.isMimic) {
            audio.play("mimicHit", { position: enemy.position });
          } else if (enemy.isStalker) {
            audio.play("stalkerAttack", { position: enemy.position });
          }
        }
        enemy.damageTimer = 1;
      }
    }
  }

  _updateSpawns(delta, difficulty) {
    this.enemySpawnTimer += delta;
    const moonFactor = this.isFullMoon ? FULL_MOON_SPAWN_MULTIPLIER : 1;
    const interval = Math.max(
      0.5,
      this.nextEnemySpawnTime / ((1 + difficulty * 0.1) * moonFactor)
    );
    if (this.enemySpawnTimer >= interval) {
      this.enemySpawnTimer = 0;
      this._spawnEnemyPack(difficulty);
      this.nextEnemySpawnTime = this._getRandomFloat(
        ENEMY_SPAWN_INTERVAL.min,
        ENEMY_SPAWN_INTERVAL.max
      );
    }

    this.itemSpawnTimer += delta;
    if (this.itemSpawnTimer >= this.nextItemSpawnTime) {
      this.itemSpawnTimer = 0;
      this._spawnItem();
      this.nextItemSpawnTime = this._getRandomFloat(
        ITEM_SPAWN_INTERVAL.min,
        ITEM_SPAWN_INTERVAL.max
      );
    }

    this.mimicSpawnTimer += delta;
    if (this.mimicSpawnTimer >= this.nextMimicSpawnTime) {
      this.mimicSpawnTimer = 0;
      this._spawnMimic(difficulty);
      this.nextMimicSpawnTime = this._getRandomFloat(
        MIMIC_SPAWN_INTERVAL.min,
        MIMIC_SPAWN_INTERVAL.max
      );
    }
  }

  update(camera) {
    const delta = this.isPaused
      ? 0
      : Math.min(this.clock.getDelta(), MAX_FRAME_DELTA);
    if (this.isPaused) {
      return;
    }

    this.elapsedTime += delta;
    const levelTimeBonus =
      (this.player.level - 1) *
      (DIFFICULTY_INCREASE_INTERVAL_SECONDS / LEVELS_PER_ENEMY_POWER);
    const effectiveSeconds = this.elapsedTime + levelTimeBonus;
    const difficulty = Math.floor(
      effectiveSeconds / DIFFICULTY_INCREASE_INTERVAL_SECONDS
    );
    this.currentDifficulty = INITIAL_DIFFICULTY + difficulty;
    this.currentPower = this.currentDifficulty;
    if (!this._skullMaxPlayed && this.currentDifficulty >= DIFFICULTY_COLOR_MAX_LEVEL) {
      this._skullMaxPlayed = true;
      audio.play("skullMax");
    }
    if (this.currentDifficulty > (this._recordedPower ?? -1)) {
      this._recordedPower = this.currentDifficulty;
      this._announceAchievements(raiseStat("maxPower", this.currentDifficulty));
    }
    this.currentPowerContinuous =
      effectiveSeconds / DIFFICULTY_INCREASE_INTERVAL_SECONDS;

    if (
      this.currentDifficulty > this.highestBossDifficultySpawned &&
      this.currentDifficulty % BOSS_SPAWN_EVERY_LEVELS === 0
    ) {
      this.highestBossDifficultySpawned = this.currentDifficulty;
      this._spawnBoss(this.currentDifficulty);
    }

    if (
      !this._evilLaughPlayed &&
      this.currentDifficulty >=
        (audio.repository.get("evilLaugh")?.skullPowerTrigger ?? 17)
    ) {
      this._evilLaughPlayed = true;
      audio.play("evilLaugh");
    }
    audio.setScheduler(
      "evilLaugh",
      this.currentDifficulty >= SKULL_CRAZE_START
    );

    if (this.isFullMoon && !this._fullMoonAnnounced) {
      this._fullMoonAnnounced = true;
      this._announce(
        "BLOOD MOON RISES",
        "#ff4444",
        "🌕",
        "ENEMIES ARE FASTER AND STRONGER"
      );
    }
    if (!this.isFullMoon) {
      this._fullMoonAnnounced = false;
    }
    if (this.isMist && !this._mistAnnounced) {
      this._mistAnnounced = true;
      this._announce(
        "THE MIST THICKENS",
        "#aabbcc",
        "🌫",
        "RED EYES IN THE FOG"
      );
    }
    if (!this.isMist) {
      this._mistAnnounced = false;
    }

    this.player.update(delta);
    const { x, y, z } = this.player.position;
    this.tileManager.update(x, z, delta);
    this._updateCamps();

    this._updateProjectiles(delta);
    this._updateEnemies(delta);
    this._updatePowerEffects(delta);
    updateKillEffects(this, delta);
    updatePowerFx(this, delta);
    this._updateItems(delta);
    this._resolveCollisions(delta);
    this._updateSpawns(delta, difficulty);

    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      const strength =
        this.shakeIntensity * Math.max(this.shakeTime / this.shakeDuration, 0);
      shakeX = (Math.random() * 2 - 1) * strength;
      shakeY = (Math.random() * 2 - 1) * strength;
      shakeZ = (Math.random() * 2 - 1) * strength;
    }

    camera.position.set(x + shakeX, y + 10 + shakeY, z + 10 + shakeZ);
    camera.lookAt(x, y, z);
  }
}
