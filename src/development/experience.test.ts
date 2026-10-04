import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { awardStamp } from "./ability-stamps.ts";
import { derivedExperienceFactor, EXPERIENCE_FLOOR, profileExperienceLabel } from "./experience.ts";

describe("derived experience", () => {
  it("keeps kids with a handful of apps near the floor and veterans at 1.0", () => {
    const kid = clonePlayer();
    kid.state.season_apps = 5;
    kid.history.growth = [];
    expect(derivedExperienceFactor(kid)).toBeGreaterThanOrEqual(EXPERIENCE_FLOOR);
    expect(derivedExperienceFactor(kid)).toBeLessThan(0.7);

    const veteran = clonePlayer();
    veteran.history.growth = [
      {
        season: 1,
        age: 28,
        attributes_snapshot: veteran.attributes,
        minutes_played: 2500,
        drive_at_snapshot: 1,
        season_apps: 300,
      },
    ];
    veteran.state.season_apps = 0;
    expect(derivedExperienceFactor(veteran)).toBe(1);
  });

  it("labels Roh while Grünschnabel is on", () => {
    const player = clonePlayer();
    const raw = awardStamp(player, "gruenschnabel", 1, 1, { ignoreGates: true });
    expect(profileExperienceLabel(raw)).toBe("Erfahrung · Roh");
    expect(profileExperienceLabel(player)).toBe("Erfahrung");
  });
});
