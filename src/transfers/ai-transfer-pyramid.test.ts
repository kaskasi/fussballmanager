import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { PYRAMID, tierOf, type DivisionId } from "../sim/league-pyramid.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { emptyTransferState } from "./negotiations.ts";
import { advanceAiTransferWeek, defaultAiClubBudget, resetPyramidAiBudgets } from "./ai-transfer-market.ts";

describe("AI transfer market across the pyramid (PRD 32 §8)", () => {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 2026 });
  const pools = defaultLeaguePools();
  const divisionOf = new Map<string, DivisionId>();
  for (const division of PYRAMID) {
    for (const teamId of pools[division.id]) divisionOf.set(careerTeamId(teamId), division.id);
  }

  it("gives higher tiers bigger budgets and resets every club", () => {
    const budgets = PYRAMID.map((division) => defaultAiClubBudget(division.id));
    budgets.slice(1).forEach((budget, index) => expect(budget).toBeLessThan(budgets[index]!));
    expect(Object.keys(resetPyramidAiBudgets(pools)).length).toBe(PYRAMID.length * 18 - 1);
  });

  it("lets clubs buy from their own tier or below, in every division, and reports only local deals", () => {
    const moves: { from: DivisionId; to: DivisionId }[] = [];
    let localMessages = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const result = advanceAiTransferWeek({
        rivalPlayers: session.rivalPlayers,
        transferState: emptyTransferState(),
        leagueClubIds: session.league.club_ids,
        divisionId: session.league.division_id,
        leaguePools: pools,
        season: 1,
        week: 1,
        masterSeed: seed,
        worldClubs: session.world.clubs,
      });
      const before = new Map(session.rivalPlayers.map((player) => [player.id, player.club_id]));
      for (const player of result.rivalPlayers) {
        const from = before.get(player.id);
        if (!from || !player.club_id || from === player.club_id) continue;
        moves.push({ from: divisionOf.get(from)!, to: divisionOf.get(player.club_id)! });
      }
      localMessages += result.messages.length;
    }
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) expect(tierOf(move.to)).toBeLessThanOrEqual(tierOf(move.from));
    expect(moves.some((move) => tierOf(move.to) <= 3)).toBe(true);
    expect(localMessages).toBeLessThan(moves.length);
  });
});
