import { describe, expect, it } from "vitest";
import { SEED_MATCHUP } from "@fussballmanager/shared";
import { pickMatchThreeStars, threeStarsDisplayOrder } from "./match-three-stars.ts";
import type { MatchView } from "@fussballmanager/shared";
import { buildMatchConditions } from "@fussballmanager/shared";

function minimalView(): MatchView {
  const home = SEED_MATCHUP.home;
  return {
    seed: 1,
    home: { id: home.team.id, name: home.team.name, shortName: home.team.shortName, formation: "4-3-3" },
    away: { id: "x", name: "Away", shortName: "AWY", formation: "4-4-2" },
    homePlan: SEED_MATCHUP.home.tactics as never,
    awayPlan: SEED_MATCHUP.away.tactics as never,
    roster: home.starters.map((place) => ({
      id: place.player.id,
      teamId: place.player.teamId,
      name: place.player.name,
      role: place.player.role,
      shirt: place.player.shirt,
      starter: true,
    })),
    kickoff: { seq: 0, ball: { x: 50, y: 50 }, score: { home: 0, away: 0 }, possessionTeamId: null, ballCarrierId: null, clock: { period: "first_half", minute: 0, second: 0, stoppageMinute: 0 }, dots: [], ballInAir: false, cue: null, stats: { home: { goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, passes: 0, passesComplete: 0 }, away: { goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, passes: 0, passesComplete: 0 } } },
    frames: [],
    lines: [],
    finalScore: { home: 2, away: 1 },
    eventCount: 0,
    report: { conditions: buildMatchConditions(1), goals: [], cards: [], playerStats: [] },
  };
}

describe("pickMatchThreeStars", () => {
  it("ranks by goals and assists", () => {
    const view = minimalView();
    const p1 = view.roster[0]!;
    const p2 = view.roster[1]!;
    const stars = pickMatchThreeStars(view, [
      { playerId: p1.id, teamId: p1.teamId, name: p1.name, goals: 2, assists: 0, yellowCards: 0 },
      { playerId: p2.id, teamId: p2.teamId, name: p2.name, goals: 0, assists: 2, yellowCards: 0 },
    ]);
    expect(stars[0]?.rank).toBe(1);
    expect(stars[0]?.name).toBe(p1.name);
    expect(threeStarsDisplayOrder(stars).map((s) => s.rank)).toEqual([1, 2]);
  });
});
