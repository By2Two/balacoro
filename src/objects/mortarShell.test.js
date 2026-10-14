import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

vi.mock("../core/AudioEngine.js", () => ({ audio: { play: vi.fn() } }));

const { getShellArcPosition, getVisibleBlastColor } = await import("./mortarShell.js");

describe("getShellArcPosition", () => {
  const origin = new THREE.Vector3(0, 1, 0);
  const target = new THREE.Vector3(10, 1, 4);

  it("starts at the origin and ends at the target", () => {
    const out = new THREE.Vector3();
    expect(getShellArcPosition(origin, target, 0, 8, out).toArray()).toEqual([0, 1, 0]);
    expect(getShellArcPosition(origin, target, 1, 8, out).toArray()).toEqual([10, 1, 4]);
  });

  it("peaks at the apex height halfway", () => {
    const out = getShellArcPosition(origin, target, 0.5, 8, new THREE.Vector3());
    expect(out.x).toBeCloseTo(5);
    expect(out.y).toBeCloseTo(9);
    expect(out.z).toBeCloseTo(2);
  });
});

describe("getVisibleBlastColor", () => {
  it("keeps the hue but lifts near-black colors so the blast is visible", () => {
    const hsl = { h: 0, s: 0, l: 0 };
    getVisibleBlastColor(0x200000).getHSL(hsl);
    expect(hsl.h).toBeCloseTo(0);
    expect(hsl.l).toBeGreaterThanOrEqual(0.5);
  });
});
