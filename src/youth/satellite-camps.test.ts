import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { generateYouthIntake, maxAnlageProfile } from "./intake-generator.ts";
import { SEASON_END_WEEK } from "../sim/game-calendar.ts";
import { seasonCalendarYear } from "../sim/season-label.ts";
import {
  buyYouthCamp,
  campIntakeCount,
  campMixtureShift,
  campLeaderName,
  campNationById,
  canBuyYouthCamp,
  generateCampOpeningBundle,
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
    expect(campMixtureShift({ ...camp, leader_hire: "none", staffed: false })).toBe(0);
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

  it("camp season intake uses the same mixture floor as HQ campus", () => {
    const facility = "academy_basic" as const;
    const seed = 4242;
    const sharedRandom = (() => {
      let state = seed | 0;
      return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const hq = generateYouthIntake({
      season: 1,
      week: SEASON_END_WEEK,
      seasonYear: seasonCalendarYear(1),
      clubId: "cl_test",
      nationality: "DE",
      region: "Test",
      facility,
      idStart: 100,
      random: sharedRandom,
      count: 4,
    });
    const campRandom = (() => {
      let state = seed | 0;
      return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const camp = generateYouthIntake({
      season: 1,
      week: SEASON_END_WEEK,
      seasonYear: seasonCalendarYear(1),
      clubId: "cl_test",
      nationality: "BR",
      region: "São Paulo",
      facility,
      idStart: 200,
      random: campRandom,
      count: 4,
      meanShift: campMixtureShift({
        id: "camp_br",
        staffed: false,
        purchased_season: 1,
        leader_hire: "none",
      }),
    });
    const hqCa = hq.map((player) => estimateCa(player.attributes, player.position));
    const campCa = camp.map((player) => estimateCa(player.attributes, player.position));
    for (let index = 0; index < hqCa.length; index++) {
      expect(campCa[index]).toBeGreaterThanOrEqual(hqCa[index]! - 1);
    }
  });

  it("seeds headline + two support talents with max development on purchase", () => {
    const bundle = generateCampOpeningBundle({
      campId: "camp_pl",
      clubId: "cl_fc_nordstern",
      season: 2,
      week: 10,
      masterSeed: 99,
      players: [],
    });
    expect(bundle.players).toHaveLength(3);
    const maxAnlage = maxAnlageProfile();
    const headline = bundle.players.find((player) => player.id === bundle.headlinePlayerId)!;
    const support = bundle.players.filter((player) => player.id !== bundle.headlinePlayerId);
    expect(headline.state.camp_opening_headline).toBe(true);
    expect(headline.state.camp_debut_hook_index).toBeGreaterThanOrEqual(0);
    for (const player of bundle.players) {
      expect(player.state.youth_site).toBe("camp_pl");
      expect(player.hidden.drive).toBe(1.6);
      expect(player.hidden.anlage).toEqual(maxAnlage);
    }
    const headlineCa = estimateCa(headline.attributes, headline.position);
    const bestSupport = Math.max(
      ...support.map((player) => estimateCa(player.attributes, player.position)),
    );
    expect(headlineCa).toBeGreaterThan(bestSupport + 8);
    expect(headlineCa).toBeGreaterThanOrEqual(88);
  });
});
