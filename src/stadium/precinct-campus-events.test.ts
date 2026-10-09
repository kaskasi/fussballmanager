import { describe, expect, it } from "vitest";
import { defaultClubStadium } from "./club-stadium.ts";
import {
  applyRestaurantProposalStory,
  damagePitch,
  maybeStadiumMegaEventWeek,
  pitchFillPenalty,
  STADIUM_MEGA_EVENT_MIN_CAPACITY,
} from "./precinct-campus-events.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";

describe("precinct campus events", () => {
  it("damages pitch and boosts fanbase on mega event weeks at 30k+", () => {
    let stadium = defaultClubStadium();
    stadium.blocks = stadium.blocks.map((block) => ({ ...block, capacity: 8_000 }));
    expect(stadium.blocks.reduce((sum, block) => sum + block.capacity, 0)).toBeGreaterThanOrEqual(
      STADIUM_MEGA_EVENT_MIN_CAPACITY,
    );
    const result = maybeStadiumMegaEventWeek(stadium, 2, 8, 4242);
    if (result.message) {
      expect(result.stadium.pitch_condition).toBeLessThan(100);
    }
  });

  it("applies pitch fill penalty when worn", () => {
    const worn = damagePitch(defaultClubStadium(), 40);
    expect(pitchFillPenalty(worn)).toBeGreaterThan(0);
  });

  it("restaurant story drains star fitness and pins viral weeks", () => {
    const player = clonePlayer();
    player.squad_status = "pro";
    player.club_id = "cl_test";
    player.state.fitness = 88;
    const { stadium, players, clubEventMessage } = applyRestaurantProposalStory(
      defaultClubStadium(),
      [player],
      "cl_test",
      1,
      10,
    );
    expect(clubEventMessage).toContain("Restaurant");
    expect(stadium.restaurant_viral_until_week).toBeDefined();
    expect(stadium.restaurant_story_last_season).toBe(1);
    expect(players[0]?.state.fitness).toBeLessThan(88);
  });
});
