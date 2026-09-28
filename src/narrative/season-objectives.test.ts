import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { generateSeasonObjectives } from "../board/season-objectives.ts";
import {
  applySurvivalObjectivesToBoard,
  isInRelegationZone,
  SURVIVAL_TARGET_PLACE,
} from "./season-objectives.ts";

describe("survival season objectives", () => {
  it("replaces league place goal with klassenerhalt target", () => {
    const objectives = applySurvivalObjectivesToBoard(
      generateSeasonObjectives(NORDSTERN_ID, 1),
      1,
      NORDSTERN_ID,
    );
    const place = objectives.find((entry) => entry.id === "league_place");
    expect(place?.target).toBe(SURVIVAL_TARGET_PLACE);
    expect(place?.label).toContain("Klassenerhalt");
    expect(place?.icon).toBe("🛡️");
  });

  it("flags relegation zone from place 16", () => {
    expect(isInRelegationZone(16)).toBe(true);
    expect(isInRelegationZone(15)).toBe(false);
  });
});
