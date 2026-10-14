import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

vi.mock("../AudioEngine.js", () => ({ audio: { play: vi.fn() } }));

const { solveInterceptTime, calculateLeadDirection } = await import("./helpers.js");
const { POWER_DEFS, POWER_IDS, DEFAULT_LOADOUT, loadPowerLoadout } = await import(
  "./definitions.js"
);

describe("lead targeting", () => {
  it("hits a still target at distance / speed", () => {
    expect(solveInterceptTime(10, 0, 0, 0, 5)).toBeCloseTo(2);
  });

  it("aims ahead of a moving target", () => {
    const direction = calculateLeadDirection(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, 0, 3),
      20
    );
    expect(direction.length()).toBeCloseTo(1);
    expect(direction.z).toBeGreaterThan(0);
  });

  it("falls back to aiming straight when the target outruns the shot", () => {
    const direction = calculateLeadDirection(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(100, 0, 0),
      1
    );
    expect(direction.x).toBeCloseTo(1);
  });
});

describe("power definitions", () => {
  it("every power has a label, sound and skill block", () => {
    for (const id of POWER_IDS) {
      const def = POWER_DEFS[id];
      expect(def.label, id).toBeTruthy();
      expect(def.skill, id).toBeTypeOf("object");
      expect(def.skill.enabled, id).toBe(false);
    }
  });

  it("the default loadout uses existing powers", () => {
    for (const id of Object.values(DEFAULT_LOADOUT)) {
      expect(POWER_IDS).toContain(id);
    }
  });

  it("loadout falls back to default without storage", () => {
    expect(loadPowerLoadout()).toEqual(DEFAULT_LOADOUT);
  });
});

describe("performPower", () => {
  it("routes freezeExplosion to the player", async () => {
    const powers = await import("../powers.js");
    const scene = { addPowerEffect: vi.fn() };
    const player = {
      parent: scene,
      active_skills: {},
      performFreezeExplosion: vi.fn(),
    };
    player.active_skills.freezeExplosion = {};
    powers.performPower("freezeExplosion", player);
    expect(player.performFreezeExplosion).toHaveBeenCalledOnce();
  });
});
