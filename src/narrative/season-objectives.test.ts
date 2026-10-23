import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { generateSeasonObjectives } from "../board/season-objectives.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import {
  applySurvivalObjectivesToBoard,
  isInRelegationZone,
  SURVIVAL_TARGET_PLACE,
} from "./season-objectives.ts";

describe("survival season objectives", () => {
  it("replaces league place goal with klassenerhalt target", () => {
    const objectives = applySurvivalObjectivesToBoard(
      generateSeasonObjectives(NORDSTERN_ID, 1, defaultLeagueState(), { avg_ca: 70 }),
      1,
      NORDSTERN_ID,
    );
    const place = objectives.find((entry) => entry.id === "league_place");
    expect(place?.target).toBe(SURVIVAL_TARGET_PLACE);
    expect(place?.label).toContain("Klassenerhalt");
    expect(place?.icon).toBe("🛡️");
  });

  it("flags the relegation zone from the playoff place (17) like the sim", () => {
    expect(isInRelegationZone(17)).toBe(true);
    expect(isInRelegationZone(16)).toBe(false);
  });
});
