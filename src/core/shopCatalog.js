import { HAT_OPTIONS, GLASSES_OPTIONS, EAR_OPTIONS } from "./cosmetics.js";
import { TRAIL_OPTIONS } from "./trails.js";
import { ACHIEVEMENTS, getAchievementProgress } from "./achievements.js";
import { isOwned } from "./wallet.js";

export const RARITIES = {
  common: { label: "COMMON", color: "#b8bec6" },
  rare: { label: "RARE", color: "#3fa9ff" },
  epic: { label: "EPIC", color: "#c15cff" },
  legendary: { label: "LEGENDARY", color: "#ffb31a" },
};

export const CONFIRM_PRICE_THRESHOLD = 50000;

const LEGACY_IDS = { "kill:explosion": "smoke" };

export const SLOT_FIELDS = {
  skin: "skin",
  eyes: "eyes",
  brows: "brows",
  shot: "shotShape",
  kill: "killEffect",
};

export const SLOT_DEFAULTS = {
  skin: "plain",
  eyes: "bead",
  brows: "none",
  shotShape: "box",
  killEffect: "pixels",
};

const ACCESSORY_KINDS = new Set(["hat", "ears", "glasses", "effect"]);

const PRESET_RARITY = {
  cap: "common",
  top: "common",
  cowboy: "rare",
  wizard: "rare",
  crown: "epic",
  bear: "common",
  cat: "common",
  horns: "rare",
  elf: "rare",
  bunny: "rare",
  nerd: "common",
  sun: "common",
  monocle: "rare",
  visor: "epic",
};

function fromOptions(options, kind) {
  return options
    .filter((option) => option.id !== "none")
    .map((option) => ({
      kind,
      id: option.id,
      label: option.label,
      price: option.price,
      rarity: PRESET_RARITY[option.id] ?? (kind === "effect" ? "legendary" : "common"),
    }));
}

function item(kind, id, label, price, rarity, achievement) {
  return { kind, id, label, price, rarity, achievement };
}

const EYES = [
  item("eyes", "bead", "BEAD", 0, "common"),
  item("eyes", "googly", "GOOGLY", 2000, "common"),
  item("eyes", "closed", "SLEEPY", 3000, "common"),
  item("eyes", "slit", "REPTILE", 8000, "rare"),
  item("eyes", "happy", "HAPPY", 0, "epic", "untouchable"),
];

const BROWS = [
  item("brows", "none", "NO BROWS", 0, "common"),
  item("brows", "angry", "ANGRY", 1500, "common"),
  item("brows", "worried", "WORRIED", 1500, "common"),
  item("brows", "raised", "RAISED", 2500, "common"),
];

const SKINS = [
  item("skin", "plain", "PLAIN", 0, "common"),
  item("skin", "wood", "WOOD", 4000, "common"),
  item("skin", "checker", "CHECKER", 6000, "common"),
  item("skin", "chrome", "CHROME", 15000, "rare"),
  item("skin", "gold", "GOLD", 40000, "epic"),
  item("skin", "arcane", "ARCANE", 60000, "epic"),
  item("skin", "neon", "NEON", 80000, "epic"),
  item("skin", "galaxy", "GALAXY", 0, "legendary", "unstoppable"),
  item("skin", "lava", "LAVA", 0, "legendary", "bloodSurvivor"),
];

const SHOTS = [
  item("shot", "box", "CUBE", 0, "common"),
  item("shot", "sphere", "ORB", 3000, "common"),
  item("shot", "diamond", "DIAMOND", 8000, "rare"),
  item("shot", "arrow", "ARROW", 12000, "rare"),
  item("shot", "star", "STAR", 25000, "epic"),
  item("shot", "shuriken", "SHURIKEN", 0, "legendary", "bossHunter"),
];

const KILLS = [
  item("kill", "pixels", "PIXELS", 0, "common"),
  item("kill", "confetti", "CONFETTI", 10000, "rare"),
  item("kill", "explosion", "MINI NUKE", 20000, "rare"),
  item("kill", "hearts", "HEARTS", 35000, "epic"),
];

export const SHOP_TABS = [
  { id: "color", label: "COLOR" },
  {
    id: "head",
    label: "HEAD",
    sections: [
      { label: "HATS", items: fromOptions(HAT_OPTIONS, "hat") },
      { label: "EARS", items: fromOptions(EAR_OPTIONS, "ears") },
    ],
  },
  {
    id: "face",
    label: "FACE",
    sections: [
      { label: "EYES", items: EYES },
      { label: "BROWS", items: BROWS },
      { label: "GLASSES", items: fromOptions(GLASSES_OPTIONS, "glasses") },
    ],
  },
  { id: "skin", label: "SKIN", sections: [{ label: "BODY SKIN", items: SKINS }] },
  { id: "shot", label: "SHOT", sections: [{ label: "SHOT SHAPE", items: SHOTS }] },
  {
    id: "trail",
    label: "TRAIL",
    sections: [{ label: "TRAILS", items: fromOptions(TRAIL_OPTIONS, "effect") }],
  },
  { id: "kill", label: "KILL FX", sections: [{ label: "KILL EFFECT", items: KILLS }] },
];

const ALL_ITEMS = SHOP_TABS.flatMap((tab) =>
  (tab.sections ?? []).flatMap((section) => section.items)
);

export function findItem(kind, id) {
  return ALL_ITEMS.find((entry) => entry.kind === kind && entry.id === id);
}

export function isItemOwned(entry) {
  if (entry.achievement) {
    return getAchievementProgress(entry.achievement).done;
  }
  if (entry.price === 0) {
    return true;
  }
  const legacyId = LEGACY_IDS[`${entry.kind}:${entry.id}`];
  return isOwned(entry.kind, entry.id) || (legacyId != null && isOwned(entry.kind, legacyId));
}

export function getItemLock(entry) {
  if (!entry.achievement) {
    return null;
  }
  const progress = getAchievementProgress(entry.achievement);
  return { ...ACHIEVEMENTS[entry.achievement], ...progress };
}

export function isItemEquipped(entry, customization) {
  if (ACCESSORY_KINDS.has(entry.kind)) {
    return (customization.accessories ?? []).includes(entry.id);
  }
  const field = SLOT_FIELDS[entry.kind];
  return (customization[field] ?? SLOT_DEFAULTS[field]) === entry.id;
}

const TRAIL_IDS = new Set(TRAIL_OPTIONS.map((option) => option.id));

export function equipItem(customization, entry) {
  if (ACCESSORY_KINDS.has(entry.kind)) {
    const current = customization.accessories ?? [];
    if (current.includes(entry.id)) {
      return customization;
    }
    const base =
      entry.kind === "effect"
        ? current.filter((id) => !TRAIL_IDS.has(id))
        : current;
    return { ...customization, accessories: [...base, entry.id] };
  }
  return { ...customization, [SLOT_FIELDS[entry.kind]]: entry.id };
}

export function unequipItem(customization, entry) {
  if (ACCESSORY_KINDS.has(entry.kind)) {
    return {
      ...customization,
      accessories: (customization.accessories ?? []).filter((id) => id !== entry.id),
    };
  }
  return customization;
}

export function isToggleItem(entry) {
  return ACCESSORY_KINDS.has(entry.kind);
}

export function getRarityColor(rarity) {
  return RARITIES[rarity]?.color ?? RARITIES.common.color;
}

const KIND_LABELS = {
  skin: "SKIN",
  eyes: "EYES",
  brows: "BROWS",
  shot: "SHOT",
  kill: "KILL FX",
  hat: "HAT",
  ears: "EARS",
  glasses: "GLASSES",
  effect: "TRAIL",
};

export function getAchievementReward(achievementId) {
  const reward = ALL_ITEMS.find((entry) => entry.achievement === achievementId);
  if (!reward) {
    return null;
  }
  return {
    label: `${reward.label} ${KIND_LABELS[reward.kind] ?? ""}`.trim(),
    color: getRarityColor(reward.rarity),
  };
}
