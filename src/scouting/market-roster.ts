import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import type { ProSquadRow, ProSquadSortDirection, ProSquadSortKey } from "../squad/pro-roster.ts";
import { sortProSquadRows } from "../squad/pro-roster.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { AbilityEstimate } from "./estimate-model.ts";
import type { ScoutedTarget } from "./market-list.ts";

export interface MarketRow extends ProSquadRow {
  player: Player;
  estimate: AbilityEstimate;
  assigned: boolean;
}

export function listMarketRows(
  targets: readonly ScoutedTarget[],
  assignedIds: ReadonlySet<string>,
): MarketRow[] {
  return targets.map(({ player, estimate }) => ({
    playerId: player.id,
    displayName: formatPlayerName(player),
    position: player.position,
    age: player.age,
    ca: Math.round(estimateCa(player.attributes, player.position)),
    form: player.state.form,
    seasonMinutes: player.state.season_minutes,
    marketValue: player.market_value,
    goals: player.state.season_goals ?? 0,
    assists: player.state.season_assists ?? 0,
    yellowCards: player.state.season_yellow_cards ?? 0,
    tackles: player.state.season_tackles ?? 0,
    headers: player.state.season_headers ?? 0,
    avgRating: seasonMatchRating(player),
    player,
    estimate,
    assigned: assignedIds.has(player.id),
  }));
}

export function sortMarketRows(
  rows: readonly MarketRow[],
  key: ProSquadSortKey,
  direction: ProSquadSortDirection,
): MarketRow[] {
  return sortProSquadRows(rows, key, direction);
}
