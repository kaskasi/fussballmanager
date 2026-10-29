import { describe, expect, it } from "vitest";
import { nordsternSquad } from "./seed-clubs.ts";
import {
  buildCareerEngineSquad,
  careerEngineForm,
  careerPositionToRole,
  mapCareerAttributes,
  mapCareerForm,
  MORALE_FORM_SWING,
  MORALE_NEUTRAL,
  moraleFormOffset,
  scaleCareerAttribute,
} from "./career-squad-bridge.ts";
import { squadIssues } from "./squad.ts";

describe("career squad bridge", () => {
  it("maps career positions to engine roles", () => {
    expect(careerPositionToRole("LB")).toBe("FB");
    expect(careerPositionToRole("CF")).toBe("ST");
    expect(careerPositionToRole("GK")).toBe("GK");
  });

  it("scales attributes from 0-199 to 1-99", () => {
    expect(scaleCareerAttribute(0)).toBe(1);
    expect(scaleCareerAttribute(199)).toBe(99);
    expect(scaleCareerAttribute(100)).toBe(50);
  });

  it("keeps morale's match effect subtle and neutral at typical morale", () => {
    expect(moraleFormOffset(undefined)).toBe(0);
    expect(moraleFormOffset(MORALE_NEUTRAL)).toBe(0);
    expect(moraleFormOffset(100)).toBeCloseTo(MORALE_FORM_SWING);
    expect(moraleFormOffset(0)).toBeCloseTo(-MORALE_FORM_SWING);
    expect(moraleFormOffset(30)).toBeCloseTo(-MORALE_FORM_SWING);
    expect(moraleFormOffset(80)).toBeGreaterThan(0);
    expect(moraleFormOffset(80)).toBeLessThan(MORALE_FORM_SWING);
  });

  it("shifts engine form by at most five points from morale", () => {
    const base = mapCareerForm(1);
    expect(careerEngineForm({ form: 1 })).toBe(base);
    expect(careerEngineForm({ form: 1, morale: 100 }) - base).toBe(5);
    expect(careerEngineForm({ form: 1, morale: 5 }) - base).toBe(-5);
  });

  it("scales positioning, tackling and aerial by derived experience", () => {
    const attrs = {
      shooting: 140,
      passing: 140,
      dribbling: 140,
      pace: 140,
      stamina: 140,
      positioning: 140,
      strength: 140,
      technique: 140,
      composure: 140,
      gk_handling: 20,
    };
    const full = mapCareerAttributes(attrs, "CB", 1);
    const green = mapCareerAttributes(attrs, "CB", 0.62);
    expect(green.positioning).toBeLessThan(full.positioning);
    expect(green.tackling).toBeLessThan(full.tackling);
    expect(green.aerial).toBeLessThan(full.aerial);
    expect(green.shooting).toBe(full.shooting);
    expect(green.pace).toBe(full.pace);
  });

  it("builds a valid engine squad from career players", () => {
    const careerPlayers = Array.from({ length: 16 }, (_, index) => ({
      id: `pl_test_${index}`,
      displayName: `Player ${index}`,
      position: index === 0 ? "GK" : index < 5 ? "CB" : index < 8 ? "CM" : "CF",
      attributes: {
        shooting: 90 + index,
        passing: 88 + index,
        dribbling: 80 + index,
        pace: 75 + index,
        stamina: 82 + index,
        positioning: 84 + index,
        strength: 78 + index,
        technique: 80 + index,
        composure: 76 + index,
        gk_handling: index === 0 ? 120 : 20,
      },
      form: 0,
      fitness: 90,
      portraitSeed: index + 10,
      overall: 100 + index,
    }));

    const squad = buildCareerEngineSquad(nordsternSquad, careerPlayers);
    expect(squadIssues(squad)).toEqual([]);
    expect(squad.starters[0]?.player.id).toBe("pl_test_0");
    expect(squad.starters.some((place) => place.player.id.startsWith("pl_test_"))).toBe(true);
    expect(mapCareerAttributes(careerPlayers[1]!.attributes, "CB").goalkeeping).toBe(1);
  });
});
