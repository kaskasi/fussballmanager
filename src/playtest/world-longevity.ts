/**
 * PRD 31 (PRD 30 phase 1) — world-longevity metrics for the headless long run
 * (`scripts/longrun-world.ts`). Pure: reads a session, returns numbers and the
 * invariant checks. Not part of the default vitest run beyond its unit test.
 */
import type { GameSession } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player, PositionPrimary } from "../types/player.ts";

export interface WorldSeasonMetrics {
  season: number;
  aiPlayers: number;
  aiMeanAge: number;
  /** Share of AI players aged 35 or older (0–1). */
  aiShare35Plus: number;
  aiMinRoster: number;
  aiMinGoalkeepers: number;
  /** Mean CA of AI pros per division id (current pools). */
  divisionMeanCa: Record<string, number>;
  aiMeanCa: number;
  retiredTotal: number;
  /** Retired ids still found in a roster, lineup or market list. */
  retiredLeaks: number;
}

export interface WorldInvariantResult {
  id: string;
  ok: boolean;
  detail: string;
}

export const LONGRUN_BOUNDS = {
  meanAgeMin: 24,
  meanAgeMax: 28,
  share35PlusMax: 0.03,
  minRoster: 18,
  minGoalkeepers: 2,
  caDriftMax: 0.1,
} as const;

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function playerCa(player: Player): number {
  return estimateCa(player.attributes, player.position as PositionPrimary);
}

function aiClubRosters(session: GameSession): Map<string, Player[]> {
  const rosters = new Map<string, Player[]>();
  for (const player of session.rivalPlayers) {
    if (!player.club_id || player.club_id === session.clubId) continue;
    const list = rosters.get(player.club_id) ?? [];
    list.push(player);
    rosters.set(player.club_id, list);
  }
  return rosters;
}

function retiredLeakCount(session: GameSession): number {
  const retiredIds = new Set((session.retiredPlayers ?? []).map((entry) => entry.id));
  if (retiredIds.size === 0) return 0;
  let leaks = 0;
  for (const player of [...session.players, ...session.rivalPlayers]) {
    if (retiredIds.has(player.id)) leaks += 1;
  }
  for (const listing of session.transferState.listings ?? []) {
    if (retiredIds.has(listing.player_id)) leaks += 1;
  }
  for (const id of session.transferState.shortlist) {
    if (retiredIds.has(id)) leaks += 1;
  }
  return leaks;
}

export function worldSeasonMetrics(session: GameSession, season: number): WorldSeasonMetrics {
  const rosters = aiClubRosters(session);
  const aiPlayers = [...rosters.values()].flat();
  const ages = aiPlayers.map((player) => player.age);
  const pools = session.league.league_pools ?? {};
  const divisionMeanCa: Record<string, number> = {};
  for (const [divisionId, teamIds] of Object.entries(pools)) {
    const clubIds = new Set(
      (teamIds as readonly string[]).map((teamId) => `cl_${teamId.replace(/-/g, "_")}`),
    );
    const cas = aiPlayers.filter((player) => clubIds.has(player.club_id ?? "")).map(playerCa);
    divisionMeanCa[divisionId] = Math.round(mean(cas) * 10) / 10;
  }
  const rosterSizes = [...rosters.values()].map((roster) => roster.length);
  const keeperCounts = [...rosters.values()].map(
    (roster) => roster.filter((player) => player.position === "GK").length,
  );
  return {
    season,
    aiPlayers: aiPlayers.length,
    aiMeanAge: Math.round(mean(ages) * 100) / 100,
    aiShare35Plus: ages.length === 0 ? 0 : ages.filter((age) => age >= 35).length / ages.length,
    aiMinRoster: rosterSizes.length === 0 ? 0 : Math.min(...rosterSizes),
    aiMinGoalkeepers: keeperCounts.length === 0 ? 0 : Math.min(...keeperCounts),
    divisionMeanCa,
    aiMeanCa: Math.round(mean(aiPlayers.map(playerCa)) * 10) / 10,
    retiredTotal: session.retiredPlayers?.length ?? 0,
    retiredLeaks: retiredLeakCount(session),
  };
}

/** Check one season row against the PRD 31 acceptance bounds; `baseline` is season 1. */
export function checkWorldInvariants(
  row: WorldSeasonMetrics,
  baseline: WorldSeasonMetrics,
): WorldInvariantResult[] {
  const drift = baseline.aiMeanCa > 0 ? Math.abs(row.aiMeanCa / baseline.aiMeanCa - 1) : 0;
  return [
    {
      id: "mean_age",
      ok: row.aiMeanAge >= LONGRUN_BOUNDS.meanAgeMin && row.aiMeanAge <= LONGRUN_BOUNDS.meanAgeMax,
      detail: `AI mean age ${row.aiMeanAge}`,
    },
    {
      id: "share_35_plus",
      ok: row.aiShare35Plus < LONGRUN_BOUNDS.share35PlusMax,
      detail: `35+ share ${(row.aiShare35Plus * 100).toFixed(1)} %`,
    },
    {
      id: "roster_size",
      ok: row.aiMinRoster >= LONGRUN_BOUNDS.minRoster,
      detail: `smallest AI roster ${row.aiMinRoster}`,
    },
    {
      id: "goalkeepers",
      ok: row.aiMinGoalkeepers >= LONGRUN_BOUNDS.minGoalkeepers,
      detail: `fewest AI keepers ${row.aiMinGoalkeepers}`,
    },
    {
      id: "ca_drift",
      ok: drift < LONGRUN_BOUNDS.caDriftMax,
      detail: `AI mean CA ${row.aiMeanCa} (${(drift * 100).toFixed(1)} % from season ${baseline.season})`,
    },
    {
      id: "retired_leaks",
      ok: row.retiredLeaks === 0,
      detail: `retired ids still in play ${row.retiredLeaks}`,
    },
  ];
}
