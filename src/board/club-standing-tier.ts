import type { TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import { leagueTable, playerTableRow } from "../sim/league-week.ts";
import { worldClubForTeam } from "../sim/league-divisions.ts";
import { divisionOfClub } from "../sim/league-pyramid.ts";
import { SURVIVAL_TARGET_PLACE } from "../narrative/season-objectives.ts";
import type { PromotionMovement } from "../sim/promotion-relegation.ts";

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
  const rank = league.club_ids.includes(teamId) ? undefined : reputationRankInDivision(league, teamId);
  return tierForPlace(rank ?? tablePlaceForClub(league, teamId));
}

/**
 * PRD 32 §8 — a club outside the manager's table (a job offer from another
 * division) is ranked by reputation inside its own division.
 */
export function reputationRankInDivision(
  league: Pick<LeagueState, "league_pools">,
  teamId: TeamId,
): number | undefined {
  const pools = league.league_pools;
  const divisionId = pools ? divisionOfClub(pools, teamId) : undefined;
  if (!pools || !divisionId) return undefined;
  const reputation = (clubId: TeamId) => worldClubForTeam(clubId)?.reputation ?? 0;
  const ranked = [...pools[divisionId]].sort(
    (left, right) => reputation(right) - reputation(left) || left.localeCompare(right),
  );
  return ranked.indexOf(teamId) + 1;
}

/** Tier for a table place — or for a squad-strength rank before a ball is kicked. */
export function tierForPlace(place: number): ClubStandingTier {
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

/**
 * PRD 32 §8 — last season's table says little about a new division. A promoted
 * club is asked to stay up, a relegated one to go straight back; a club that
 * stayed keeps the place-based tier (undefined).
 */
export function standingTierAfterMovement(
  teamId: TeamId,
  movements: readonly PromotionMovement[],
): ClubStandingTier | undefined {
  const movement = movements.find((entry) => entry.teamId === teamId);
  if (!movement) return undefined;
  if (movement.reason === "promoted" || movement.reason === "playoff_won") return "survival_mid";
  return "ambition";
}
