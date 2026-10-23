import { describe, expect, it } from "vitest";
import { weeklyFocusCount } from "../development/training-plan-state.ts";
import { defaultTrainingPlan } from "../development/training-units.ts";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import {
  merchInboundQtyBySku,
  normalizeClubMerchandising,
} from "../economy/merchandising.ts";
import { MERCH_SKU_IDS } from "../economy/merchandising-skus.ts";
import type { MerchExpertState } from "../economy/merchandising-expert.ts";
import { appendBreakoutNarrativesToEvents, simulateGameWeek } from "./week-pipeline.ts";

describe("week pipeline breakout narratives", () => {
  it("publishes visible player arcs to the club feed", () => {
    const events = appendBreakoutNarrativesToEvents(
      [],
      [{
        playerId: "pl_00042",
        eventId: "late_bloomer_kick",
        narrative: "Max wirkt wie ausgewechselt.",
        week: 12,
      }],
      2,
      12,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      season: 2,
      week: 12,
      kind: "profile",
      message: "Max wirkt wie ausgewechselt.",
    });
  });
});

describe("simulateGameWeek training plan", () => {
  it("clears weekly focus after the week sim (F2.1); assistant does not refill", async () => {
    const session = newGameSession();
    const plan = defaultTrainingPlan();
    expect(weeklyFocusCount(plan)).toBeGreaterThan(0);

    const result = await simulateGameWeek({
      ...session,
      trainingPlan: plan,
      weekday: 7,
      assistantDelegation: { lineup: false, training: true, scouting: true },
    });

    expect(weeklyFocusCount(result.session.trainingPlan)).toBe(0);
    expect(result.session.trainingPlan).toHaveLength(15);
    expect(result.session.trainingPlan.every((slot) => slot.unitId === "")).toBe(true);
    expect(result.session.week).toBe(session.week + 1);
  });

  it("survives missing league state (regression: blank screen on week sim)", async () => {
    const session = newGameSession();
    const result = await simulateGameWeek({
      ...session,
      league: undefined as unknown as GameSession["league"],
      weekday: 7,
    });
    expect(result.session.league.club_ids.length).toBeGreaterThan(0);
    expect(result.session.week).toBe(session.week + 1);
  });
});

describe("simulateGameWeek merch expert", () => {
  const expert: MerchExpertState = {
    hire: "hired",
    expert: { first: "Jonas", last: "Brandt", portrait_seed: 7, skill: 90, wage_weekly: 1_000 },
  };

  function withExpert(session: GameSession, hired: MerchExpertState | undefined): GameSession {
    const merch = normalizeClubMerchandising(session.stadium.merchandising);
    for (const sku of MERCH_SKU_IDS) {
      merch.skus[sku] = { ...merch.skus[sku]!, stock: 0 };
    }
    return {
      ...session,
      weekday: 7,
      stadium: {
        ...session.stadium,
        merchandising: { ...merch, ...(hired ? { expert: hired } : {}) },
      },
    };
  }

  it("reorders via Express and pays the wage when an expert is hired", async () => {
    const session = newGameSession();
    const base = await simulateGameWeek(withExpert(session, undefined));
    const hired = await simulateGameWeek(withExpert(session, expert));

    const inbound = merchInboundQtyBySku(normalizeClubMerchandising(hired.session.stadium.merchandising));
    expect(MERCH_SKU_IDS.some((sku) => inbound[sku]! > 0)).toBe(true);
    const baseInbound = merchInboundQtyBySku(normalizeClubMerchandising(base.session.stadium.merchandising));
    expect(MERCH_SKU_IDS.every((sku) => baseInbound[sku] === 0)).toBe(true);

    expect(hired.session.finances.cash).toBeLessThan(base.session.finances.cash - 1_000);
    expect(hired.session.clubEvents.some((event) => event.message.includes("Express"))).toBe(true);
    expect(hired.session.stadium.merchandising?.expert).toEqual(expert);
  });
});
