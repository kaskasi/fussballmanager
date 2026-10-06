import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { maxAnlageProfile } from "./intake-generator.ts";
import {
  buyYouthCamp,
  campIntakeCount,
  campMixtureShift,
  campLeaderName,
  campNationById,
  canBuyYouthCamp,
  generateCampOpeningProspects,
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
    const staffed = {
      id: "camp_br",
      staffed: true,
      purchased_season: 1,
      leader_hire: "hired" as const,
      leader: { first: "Marco", last: "Fischer", portrait_seed: 1, training_mod: 0, mental_mod: 0 },
    };
    const camps = [staffed];
    expect(weeklyCampUpkeep(camps)).toBeGreaterThan(
      weeklyCampUpkeep([{ ...staffed, staffed: false, leader_hire: "none", leader: undefined }]),
    );
  });

  it("staffed camps take more intake", () => {
    expect(campIntakeCount(true)).toBeGreaterThan(campIntakeCount(false));
  });

  it("applies leader training_mod to camp mixture shift", () => {
    const camp = {
      id: "camp_br",
      staffed: true,
      purchased_season: 1,
      leader_hire: "hired" as const,
      leader: { first: "A", last: "B", portrait_seed: 1, training_mod: 0.1, mental_mod: 0 },
    };
    expect(campMixtureShift(camp)).toBe(10);
    expect(campMixtureShift({ ...camp, leader_hire: "none", staffed: false })).toBe(-8);
  });

  it("pulls a camp player into HQ", () => {
    const player = clonePlayer();
    player.state.youth_site = "camp_br";
    expect(youthSite(pullCampPlayerToHq(player))).toBe("hq");
  });

  it("labels Croatia camp as Dubrovnik", () => {
    expect(campNationById("camp_hr")?.region).toBe("Dubrovnik");
  });

  it("assigns a stable international camp leader name", () => {
    const a = campLeaderName("camp_br", 42);
    const b = campLeaderName("camp_br", 42);
    const c = campLeaderName("camp_ng", 42);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(a.length).toBeGreaterThan(3);
  });

  it("seeds 1–2 weak youths with max development hidden stats on purchase", () => {
    const opening = generateCampOpeningProspects({
      campId: "camp_pl",
      clubId: "cl_fc_nordstern",
      season: 2,
      week: 10,
      masterSeed: 99,
      players: [],
    });
    expect(opening.length).toBeGreaterThanOrEqual(1);
    expect(opening.length).toBeLessThanOrEqual(2);
    const maxAnlage = maxAnlageProfile();
    for (const player of opening) {
      expect(player.state.youth_site).toBe("camp_pl");
      expect(player.hidden.drive).toBe(1.6);
      expect(player.hidden.anlage).toEqual(maxAnlage);
      expect(estimateCa(player.attributes, player.position)).toBeLessThan(75);
    }
  });
});
