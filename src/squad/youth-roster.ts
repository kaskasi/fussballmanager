import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { ProSquadRow, ProSquadSortDirection, ProSquadSortKey } from "./pro-roster.ts";
import { sortProSquadRows } from "./pro-roster.ts";

export interface YouthSquadRow extends ProSquadRow {
  region: string;
  coachIcon: string;
  departureRisk: boolean;
}

export function listYouthSquad(players: readonly Player[], team: "u17" | "u19"): YouthSquadRow[] {
  return players
    .filter((player) => player.squad_status === team)
    .map((player) => ({
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
      region: player.birth.region,
      coachIcon: "➡️",
      departureRisk: false,
    }));
}

export function sortYouthSquadRows(
  rows: readonly YouthSquadRow[],
  key: ProSquadSortKey,
  direction: ProSquadSortDirection,
): YouthSquadRow[] {
  return sortProSquadRows(rows, key, direction);
}
