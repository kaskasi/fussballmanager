import type { LeagueState } from "../persistence/league-state.ts";
import { clubShortName, leagueTable } from "../sim/league-week.ts";

export interface HubLeagueRow {
  place: number;
  teamId: string;
  shortName: string;
  points: number;
  isPlayerClub: boolean;
}

const DEFAULT_WINDOW = 9;

/** Slice indices for a standings window (unit-tested). */
export function hubLeagueSliceRange(
  tableLength: number,
  playerIndex: number,
  windowSize = DEFAULT_WINDOW,
): { start: number; end: number } {
  if (tableLength <= 0 || playerIndex < 0 || playerIndex >= tableLength) {
    return { start: 0, end: 0 };
  }
  const size = Math.min(windowSize, tableLength);
  let start: number;

  if (playerIndex === 0) {
    start = 0;
  } else if (playerIndex === tableLength - 1) {
    start = Math.max(0, tableLength - size);
  } else {
    const before = Math.floor((size - 1) / 2);
    start = Math.max(0, playerIndex - before);
    const endProbe = start + size;
    if (endProbe > tableLength) {
      start = Math.max(0, tableLength - size);
    }
  }

  return { start, end: Math.min(tableLength, start + size) };
}

/** Nine-team window: top 9 if 1st, bottom 9 if last, else centered on player club. */
export function hubLeagueSnippet(league: LeagueState, windowSize = DEFAULT_WINDOW): HubLeagueRow[] {
  const table = leagueTable(league);
  const index = table.findIndex((row) => row.teamId === league.player_club_id);
  if (index < 0 || table.length === 0) return [];

  const { start, end } = hubLeagueSliceRange(table.length, index, windowSize);

  return table.slice(start, end).map((row, i) => ({
    place: start + i + 1,
    teamId: row.teamId,
    shortName: clubShortName(row.teamId),
    points: row.points,
    isPlayerClub: row.teamId === league.player_club_id,
  }));
}
