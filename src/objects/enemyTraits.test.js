import { describe, expect, it } from "vitest";
import {
  pickEliteModifier,
  getMaxShield,
  absorbDamage,
  rechargeShield,
  regenerateHealth,
  canSplit,
  getBudCount,
  createSplitlingGenome,
  getSplitlingHealth,
  shouldArmBomber,
  getBlastRadius,
  getBlastDamage,
} from "./enemyTraits.js";
import {
  ELITE_MODIFIERS,
  ELITE_SHIELD_FRACTION,
  ELITE_SHIELD_RECHARGE_DELAY,
  ELITE_REGEN_DELAY,
  SPLITTER_MAX_GENERATION,
  SPLITTER_CHILD_SIZE,
  SPLITTER_CHILD_HEALTH,
  BOMBER_ARM_DISTANCE,
  BOMBER_BLAST_RADIUS,
  BOMBER_EDGE_DAMAGE,
} from "../constants.js";

const splitterGenome = {
  archetype: "splitter",
  coreSeed: 42,
  sizeMult: 1.2,
  speedMult: 0.9,
  healthMult: 1.5,
  stretch: { x: 1, y: 0.9, z: 1.1 },
  parts: { seam: true, buds: getBudCount(0) },
};

describe("elite modifiers", () => {
  it("picks every modifier across the random range", () => {
    expect(pickEliteModifier(() => 0)).toBe(ELITE_MODIFIERS[0]);
    expect(pickEliteModifier(() => 0.999999)).toBe(ELITE_MODIFIERS.at(-1));
    expect(pickEliteModifier(() => 1)).toBe(ELITE_MODIFIERS.at(-1));
  });

  it("only shielded elites get a shield", () => {
    expect(getMaxShield("shield", 100)).toBe(100 * ELITE_SHIELD_FRACTION);
    expect(getMaxShield("swift", 100)).toBe(0);
    expect(getMaxShield(null, 100)).toBe(0);
  });

  it("shield absorbs damage before health", () => {
    expect(absorbDamage(10, 4)).toEqual({ shield: 6, damage: 0 });
    expect(absorbDamage(3, 10)).toEqual({ shield: 0, damage: 7 });
    expect(absorbDamage(0, 5)).toEqual({ shield: 0, damage: 5 });
  });

  it("shield only recharges after the delay and caps at max", () => {
    expect(rechargeShield(0, 10, ELITE_SHIELD_RECHARGE_DELAY - 0.1, 1)).toBe(0);
    expect(rechargeShield(0, 10, ELITE_SHIELD_RECHARGE_DELAY, 1)).toBeGreaterThan(0);
    expect(rechargeShield(9.9, 10, 99, 10)).toBe(10);
    expect(rechargeShield(0, 0, 99, 1)).toBe(0);
  });

  it("regen waits after damage and never overheals", () => {
    expect(regenerateHealth(5, 10, ELITE_REGEN_DELAY - 0.1, 1)).toBe(5);
    expect(regenerateHealth(5, 10, ELITE_REGEN_DELAY, 1)).toBeGreaterThan(5);
    expect(regenerateHealth(9.99, 10, 99, 10)).toBe(10);
  });
});

describe("splitter", () => {
  it("splits until the max generation", () => {
    let genome = splitterGenome;
    for (let generation = 0; generation < SPLITTER_MAX_GENERATION; generation++) {
      expect(canSplit(genome)).toBe(true);
      genome = createSplitlingGenome(genome);
    }
    expect(genome.splitGeneration).toBe(SPLITTER_MAX_GENERATION);
    expect(canSplit(genome)).toBe(false);
  });

  it("other archetypes never split", () => {
    expect(canSplit({ ...splitterGenome, archetype: "tank" })).toBe(false);
    expect(canSplit(undefined)).toBe(false);
  });

  it("buds show how many splits are left", () => {
    expect(getBudCount(0)).toBeGreaterThan(getBudCount(1));
    expect(getBudCount(SPLITTER_MAX_GENERATION)).toBe(0);
    const last = createSplitlingGenome(createSplitlingGenome(splitterGenome));
    expect(last.parts.buds).toBe(0);
  });

  it("splitlings are smaller copies and do not mutate the parent", () => {
    const child = createSplitlingGenome(splitterGenome);
    expect(child.coreSeed).toBe(splitterGenome.coreSeed);
    expect(child.sizeMult).toBeCloseTo(splitterGenome.sizeMult * SPLITTER_CHILD_SIZE);
    expect(child.speedMult).toBeGreaterThan(splitterGenome.speedMult);
    child.parts.seam = false;
    child.stretch.x = 5;
    expect(splitterGenome.parts.seam).toBe(true);
    expect(splitterGenome.stretch.x).toBe(1);
    expect(splitterGenome.parts.buds).toBe(getBudCount(0));
  });

  it("splitling health is a fraction of the parent, at least 1", () => {
    expect(getSplitlingHealth(100)).toBe(100 * SPLITTER_CHILD_HEALTH);
    expect(getSplitlingHealth(0.5)).toBe(1);
  });
});

describe("bomber", () => {
  it("arms only when close to the target", () => {
    expect(shouldArmBomber(BOMBER_ARM_DISTANCE, 0.5)).toBe(true);
    expect(shouldArmBomber(BOMBER_ARM_DISTANCE + 0.6, 0.5)).toBe(false);
  });

  it("bigger bombers blow up a bigger area", () => {
    expect(getBlastRadius(1)).toBeCloseTo(BOMBER_BLAST_RADIUS);
    expect(getBlastRadius(1.5)).toBeGreaterThan(getBlastRadius(1));
  });

  it("blast damage falls off to the edge and is zero outside", () => {
    expect(getBlastDamage(100, 0, 3)).toBe(100);
    expect(getBlastDamage(100, -1, 3)).toBe(100);
    expect(getBlastDamage(100, 3, 3)).toBeCloseTo(100 * BOMBER_EDGE_DAMAGE);
    expect(getBlastDamage(100, 1.5, 3)).toBeLessThan(100);
    expect(getBlastDamage(100, 3.01, 3)).toBe(0);
  });
});
