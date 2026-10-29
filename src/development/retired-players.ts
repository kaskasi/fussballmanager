import type { Player, PlayerName, PositionPrimary, SeasonLine } from "../types/player.ts";

/**
 * PRD 31 §4 — retired-player records (`retired.json`) and per-season career lines.
 * Ids and numbers only, so twenty seasons of retirements stay small.
 */

export interface RetiredPlayer {
  id: string;
  name: PlayerName;
  /** ISO birth date. */
  birth: string;
  position: PositionPrimary;
  /** Age in the last season played. */
  age: number;
  retired_season: number;
  last_club_id: string | null;
  peak_ca?: number;
  career: SeasonLine[];
}

/** Append the ending season's line: `[season, club_id, division_id, apps, goals]`. */
export function appendSeasonLine(
  player: Player,
  season: number,
  divisionOf: (clubId: string) => string | null,
): Player {
  const clubId = player.club_id;
  if (!clubId) return player;
  const lines = player.history.season_lines ?? [];
  if (lines.some((line) => line[0] === season)) return player;
  const line: SeasonLine = [
    season,
    clubId,
    divisionOf(clubId) ?? "",
    player.state.season_apps,
    player.state.season_goals,
  ];
  return { ...player, history: { ...player.history, season_lines: [...lines, line] } };
}

export function retiredRecord(player: Player, retiredSeason: number): RetiredPlayer {
  return {
    id: player.id,
    name: player.name,
    birth: player.birth.date,
    position: player.position,
    age: player.age,
    retired_season: retiredSeason,
    last_club_id: player.club_id,
    ...(player.state.peak_ca !== undefined ? { peak_ca: player.state.peak_ca } : {}),
    career: player.history.season_lines ?? [],
  };
}

export function normalizeRetiredPlayers(raw: readonly unknown[] | undefined): RetiredPlayer[] {
  if (!raw) return [];
  return raw.filter(
    (entry): entry is RetiredPlayer =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as RetiredPlayer).id === "string" &&
      typeof (entry as RetiredPlayer).retired_season === "number",
  );
}
