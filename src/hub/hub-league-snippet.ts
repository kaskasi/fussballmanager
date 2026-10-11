import type { LeagueState } from "../persistence/league-state.ts";
import { clubShortName, leagueTable } from "../sim/league-week.ts";

export interface HubLeagueRow {
  place: number;
  teamId: string;
  shortName: string;
  points: number;
  isPlayerClub: boolean;
}

export function hubLeagueSnippet(league: LeagueState, radius = 3): HubLeagueRow[] {
  const table = leagueTable(league);
  const index = table.findIndex((row) => row.teamId === league.player_club_id);
  if (index < 0) return [];
  const start = Math.max(0, index - radius);
  const end = Math.min(table.length, index + radius + 1);
  return table.slice(start, end).map((row, i) => ({
    place: start + i + 1,
    teamId: row.teamId,
    shortName: clubShortName(row.teamId),
    points: row.points,
    isPlayerClub: row.teamId === league.player_club_id,
  }));
}
