import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  UPGRADE_DEFS,
  UPGRADE_IDS,
  sanitizeUpgradeLevels,
  loadUpgradeLevels,
  getUpgradePrice,
  getUpgradeBonuses,
  purchaseUpgrade,
} from "./upgrades.js";
import { getCoins } from "./wallet.js";

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe("upgrade levels", () => {
  it("clamps garbage to valid levels", () => {
    const levels = sanitizeUpgradeLevels({ vitality: 99, might: -3, wisdom: "2", greed: "x" });
    expect(levels.vitality).toBe(UPGRADE_DEFS.vitality.maxLevel);
    expect(levels.might).toBe(0);
    expect(levels.wisdom).toBe(2);
    expect(levels.greed).toBe(0);
    expect(Object.keys(levels).sort()).toEqual([...UPGRADE_IDS].sort());
  });

  it("price doubles each level and is null when maxed", () => {
    const base = UPGRADE_DEFS.vitality.basePrice;
    expect(getUpgradePrice("vitality", 0)).toBe(base);
    expect(getUpgradePrice("vitality", 2)).toBe(base * 4);
    expect(getUpgradePrice("vitality", UPGRADE_DEFS.vitality.maxLevel)).toBeNull();
    expect(getUpgradePrice("nope", 0)).toBeNull();
  });

  it("no upgrades means no bonuses", () => {
    expect(getUpgradeBonuses({})).toEqual({
      maxHealth: 0,
      damage: 0,
      xpMultiplier: 1,
      coinMultiplier: 1,
      rerolls: 0,
    });
  });

  it("bonuses scale with level", () => {
    const bonuses = getUpgradeBonuses({ vitality: 2, wisdom: 5, reroll: 3 });
    expect(bonuses.maxHealth).toBe(UPGRADE_DEFS.vitality.perLevel * 2);
    expect(bonuses.xpMultiplier).toBeCloseTo(1 + UPGRADE_DEFS.wisdom.perLevel * 5);
    expect(bonuses.rerolls).toBe(3);
  });
});

describe("purchaseUpgrade", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails without enough coins", () => {
    expect(purchaseUpgrade("vitality")).toBe(false);
    expect(loadUpgradeLevels().vitality).toBe(0);
  });

  it("spends coins and raises the level", () => {
    const price = UPGRADE_DEFS.vitality.basePrice;
    localStorage.setItem("balacoro_coins", String(price + 5));
    expect(purchaseUpgrade("vitality")).toBe(true);
    expect(loadUpgradeLevels().vitality).toBe(1);
    expect(getCoins()).toBe(5);
  });

  it("stops at max level", () => {
    const { maxLevel } = UPGRADE_DEFS.reroll;
    localStorage.setItem("balacoro_coins", String(1e12));
    for (let i = 0; i < maxLevel; i++) {
      expect(purchaseUpgrade("reroll")).toBe(true);
    }
    expect(purchaseUpgrade("reroll")).toBe(false);
    expect(loadUpgradeLevels().reroll).toBe(maxLevel);
  });
});
