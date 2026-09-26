import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { UNKNOWN_PRIOR } from "../scouting/estimate-model.ts";
import {
  appendSeasonSnapshot,
  attributeBars,
  formMark,
  growthPolyline,
  growthSeries,
  profileAttributeKeys,
  stateMark,
  visibleBreakoutFlags,
} from "./player-profile.ts";

describe("player profile helpers", () => {
  it("picks six position-weighted attributes for a midfielder", () => {
    expect(profileAttributeKeys("CM")).toEqual([
      "passing",
      "vision",
      "composure",
      "stamina",
      "technique",
      "teamwork",
    ]);
  });

  it("shows exact values for own players and a CI band for scouts", () => {
    const player = clonePlayer();
    const own = attributeBars(player, true);
    const foreign = attributeBars(player, false, UNKNOWN_PRIOR);
    expect(own[0]?.value).toBe(player.attributes.passing);
    expect(own[0]?.showValue).toBe(true);
    expect(own[0]?.low).toBeUndefined();
    expect(foreign).toHaveLength(2);
    expect(foreign[0]?.showValue).toBe(false);
    expect(foreign[0]?.low).toBeUndefined();

    const clearer = attributeBars(player, false, { estimatedAbilityMean: 72, uncertaintyRange: 24, sampleSize: 1 });
    expect(clearer).toHaveLength(4);
    expect(clearer[0]?.showCi).toBe(true);

    const known = attributeBars(player, false, { estimatedAbilityMean: 72, uncertaintyRange: 8, sampleSize: 3 });
    expect(known[0]?.showValue).toBe(true);
    expect(known[0]?.value).toBe(player.attributes.passing);
  });

  it("uses shape plus tone for fitness and form", () => {
    expect(stateMark(90)).toEqual({ mark: "●", tone: "good" });
    expect(stateMark(55)).toEqual({ mark: "▲", tone: "mid" });
    expect(formMark(-3)).toEqual({ mark: "◆", tone: "low" });
  });

  it("draws a growth line and hides generational flags", () => {
    const player = clonePlayer();
    expect(growthSeries(player)).toHaveLength(1);
    expect(growthPolyline(growthSeries(player))).toMatch(/^\d/);
    expect(visibleBreakoutFlags(["prodigy_foundation", "mentor_ignition"])).toEqual(["mentor_ignition"]);
    const withHistory = appendSeasonSnapshot(player, 1);
    expect(withHistory.history.growth).toHaveLength(1);
  });
});
