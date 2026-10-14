import { LAVA_DAMAGE_PER_SECOND } from "../../constants.js";

export const ZONE = {
  NONE: 0,
  ROAD: 1,
  MUD: 2,
  WATER: 3,
  DEEP_SNOW: 4,
  ICE: 5,
  LAVA: 6,
  TALL_GRASS: 7,
  QUICKSAND: 8,
};

export const GROUND_EFFECTS = [
  { speed: 1 },
  { speed: 1.08 },
  { speed: 0.6 },
  { speed: 0.7 },
  { speed: 0.75 },
  { speed: 1.05, slippery: true },
  { speed: 0.85, damage: LAVA_DAMAGE_PER_SECOND, hazard: true },
  { speed: 0.92, hides: true },
  { speed: 0.55 },
];

export const ZONE_PATH_COST = [1, 1, 1, 1, 1, 1, 14, 1, 1];

export const ZONE_COLORS = {
  [ZONE.MUD]: 0x4a3520,
  [ZONE.WATER]: 0x2a5a78,
  [ZONE.DEEP_SNOW]: 0xffffff,
  [ZONE.ICE]: 0xa9d8f0,
  [ZONE.LAVA]: 0x1c1412,
  [ZONE.QUICKSAND]: 0xb08f55,
};

export const ZONE_MAP_COLORS = {
  [ZONE.WATER]: "#3d8fc4",
  [ZONE.ICE]: "#bfe9ff",
  [ZONE.LAVA]: "#ff6a1f",
  [ZONE.MUD]: "#4a3520",
};
