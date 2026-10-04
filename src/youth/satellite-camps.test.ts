import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  buyYouthCamp,
  campIntakeCount,
  canBuyYouthCamp,
  MAX_YOUTH_CAMPS,
  pullCampPlayerToHq,
  weeklyCampUpkeep,
} from "./satellite-camps.ts";
import { youthSite } from "./youth-site.ts";

describe("satellite youth camps", () => {
  it("blocks a fourth camp and a duplicate nation", () => {
    let camps = buyYouthCamp([], "camp_br", 1);
    camps = buyYouthCamp(camps, "camp_ng", 1);
    camps = buyYouthCamp(camps, "camp_pl", 1);
    expect(camps).toHaveLength(MAX_YOUTH_CAMPS);
    expect(canBuyYouthCamp(camps, "camp_fr", 9_000_000).ok).toBe(false);
    expect(canBuyYouthCamp(camps, "camp_br", 9_000_000).ok).toBe(false);
  });

  it("charges upkeep and extra Betreuer wage", () => {
    const camps = [{ id: "camp_br", staffed: true, purchased_season: 1 }];
    expect(weeklyCampUpkeep(camps)).toBeGreaterThan(weeklyCampUpkeep([{ ...camps[0]!, staffed: false }]));
  });

  it("staffed camps take more intake", () => {
    expect(campIntakeCount(true)).toBeGreaterThan(campIntakeCount(false));
  });

  it("pulls a camp player into HQ", () => {
    const player = clonePlayer();
    player.state.youth_site = "camp_br";
    expect(youthSite(pullCampPlayerToHq(player))).toBe("hq");
  });
});
