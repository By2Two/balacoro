import { audio } from "./AudioEngine.js";
import { POWER_DEFS } from "./powers/definitions.js";
import {
  performEnergyExplosion,
  performRingShot,
  performShockwave,
  performPoisonCloud,
} from "./powers/burstPowers.js";
import {
  performLightningStrike,
} from "./powers/lightningStrike.js";
import {
  performSlowField,
  performHealBurst,
} from "./powers/fieldPowers.js";
import {
  performBoomerang,
} from "./powers/boomerang.js";
import {
  performMeteor,
} from "./powers/meteor.js";
import {
  performTurret,
} from "./powers/turret.js";
import {
  performBlackHole,
} from "./powers/blackHole.js";
import { performOrbitalLaser } from "./powers/orbitalLaser.js";
import { performChainReaction } from "./powers/chainReaction.js";
import { performSupernova } from "./powers/supernova.js";

export {
  POWER_DEFS,
  POWER_IDS,
  DEFAULT_LOADOUT,
  loadPowerLoadout,
  savePowerLoadout,
} from "./powers/definitions.js";
export { spawnRingWave, spawnFlash, spawnFrostNova } from "./powers/helpers.js";

const POWER_PERFORMERS = {
  energyExplosion: performEnergyExplosion,
  ringShot: performRingShot,
  shockwave: performShockwave,
  poisonCloud: performPoisonCloud,
  lightningStrike: performLightningStrike,
  slowField: performSlowField,
  healBurst: performHealBurst,
  boomerang: performBoomerang,
  meteor: performMeteor,
  turret: performTurret,
  blackHole: performBlackHole,
  orbitalLaser: performOrbitalLaser,
  chainReaction: performChainReaction,
  supernova: performSupernova,
};

export function performPower(powerId, player) {
  const scene = player.parent;
  const skill = player.active_skills[powerId];
  const def = POWER_DEFS[powerId];
  if (!scene?.addPowerEffect || !skill || !def) {
    return;
  }
  if (def.sound !== null) {
    audio.play(def.sound ?? "skillEnergyExplosion");
  }
  if (powerId === "freezeExplosion") {
    player.performFreezeExplosion();
    return;
  }
  POWER_PERFORMERS[powerId]?.(player, scene, skill);
}
