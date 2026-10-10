import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { estimateCa } from "../transfers/market-value.ts";
import {
  processWeeklyBreakoutChecks,
  TIER2_BREAKOUT_IDS,
  type WeeklyBreakoutId,
} from "./breakouts.ts";

const TIER2_SET = new Set<string>(TIER2_BREAKOUT_IDS);

describe("breakout tier-2 balance", () => {
  it("fires tier-2 events rarely over synthetic careers", () => {
    let tier2Hits = 0;
    let slumpHits = 0;
    const careers = 100;
    const weeksPerCareer = 40;

    for (let career = 0; career < careers; career += 1) {
      let player = clonePlayer();
      player.id = `pl_career_${career}`;
      player.hidden.breakout_flags = [];
      for (let week = 1; week <= weeksPerCareer; week += 1) {
        player.age = 20 + Math.floor(week / 52);
        if (week === 5) {
          player.position = "CF";
          player.age = 26;
          player.market_value = 900_000;
          player.state.season_apps = 6;
          player.state.recent_growth_26w = 8;
          player.hidden.drive = 1.05;
        }
        const before = new Set(player.hidden.breakout_flags);
        const step = processWeeklyBreakoutChecks([player], week, 2026 + career, 1);
        player = step.players[0]!;
        for (const flag of player.hidden.breakout_flags) {
          if (!before.has(flag) && TIER2_SET.has(flag)) {
            tier2Hits += 1;
            if (
              flag === "golden_boy_fracture" ||
              flag === "bench_identity_crisis" ||
              flag === "hype_backlash" ||
              flag === "injury_spiral"
            ) {
              slumpHits += 1;
            }
          }
        }
      }
    }

    const tier2Rate = tier2Hits / careers;
    expect(tier2Rate).toBeLessThan(0.12);
    expect(tier2Rate).toBeGreaterThanOrEqual(0);
    expect(slumpHits).toBeGreaterThanOrEqual(0);
  });

  it("can fire obscure_to_main_striker when conditions are met", () => {
    const player = eligibleObscureStriker();
    const result = fireWeeklyEvent(player, "obscure_to_main_striker", 24);
    expect(result.player.hidden.breakout_flags).toContain("obscure_to_main_striker");
    expect(
      result.player.state.modifiers.some(
        (mod) => mod.source_event_id === "obscure_to_main_striker" && mod.weekly_growth_multiplier === 2,
      ),
    ).toBe(true);
  });
});

function eligibleObscureStriker() {
  const player = clonePlayer();
  player.position = "CF";
  player.age = 26;
  player.market_value = 1_100_000;
  player.state.season_apps = 8;
  player.state.recent_growth_26w = 9;
  player.hidden.drive = 1.05;
  player.attributes.shooting = 82;
  player.attributes.passing = 78;
  player.attributes.dribbling = 76;
  player.attributes.technique = 80;
  player.attributes.pace = 75;
  player.attributes.composure = 78;
  player.attributes.positioning = 80;
  const ca = estimateCa(player.attributes, player.position);
  expect(ca).toBeGreaterThanOrEqual(78);
  expect(ca).toBeLessThanOrEqual(92);
  return player;
}

function fireWeeklyEvent(
  player: ReturnType<typeof clonePlayer>,
  eventId: WeeklyBreakoutId,
  week: number,
) {
  for (let seed = 1; seed <= 20_000; seed += 1) {
    const result = processWeeklyBreakoutChecks([player], week, seed);
    if (result.players[0]!.hidden.breakout_flags.includes(eventId)) {
      return { player: result.players[0]!, narratives: result.narratives };
    }
  }
  throw new Error(`Event ${eventId} did not fire`);
}
