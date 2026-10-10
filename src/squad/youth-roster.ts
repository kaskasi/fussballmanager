import type { Player } from "../types/player.ts";
import {
  formatPlayerName,
  formatPlayerPositionLabel,
  playerPositionSet,
} from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import { weeklyCaDelta } from "../player/ca-tracking.ts";
import { injuryRiskScore } from "../development/fitness-management.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { isHqYouth } from "../youth/youth-site.ts";
import type { CoachIcon } from "../youth/academy.ts";
import type { ProSquadRow, ProSquadSortDirection, ProSquadSortKey } from "./pro-roster.ts";
import { sortProSquadRows } from "./pro-roster.ts";

export interface YouthSquadRow extends ProSquadRow {
  region: string;
  coachIcon: CoachIcon;
  departureRisk: boolean;
}

export function listYouthSquad(players: readonly Player[], team: "u17" | "u19"): YouthSquadRow[] {
  return players
    .filter((player) => player.squad_status === team && isHqYouth(player))
    .map((player) => ({
      playerId: player.id,
      displayName: formatPlayerName(player),
      position: player.position,
      positionLabel: formatPlayerPositionLabel(player),
      positions: playerPositionSet(player),
      age: player.age,
      ca: Math.round(estimateCa(player.attributes, player.position)),
      caDelta: weeklyCaDelta(player),
      form: player.state.form,
      fitness: player.state.fitness,
      weeklyMinutes: player.state.weekly_minutes,
      injuryRisk: injuryRiskScore(player, 100),
      injuryWeeks: player.state.injury?.weeks_remaining ?? null,
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
