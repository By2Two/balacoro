import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

vi.mock("../AudioEngine.js", () => ({ audio: { play: vi.fn(), playHandle: vi.fn() } }));

const { getLaserAimPoint, sweepToward, getChargePlaybackRate } = await import(
  "./orbitalLaser.js"
);
const { createChainState, markEnemy, collectDetonations } = await import(
  "./chainReaction.js"
);
const { getSupernovaExposure } = await import("./supernova.js");

describe("orbital laser aim", () => {
  it("uses the mouse point on the ground", () => {
    const player = {
      position: new THREE.Vector3(0, 0, 0),
      aimWorldPoint: new THREE.Vector3(3, 0, 4),
    };
    expect(getLaserAimPoint(player, new THREE.Vector3()).toArray()).toEqual([3, 0, 4]);
  });

  it("clamps far aim points to the max reach", () => {
    const player = {
      position: new THREE.Vector3(0, 0, 0),
      aimWorldPoint: new THREE.Vector3(100, 0, 0),
    };
    expect(getLaserAimPoint(player, new THREE.Vector3()).x).toBeCloseTo(16);
  });

  it("falls back to the facing direction without a mouse", () => {
    const player = {
      position: new THREE.Vector3(1, 0, 1),
      lastDirection: new THREE.Vector3(0, 0, 1),
    };
    expect(getLaserAimPoint(player, new THREE.Vector3()).toArray()).toEqual([1, 0, 8]);
  });

  it("speeds the charge sound up so it ends when the beam lands", () => {
    expect(getChargePlaybackRate(6)).toBeCloseTo(1);
    expect(getChargePlaybackRate(5)).toBeCloseTo(1.2);
  });

  it("sweeps toward the aim at a limited speed", () => {
    const current = new THREE.Vector3(0, 0, 0);
    sweepToward(current, new THREE.Vector3(10, 0, 0), 2);
    expect(current.x).toBeCloseTo(2);
    sweepToward(current, new THREE.Vector3(3, 0, 0), 2);
    expect(current.x).toBeCloseTo(3);
  });
});

describe("chain reaction marks", () => {
  it("never marks the same enemy twice or after it detonated", () => {
    const state = createChainState();
    const enemy = { isDying: false };
    expect(markEnemy(state, enemy, 5)).toBe(true);
    expect(markEnemy(state, enemy, 5)).toBe(false);
    enemy.isDying = true;
    collectDetonations(state, 0);
    expect(markEnemy(state, enemy, 10)).toBe(false);
  });

  it("detonates marked enemies that die or whose mark expires", () => {
    const state = createChainState();
    const dying = { isDying: true };
    const expired = { isDying: false };
    const waiting = { isDying: false };
    markEnemy(state, dying, 10);
    markEnemy(state, expired, 1);
    markEnemy(state, waiting, 10);
    const ready = collectDetonations(state, 2);
    expect(ready).toContain(dying);
    expect(ready).toContain(expired);
    expect(ready).not.toContain(waiting);
    expect(state.queue).toHaveLength(2);
  });
});

describe("supernova exposure", () => {
  it("darkens while charging, flashes on release and settles back", () => {
    expect(getSupernovaExposure(0, 1.5)).toBeCloseTo(1);
    expect(getSupernovaExposure(1.4, 1.5)).toBeLessThan(0.5);
    expect(getSupernovaExposure(1.5, 1.5)).toBeGreaterThan(3);
    expect(getSupernovaExposure(3, 1.5)).toBe(1);
  });
});
