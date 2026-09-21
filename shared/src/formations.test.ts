import { describe, expect, it } from "vitest";
import {
  FORMATION_235,
  FORMATION_IDS,
  getFormation,
} from "./formations.ts";
import { nordsternPyramidSquad, nordsternSquad } from "./seed-clubs.ts";
import {
  isFormationId,
  kickoffLineup,
  selectFormation,
  squadIssues,
} from "./squad.ts";

describe("formations", () => {
  it("lists 4-3-3, 4-4-2, and the 2-3-5 pyramid", () => {
    expect(FORMATION_IDS).toEqual(["4-3-3", "4-4-2", "2-3-5"]);
    expect(isFormationId("2-3-5")).toBe(true);
    for (const id of FORMATION_IDS) {
      const slots = getFormation(id);
      expect(slots).toHaveLength(11);
      expect(new Set(slots.map((slot) => slot.id)).size).toBe(11);
    }
  });

  it("kicks off 2-3-5 with two backs and five forwards", () => {
    expect(squadIssues(nordsternPyramidSquad)).toEqual([]);
    const home = kickoffLineup(nordsternPyramidSquad, "home");
    expect(FORMATION_235.map((slot) => slot.id).sort()).toEqual(
      home.map((place) => place.slot).sort(),
    );
    const backs = home.filter((place) => place.player.role === "FB");
    const forwards = home.filter(
      (place) => place.player.role === "ST" || place.player.role === "W",
    );
    const halfBacks = home.filter(
      (place) => place.player.role === "CM" || place.player.role === "DM",
    );
    expect(backs).toHaveLength(2);
    expect(halfBacks).toHaveLength(3);
    expect(forwards).toHaveLength(5);
    expect(backs.every((place) => place.position.x < 30)).toBe(true);
    expect(forwards.every((place) => place.position.x > 60)).toBe(true);
    const backXs = backs.map((place) => place.position.x);
    const halfXs = halfBacks.map((place) => place.position.x);
    const fwdXs = forwards.map((place) => place.position.x);
    expect(Math.max(...backXs)).toBeLessThan(Math.min(...halfXs) - 8);
    expect(Math.max(...halfXs)).toBeLessThan(Math.min(...fwdXs) - 20);
    const spread = (places: typeof home) => {
      const ys = places.map((place) => place.position.y);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spread(backs)).toBeLessThan(spread(halfBacks));
    expect(spread(halfBacks)).toBeLessThan(spread(forwards));
  });

  it("selects a fixed formation onto an existing squad", () => {
    const pyramid = selectFormation(nordsternSquad, "2-3-5");
    expect(squadIssues(pyramid)).toEqual([]);
    expect(pyramid.tactics.formation).toBe("2-3-5");
    expect(pyramid.tactics.lineHeight).toBeGreaterThan(nordsternSquad.tactics.lineHeight);
    expect(kickoffLineup(pyramid, "home")).toHaveLength(11);
  });
});
