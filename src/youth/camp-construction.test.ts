import { describe, expect, it } from "vitest";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import {
  CAMP_BUILD_WEEKS,
  campConstructionWeeksRemaining,
  isCampOperational,
} from "./camp-construction.ts";
import { advanceYouthCampsForWeek } from "./camp-construction-week.ts";
import { buyYouthCamp } from "./satellite-camps.ts";

describe("youth camp construction", () => {
  it("blocks operation for two calendar weeks after purchase", () => {
    const season = 2;
    const week = 10;
    const camps = buyYouthCamp([], "camp_br", season, week);
    const camp = camps[0]!;
    expect(camp.construction_until).toBe(
      careerWeekIndex(season, week) + CAMP_BUILD_WEEKS - 1,
    );
    expect(camp.opening_players_delivered).toBe(false);
    expect(isCampOperational(camp, season, week)).toBe(false);
    expect(campConstructionWeeksRemaining(camp, season, week)).toBe(2);
    expect(isCampOperational(camp, season, week + 1)).toBe(false);
    expect(campConstructionWeeksRemaining(camp, season, week + 1)).toBe(1);
    expect(isCampOperational(camp, season, week + 2)).toBe(true);
  });

  it("delivers opening bundle the first week after construction", () => {
    const season = 2;
    const purchaseWeek = 10;
    let camps = buyYouthCamp([], "camp_pl", season, purchaseWeek);
    const openWeek = purchaseWeek + 2;
    const step = advanceYouthCampsForWeek({
      camps,
      season,
      week: openWeek,
      clubId: "cl_test",
      masterSeed: 42,
      players: [],
      facility: "academy_basic",
    });
    expect(step.constructionCompletions).toHaveLength(1);
    expect(step.newPlayers).toHaveLength(3);
    expect(step.debuts).toHaveLength(1);
    expect(step.camps[0]?.opening_players_delivered).toBe(true);
    expect(step.camps[0]?.construction_until).toBeUndefined();
    camps = step.camps;
    const again = advanceYouthCampsForWeek({
      camps,
      season,
      week: openWeek + 1,
      clubId: "cl_test",
      masterSeed: 42,
      players: step.newPlayers,
      facility: "academy_basic",
    });
    expect(again.newPlayers).toHaveLength(0);
  });
});
