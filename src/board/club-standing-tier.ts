import type { TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import { leagueTable, playerTableRow } from "../sim/league-week.ts";
import { SURVIVAL_TARGET_PLACE } from "../narrative/season-objectives.ts";

export type ClubStandingTier =
  | "survival_low"
  | "survival_mid"
  | "upper_half"
  | "ambition";

export function tablePlaceForClub(league: LeagueState, teamId: TeamId): number {
  const table = leagueTable(league);
  const index = table.findIndex((entry) => entry.teamId === teamId);
  if (index >= 0) return index + 1;
  const playerRow = league.player_club_id === teamId ? playerTableRow(league) : null;
  if (playerRow) {
    const playerIndex = table.findIndex((entry) => entry.teamId === playerRow.teamId);
    if (playerIndex >= 0) return playerIndex + 1;
  }
  return 10;
}

export function clubStandingTier(league: LeagueState, teamId: TeamId): ClubStandingTier {
  const place = tablePlaceForClub(league, teamId);
  if (place <= 4) return "ambition";
  if (place <= 11) return "upper_half";
  if (place <= SURVIVAL_TARGET_PLACE) return "survival_mid";
  return "survival_low";
}

export function survivalPlaceTarget(): number {
  return SURVIVAL_TARGET_PLACE;
}

export function upperHalfPlaceTarget(): number {
  return 9;
}
