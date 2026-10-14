import {
  ELITE_MODIFIERS,
  ELITE_SHIELD_FRACTION,
  ELITE_SHIELD_RECHARGE_DELAY,
  ELITE_SHIELD_RECHARGE_RATE,
  ELITE_REGEN_DELAY,
  ELITE_REGEN_RATE,
  SPLITTER_MAX_GENERATION,
  SPLITTER_CHILD_SIZE,
  SPLITTER_CHILD_HEALTH,
  SPLITTER_CHILD_SPEED,
  SPLITTER_BUDS_PER_GENERATION,
  BOMBER_ARM_DISTANCE,
  BOMBER_BLAST_RADIUS,
  BOMBER_EDGE_DAMAGE,
} from "../constants.js";

export function pickEliteModifier(random = Math.random) {
  return ELITE_MODIFIERS[
    Math.min(Math.floor(random() * ELITE_MODIFIERS.length), ELITE_MODIFIERS.length - 1)
  ];
}

export function getMaxShield(modifier, maxHealth) {
  return modifier === "shield" ? Math.max(1, maxHealth * ELITE_SHIELD_FRACTION) : 0;
}

export function absorbDamage(shield, damage) {
  const absorbed = Math.min(Math.max(shield, 0), damage);
  return { shield: shield - absorbed, damage: damage - absorbed };
}

export function rechargeShield(shield, maxShield, timeSinceDamage, delta) {
  if (maxShield <= 0 || timeSinceDamage < ELITE_SHIELD_RECHARGE_DELAY) {
    return shield;
  }
  return Math.min(maxShield, shield + maxShield * ELITE_SHIELD_RECHARGE_RATE * delta);
}

export function regenerateHealth(health, maxHealth, timeSinceDamage, delta) {
  if (timeSinceDamage < ELITE_REGEN_DELAY) {
    return health;
  }
  return Math.min(maxHealth, health + maxHealth * ELITE_REGEN_RATE * delta);
}

export function getSplitGeneration(genome) {
  return genome?.splitGeneration ?? 0;
}

export function canSplit(genome) {
  return (
    genome?.archetype === "splitter" &&
    getSplitGeneration(genome) < SPLITTER_MAX_GENERATION
  );
}

export function getBudCount(generation) {
  return Math.max(SPLITTER_MAX_GENERATION - generation, 0) * SPLITTER_BUDS_PER_GENERATION;
}

export function createSplitlingGenome(parentGenome) {
  const generation = getSplitGeneration(parentGenome) + 1;
  return {
    ...parentGenome,
    splitGeneration: generation,
    sizeMult: parentGenome.sizeMult * SPLITTER_CHILD_SIZE,
    speedMult: parentGenome.speedMult * SPLITTER_CHILD_SPEED,
    stretch: { ...parentGenome.stretch },
    parts: { ...parentGenome.parts, buds: getBudCount(generation) },
  };
}

export function getSplitlingHealth(parentMaxHealth) {
  return Math.max(1, parentMaxHealth * SPLITTER_CHILD_HEALTH);
}

export function shouldArmBomber(distanceToTarget, hitboxRadius) {
  return distanceToTarget <= BOMBER_ARM_DISTANCE + hitboxRadius;
}

export function getBlastRadius(size) {
  return BOMBER_BLAST_RADIUS * (0.7 + 0.3 * size);
}

export function getBlastDamage(baseDamage, distance, radius) {
  if (distance > radius) {
    return 0;
  }
  const falloff = 1 - (1 - BOMBER_EDGE_DAMAGE) * (Math.max(distance, 0) / radius);
  return baseDamage * falloff;
}
