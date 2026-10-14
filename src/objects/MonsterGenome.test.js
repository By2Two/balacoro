import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_NAMES,
  generateGenome,
  buildMonsterBody,
  getBodyMaterial,
} from "./MonsterGenome.js";
import { getBudCount } from "./enemyTraits.js";

describe("generateGenome", () => {
  it("builds a valid genome for every archetype", () => {
    for (const archetype of ARCHETYPE_NAMES) {
      const genome = generateGenome(false, archetype);
      expect(genome.archetype).toBe(archetype);
      expect(genome.speedMult).toBeGreaterThan(0);
      expect(genome.healthMult).toBeGreaterThan(0);
      expect([1, 2, 3, 4]).toContain(genome.eyeCount);
    }
  });

  it("bosses are always tank or brute", () => {
    for (let i = 0; i < 50; i++) {
      expect(["tank", "brute"]).toContain(generateGenome(true).archetype);
    }
  });

  it("splitters have the seam, full buds and two eyes", () => {
    for (let i = 0; i < 20; i++) {
      const genome = generateGenome(false, "splitter");
      expect(genome.parts.seam).toBe(true);
      expect(genome.parts.buds).toBe(getBudCount(0));
      expect(genome.eyeCount).toBe(2);
    }
  });
});

describe("buildMonsterBody", () => {
  it("attaches pulsing buds to the splitter core", () => {
    const genome = generateGenome(false, "splitter");
    const body = buildMonsterBody(genome, getBodyMaterial(0));
    const buds = body.animatedParts.filter((part) => part.kind === "bud");
    expect(buds).toHaveLength(genome.parts.buds);
    for (const bud of buds) {
      expect(bud.mesh.parent).toBe(body.core);
    }
  });

  it("splitlings without splits left have no buds", () => {
    const genome = {
      ...generateGenome(false, "splitter"),
      parts: { ...generateGenome(false, "splitter").parts, buds: 0 },
    };
    const body = buildMonsterBody(genome, getBodyMaterial(0));
    expect(body.animatedParts.some((part) => part.kind === "bud")).toBe(false);
  });
});

describe("bomber body", () => {
  it("has a fuse with a flickering spark", () => {
    const genome = generateGenome(false, "bomber");
    expect(genome.parts.fuse).toBe(true);
    const body = buildMonsterBody(genome, getBodyMaterial(0));
    expect(body.animatedParts.filter((part) => part.kind === "spark")).toHaveLength(1);
  });
});

describe("stalker body", () => {
  it("has four eyes, a maw, ribs and long arms", () => {
    const genome = generateGenome(false, "stalker");
    expect(genome.eyeCount).toBe(4);
    expect(genome.parts.mouth).toBe("maw");
    expect(genome.parts.ribs).toBe(true);
    expect(genome.parts.longArms).toBe(true);
    const body = buildMonsterBody(genome, getBodyMaterial(0));
    const arms = body.animatedParts.filter((part) => part.kind === "arm");
    expect(arms).toHaveLength(2);
    for (const arm of arms) {
      expect(arm.mesh.scale.y).toBeGreaterThan(1);
    }
  });
});

describe("mortar body", () => {
  it("carries a cannon with a muzzle on its back", () => {
    const genome = generateGenome(false, "mortar");
    expect(genome.parts.cannon).toBe(true);
    const body = buildMonsterBody(genome, getBodyMaterial(0));
    expect(body.cannon).not.toBeNull();
    expect(body.cannon.muzzle.parent).toBe(body.cannon.barrel);
  });

  it("other archetypes have no cannon", () => {
    const body = buildMonsterBody(generateGenome(false, "swarm"), getBodyMaterial(0));
    expect(body.cannon).toBeNull();
  });
});
