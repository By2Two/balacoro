export const ENEMY_SPAWN_INTERVAL = { min: 1.2, max: 2 };
export const ITEM_SPAWN_INTERVAL = { min: 60, max: 120 };
export const ENEMY_SPAWN_DISTANCE = { min: 50, max: 80 };
export const ENEMY_DESPAWN_DISTANCE = 110;
export const ITEM_SPAWN_DISTANCE = { min: 20, max: 50 };

export const BASE_ENEMY_HEALTH = 2;
export const ENEMY_HEALTH_GROWTH = 1;

export const BASE_ENEMY_DAMAGE = 10;
export const ENEMY_DAMAGE_GROWTH = 1;

export const PLAYER_RADIUS = 0.5;
export const ENEMY_RADIUS = 0.5;

export const DIFFICULTY_INCREASE_INTERVAL_SECONDS = 240;
export const INITIAL_DIFFICULTY = 0;

export const BOSS_SPAWN_EVERY_LEVELS = 2;
export const BOSS_SIZE_MULTIPLIER = 4;
export const BOSS_HEALTH_MULTIPLIER = 15;
export const BOSS_DAMAGE_MULTIPLIER = 2;
export const BOSS_XP_MULTIPLIER = 10;
export const BOSS_SPEED = 3;

export const PLAYER_INITIAL_HEALTH = 100;
export const PLAYER_INITIAL_SPEED = 7;
export const PLAYER_INITIAL_DAMAGE = 1;
export const PLAYER_INITIAL_ATTACK_SPEED = 1;
export const PLAYER_INITIAL_SHARPENING = 1;
export const PLAYER_INITIAL_HEALTH_REGEN = 0;
export const PLAYER_INITIAL_CRITICAL_DAMAGE = 0.5;
export const PLAYER_INITIAL_CRITICAL_CHANCE = 0;
export const PLAYER_INITIAL_LIFE_STEAL = 0;
export const INITIAL_PLAYER_SKILLS = {
  dash: {
    enabled: false,
    cooldown: 10,
    charges: 1,
    growthCharges: 1,
    growthCooldown: -0.5,
    maxCooldown: 1,
  },
  energyExplosion: {
    enabled: false,
    cooldown: 15,
    damage: 1,
    range: 2,
    growthCooldown: -0.5,
    growthDamage: 0.4,
    growthRange: 0.5,
    maxCooldown: 4,
  },
  freezeExplosion: {
    enabled: false,
    cooldown: 15,
    duration: 5,
    range: 3,
    growthCooldown: -0.5,
    growthRange: 0.5,
    growthDuration: 0.2,
    maxCooldown: 3,
  },
  forceField: {
    enabled: false,
    shieldCount: 1,
    growthShieldCount: 1,
    cooldown: 15,
    growthCooldown: -0.5,
    maxCooldown: 5,
  },
  thorns: { enabled: false, damage: 1, growthDamage: 0.4 },
  glowing: { enabled: false },
  projectGlowing: { enabled: false },
  orbitalBlades: {
    enabled: false,
    count: 1,
    damage: 0.4,
    range: 1.6,
    growthCount: 1,
    growthDamage: 0.25,
    growthRange: 0.12,
    maxCount: 8,
    maxRange: 2.6,
  },
  twinShot: { enabled: false },
  berserker: {
    enabled: false,
    bonus: 0.15,
    growthBonus: 0.08,
    maxBonus: 0.6,
  },
  overcharge: {
    enabled: false,
    damage: 0.6,
    range: 1.3,
    growthDamage: 0.3,
    growthRange: 0.15,
    maxDamage: 3,
    maxRange: 2.2,
  },
  adrenaline: {
    enabled: false,
    duration: 1.2,
    speedBonus: 0.12,
    attackSpeedBonus: 0.12,
    growthDuration: 0.15,
    growthSpeedBonus: 0.04,
    growthAttackSpeedBonus: 0.04,
    maxDuration: 3,
    maxSpeedBonus: 0.4,
    maxAttackSpeedBonus: 0.4,
  },
  secondWind: { enabled: false },
  staticField: {
    enabled: false,
    chance: 0.12,
    freezeDuration: 0.5,
    growthChance: 0.06,
    growthFreezeDuration: 0.15,
    maxChance: 0.7,
    maxFreezeDuration: 2,
  },
};

export const PLAYER_PASSIVES = {
  health: {
    initial: PLAYER_INITIAL_HEALTH,
    increment: 15,
  },
  damage: {
    initial: PLAYER_INITIAL_DAMAGE,
    increment: 0.5,
  },
  speed: {
    initial: PLAYER_INITIAL_SPEED,
    increment: 1,
  },
  attackSpeed: {
    initial: PLAYER_INITIAL_ATTACK_SPEED,
    increment: 0.1,
  },
  sharpening: {
    initial: PLAYER_INITIAL_SHARPENING,
    increment: 1,
  },
  healthRegen: {
    initial: PLAYER_INITIAL_HEALTH_REGEN,
    increment: 0.4,
  },
  criticalDamage: {
    initial: PLAYER_INITIAL_CRITICAL_DAMAGE,
    increment: 0.05,
  },
  criticalChance: {
    initial: PLAYER_INITIAL_CRITICAL_CHANCE,
    increment: 0.03,
  },
  lifeSteal: {
    initial: PLAYER_INITIAL_LIFE_STEAL,
    increment: 0.03,
  },
};

export const PASSIVE_COLORS = {
  health: "#33ff66",
  damage: "#ff5522",
  speed: "#3399ff",
  attackSpeed: "#ff3333",
  sharpening: "#ff9900",
  healthRegen: "#66ffcc",
  criticalDamage: "#cc33ff",
  criticalChance: "#ffcc00",
  lifeSteal: "#ff0066",
};

export const PLAYER_INITIAL_LEVEL = 1;
export const PLAYER_INITIAL_XP = 0;

export const PLAYER_LIGHT_COLOR = 0xf5e690;
export const PLAYER_LIGHT_INTENSITY_GLOWING = 22;
export const PLAYER_LIGHT_INTENSITY_NORMAL = 4.5;
export const PLAYER_LIGHT_HEIGHT = 3.2;
export const PLAYER_LIGHT_CONE_ANGLE = 1.15;
export const PLAYER_LIGHT_DISTANCE_GLOWING = 50;
export const PLAYER_LIGHT_DISTANCE_NORMAL = 10;

export const PLAYER_COLOR = 0xffee00;
export const PLAYER_EMISSIVE_COLOR = 0xf5e690;
export const PLAYER_EMISSIVE_INTENSITY = 1.5;

export const PLAYER_XP_BASE = 10;
export const PLAYER_XP_GROWTH_RATE = 1.2;

export const PROJECTILE_SPEED_BASE = 10;
export const PROJECTILE_LIFETIME = 10;
export const PROJECTILE_DAMAGE = 1;
export const PROJECTILE_SIZE = 0.5;
export const PROJECTILE_COLOR = 0x00ff00;

export const DAY_DURATION = 360;
export const NIGHT_DURATION = 180;
export const ENABLE_MINI_VIEW = true;

export const ELITE_CHANCE = 0.005;
export const POST_MAX_ELITE_CHANCE_PER_LEVEL = 0.01;
export const POST_MAX_BOSS_CHANCE_PER_LEVEL = 0.004;
export const ELITE_HEALTH_MULTIPLIER = 5;
export const ELITE_DAMAGE_MULTIPLIER = 2;
export const ELITE_SIZE_MULTIPLIER = 1.45;
export const ELITE_SPEED_MULTIPLIER = 1.15;
export const ELITE_XP_MULTIPLIER = 3;
export const ELITE_COIN_MULTIPLIER = 2;
export const ELITE_MODIFIERS = ["shield", "swift", "regen"];
export const ELITE_SHIELD_FRACTION = 0.6;
export const ELITE_SHIELD_RECHARGE_DELAY = 4;
export const ELITE_SHIELD_RECHARGE_RATE = 0.2;
export const ELITE_SWIFT_SPEED_MULTIPLIER = 1.6;
export const ELITE_REGEN_DELAY = 1.5;
export const ELITE_REGEN_RATE = 0.05;

export const SPLITTER_MAX_GENERATION = 2;
export const SPLITTER_CHILD_COUNT = 2;
export const SPLITTER_CHILD_SIZE = 0.68;
export const SPLITTER_CHILD_HEALTH = 0.45;
export const SPLITTER_CHILD_SPEED = 1.25;
export const SPLITTER_CHILD_REWARD = 0.5;
export const SPLITTER_BUDS_PER_GENERATION = 2;
export const SPLITTER_SPAWN_GRACE = 0.2;

export const BOMBER_ARM_DISTANCE = 2.2;
export const BOMBER_FUSE_TIME = 1.1;
export const BOMBER_BLAST_RADIUS = 3.2;
export const BOMBER_DAMAGE_MULTIPLIER = 2.5;
export const BOMBER_ENEMY_DAMAGE_FRACTION = 0.5;
export const BOMBER_EDGE_DAMAGE = 0.4;

export const STALKER_REVEAL_DISTANCE = 1;
export const STALKER_RECLOAK_DISTANCE = 4;
export const STALKER_CLOAK_OPACITY = 0.07;
export const STALKER_HIT_REVEAL_TIME = 1.2;
export const STALKER_LUNGE_TIME = 0.6;
export const STALKER_LUNGE_SPEED_MULTIPLIER = 1.8;
export const STALKER_WHISPER_DISTANCE = 14;

export const MORTAR_RANGE = 18;
export const MORTAR_MIN_DISTANCE = 9;
export const MORTAR_FIRE_INTERVAL = { min: 3.5, max: 5.5 };
export const MORTAR_WINDUP_TIME = 0.55;
export const MORTAR_SHELL_FLIGHT_TIME = 3;
export const MORTAR_SHELL_APEX = 11;
export const MORTAR_BLAST_RADIUS = 2.6;
export const MORTAR_DAMAGE_MULTIPLIER = 2;

export const LEVELS_PER_ENEMY_POWER = 10;
export const ENEMY_BIOME_BIAS_CHANCE = 0.4;
export const ENEMY_SOLID_CHECK_INTERVAL = 1.5;
export const ENEMY_DEATH_DURATION = 0.4;
export const ENEMY_FLASH_DURATION = 0.08;
export const ENEMY_DEATH_PARTICLE_COUNT = 8;
export const ENEMY_STUCK_THRESHOLD = 0.35;
export const ENEMY_RESTUCK_THRESHOLD = 0.05;
export const ENEMY_DETOUR_MAX_TIME = 3;

export const BIOME_CELL_SIZE = 150;
export const BIOME_BLEND_BAND = 14;
export const BIOME_WARP_AMOUNT = 38;
export const BIOME_WEIGHTS = {
  forest: 3,
  autumn: 2,
  snow: 2,
  desert: 2,
  swamp: 1.5,
  volcanic: 1,
  crystal: 0.8,
};
export const SAFE_START_RADIUS = 14;
export const STRUCTURE_CHANCE = 0.08;
export const CAMP_REGION_SIZE = 4;
export const CAMP_CHANCE = 0.55;
export const CAMP_TRIGGER_DISTANCE = 16;
export const CAMP_GUARD_COUNT = 3;
export const TILE_BUILD_BUDGET = 1;
export const FLOW_FIELD_SIZE = 96;
export const FLOW_FIELD_INTERVAL = 0.3;
export const LAVA_DAMAGE_PER_SECOND = 14;
export const SWAMP_FOG_DENSITY = 0.032;
export const VOLCANIC_FOG_DENSITY = 0.018;

export const BOSS_SPECIAL_COOLDOWN = { min: 5, max: 9 };
export const BOSS_SPECIAL_RANGE = 40;
export const BOSS_TELEGRAPH_TIME = 0.8;
export const BOSS_CHARGE_TIME = 0.7;
export const BOSS_CHARGE_SPEED_MULTIPLIER = 5;
export const BOSS_SUMMON_COUNT = 3;

export const MIMIC_SPAWN_INTERVAL = { min: 40, max: 80 };
export const MIMIC_WAKE_DISTANCE = 6;
export const MIMIC_HEALTH_MULTIPLIER = 2;
export const MIMIC_COIN_MULTIPLIER = 5;
export const COIN_REWARD_MULTIPLIER = 10;

export const FULL_MOON_NIGHT_INTERVAL = 3;
export const FULL_MOON_SPAWN_MULTIPLIER = 2;
export const FULL_MOON_COIN_MULTIPLIER = 2;
export const FULL_MOON_SPEED_MULTIPLIER = 1.35;
export const FULL_MOON_DAMAGE_MULTIPLIER = 1.25;

export const DEFAULT_FOG_DENSITY = 0.01;
export const MIST_FOG_DENSITY = 0.05;
export const MIST_CHECK_INTERVAL = { min: 60, max: 120 };
export const MIST_CHANCE = 0.1;
export const MIST_DURATION = { min: 30, max: 60 };
export const RAIN_CHECK_INTERVAL = { min: 45, max: 90 };
export const RAIN_CHANCE = 0.4;
export const RAIN_DURATION = { min: 25, max: 50 };
export const WEATHER_FADE_SPEED = 0.45;

export const MIMIC_WAKE_GROW_TIME = 0.35;

export const CRITICAL_FLASH_DURATION = 0.18;
export const CRITICAL_FLASH_COLOR = 0xff2222;
export const CRITICAL_PUNCH_SCALE = 0.3;

export const BANNER_DURATION = 3.5;

export const LOW_HEALTH_THRESHOLD = 0.4;
export const SECOND_WIND_INVINCIBILITY_DURATION = 5;
export const TWIN_SHOT_DAMAGE_MULTIPLIER = 1;

export const TONE_MAPPING_EXPOSURE = { night: 1.05, noon: 1.05 };
export const SUN_INTENSITY = { horizon: 1.1, noon: 3.2 };
export const DAY_AMBIENT = { horizon: 0.22, noon: 0.3 };
export const MOON_LIGHT = { intensity: 1.1, color: 0x9db4ff, bloodColor: 0xff6a5a };
export const NIGHT_AMBIENT = { intensity: 0.32, color: 0x8594cc, bloodColor: 0xb05050 };
export const BLOOM_ENABLED = true;
export const BLOOM_RADIUS = 0.45;
export const BLOOM_STRENGTH = { night: 0.75, noon: 0.2 };
export const BLOOM_THRESHOLD = { night: 0.95, noon: 4 };
export const GRADING_SATURATION = 1.15;
export const GRADING_CONTRAST = 1.08;
export const GRADING_VIGNETTE = 0.35;
export const GRADING_MIST_SATURATION = 0.6;
export const GRADING_TINTS = {
  day: { shadow: [0.94, 0.98, 1.08], highlight: [1.06, 1.0, 0.92] },
  night: { shadow: [0.82, 0.9, 1.18], highlight: [0.92, 1.0, 1.12] },
  bloodmoon: { shadow: [1.2, 0.78, 0.78], highlight: [1.12, 0.9, 0.88] },
};

export const PLAYER_WALK_ANIMATION = true;
export const ENEMY_WALK_ANIMATION = true;
