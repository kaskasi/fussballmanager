import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import type { ProSquadRow, ProSquadSortDirection, ProSquadSortKey } from "../squad/pro-roster.ts";
import { sortProSquadRows } from "../squad/pro-roster.ts";
import { injuryRiskScore } from "../development/fitness-management.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { AbilityEstimate } from "./estimate-model.ts";
import type { ScoutedTarget } from "./market-list.ts";
import { scoutMarketValueEstimate } from "./scout-visibility.ts";

export interface MarketRow extends ProSquadRow {
  player: Player;
  estimate: AbilityEstimate;
  assigned: boolean;
  assignedScoutId?: string | null;
  clubName?: string;
}

export function listMarketRows(
  targets: readonly (ScoutedTarget & { assigned?: boolean; assigned_scout_id?: string | null })[],
  assignedIds: ReadonlySet<string>,
  season: number,
): MarketRow[] {
  return targets.map(({ player, estimate, clubName, assigned, assigned_scout_id }) => ({
    playerId: player.id,
    displayName: formatPlayerName(player),
    position: player.position,
    age: player.age,
    ca: Math.round(estimateCa(player.attributes, player.position)),
    caDelta: null,
    form: player.state.form,
    fitness: player.state.fitness,
    weeklyMinutes: player.state.weekly_minutes,
    injuryRisk: injuryRiskScore(player, 100),
    injuryWeeks: player.state.injury?.weeks_remaining ?? null,
    seasonMinutes: player.state.season_minutes,
    marketValue: scoutMarketValueEstimate(player, estimate, season, false),
    goals: player.state.season_goals ?? 0,
    assists: player.state.season_assists ?? 0,
    yellowCards: player.state.season_yellow_cards ?? 0,
    tackles: player.state.season_tackles ?? 0,
    headers: player.state.season_headers ?? 0,
    avgRating: seasonMatchRating(player),
    player,
    estimate,
    assigned: assigned ?? assignedIds.has(player.id),
    assignedScoutId: assigned_scout_id ?? null,
    clubName,
  }));
}

export function sortMarketRows(
  rows: readonly MarketRow[],
  key: ProSquadSortKey,
  direction: ProSquadSortDirection,
): MarketRow[] {
  return sortProSquadRows(rows, key, direction);
}
