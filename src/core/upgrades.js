import { spendCoins } from "./wallet.js";

const UPGRADES_KEY = "balacoro_upgrades";

export const UPGRADE_DEFS = {
  vitality: {
    label: "VITALITY",
    icon: "❤",
    color: "#ff5a6e",
    description: "Start every run with more max health.",
    perLevel: 10,
    format: (value) => `+${value} HP`,
    maxLevel: 5,
    basePrice: 40000,
  },
  might: {
    label: "MIGHT",
    icon: "⚔",
    color: "#ff9d3a",
    description: "Start every run hitting harder.",
    perLevel: 0.1,
    format: (value) => `+${+value.toFixed(1)} DMG`,
    maxLevel: 5,
    basePrice: 60000,
  },
  wisdom: {
    label: "WISDOM",
    icon: "✦",
    color: "#5dff7a",
    description: "Every kill gives more XP, so you level up faster.",
    perLevel: 0.08,
    format: (value) => `+${Math.round(value * 100)}% XP`,
    maxLevel: 5,
    basePrice: 50000,
  },
  greed: {
    label: "GREED",
    icon: "◉",
    color: "#ffd23e",
    description: "Earn more coins from everything you kill.",
    perLevel: 0.1,
    format: (value) => `+${Math.round(value * 100)}% COINS`,
    maxLevel: 5,
    basePrice: 75000,
  },
  reroll: {
    label: "REROLL",
    icon: "↻",
    color: "#59c8ff",
    description: "Reroll the skill options when you open a chest.",
    perLevel: 1,
    format: (value) => `${value} PER RUN`,
    maxLevel: 3,
    basePrice: 100000,
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADE_DEFS);

export function sanitizeUpgradeLevels(raw) {
  const levels = {};
  for (const id of UPGRADE_IDS) {
    const value = Math.floor(Number(raw?.[id]) || 0);
    levels[id] = Math.min(Math.max(value, 0), UPGRADE_DEFS[id].maxLevel);
  }
  return levels;
}

export function loadUpgradeLevels() {
  try {
    return sanitizeUpgradeLevels(JSON.parse(localStorage.getItem(UPGRADES_KEY)));
  } catch {
    return sanitizeUpgradeLevels(null);
  }
}

function saveUpgradeLevels(levels) {
  try {
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(levels));
  } catch {
    return;
  }
}

export function getUpgradePrice(id, currentLevel) {
  const def = UPGRADE_DEFS[id];
  if (!def || currentLevel >= def.maxLevel) {
    return null;
  }
  return def.basePrice * 2 ** currentLevel;
}

export function getUpgradeValue(id, level) {
  return UPGRADE_DEFS[id].perLevel * level;
}

export function purchaseUpgrade(id) {
  const levels = loadUpgradeLevels();
  const price = getUpgradePrice(id, levels[id]);
  if (price == null || !spendCoins(price)) {
    return false;
  }
  levels[id] += 1;
  saveUpgradeLevels(levels);
  return true;
}

export function getUpgradeBonuses(levels = loadUpgradeLevels()) {
  const clean = sanitizeUpgradeLevels(levels);
  return {
    maxHealth: getUpgradeValue("vitality", clean.vitality),
    damage: getUpgradeValue("might", clean.might),
    xpMultiplier: 1 + getUpgradeValue("wisdom", clean.wisdom),
    coinMultiplier: 1 + getUpgradeValue("greed", clean.greed),
    rerolls: getUpgradeValue("reroll", clean.reroll),
  };
}
