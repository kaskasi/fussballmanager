import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";
import type { BoardObjective } from "../board/board-state.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { generateSeasonObjectives } from "../board/season-objectives.ts";
import { upperHalfPlaceTarget } from "../board/club-standing-tier.ts";

/** Matches the sim (promotion-relegation.ts): 17th plays the playoff, 18th goes down. */
export const RELEGATION_ZONE_PLACE = 17;
export const SURVIVAL_TARGET_PLACE = 16;

export function survivalSeasonObjectives(
  employerClubId: TeamId,
  season: number,
): BoardObjective[] {
  const generic = generateSeasonObjectives(employerClubId, season, defaultLeagueState(), {
    avg_ca: 70,
  });
  const suffix = season > 1 ? ` (S${season})` : "";
  return generic.map((objective) => {
    if (objective.id !== "league_place") return objective;
    return {
      ...objective,
      target: SURVIVAL_TARGET_PLACE,
      label: `Klassenerhalt — Platz ${SURVIVAL_TARGET_PLACE} oder besser${suffix}`,
      icon: "🛡️",
    };
  });
}

export function applySurvivalObjectivesToBoard(
  objectives: BoardObjective[],
  season: number,
  employerClubId: TeamId = NORDSTERN_ID,
): BoardObjective[] {
  const survival = survivalSeasonObjectives(employerClubId, season);
  const survivalPlace = survival.find((entry) => entry.id === "league_place");
  if (!survivalPlace) return objectives;
  return objectives.map((objective) =>
    objective.id === "league_place" ? survivalPlace : objective,
  );
}

/** Story Mode Act 2 — direct promotion or the playoff place. */
export const PROMOTION_PUSH_PLACE = 2;

/**
 * Story Mode Act 2 patient chairman (PRD 19): only an upper-half finish is mandatory;
 * the promotion push is an optional stretch goal.
 */
export function applyPatientChairmanObjectives(
  objectives: readonly BoardObjective[],
  season: number,
): BoardObjective[] {
  const suffix = season > 1 ? ` (S${season})` : "";
  const relaxed = objectives
    .filter((objective) => objective.id !== "league_place" && objective.id !== "promotion_push")
    .map((objective) => ({ ...objective, mandatory: false }));
  return [
    {
      id: "league_place",
      kind: "league_place_max",
      target: upperHalfPlaceTarget(),
      mandatory: true,
      label: `Obere Hälfte — Platz ${upperHalfPlaceTarget()} oder besser${suffix}`,
      icon: "table",
    },
    {
      id: "promotion_push",
      kind: "league_place_max",
      target: PROMOTION_PUSH_PLACE,
      mandatory: false,
      label: `Aufstiegsrennen — Platz ${PROMOTION_PUSH_PLACE} oder besser${suffix}`,
      icon: "trophy",
    },
    ...relaxed,
  ];
}

export function isInRelegationZone(place: number): boolean {
  return place >= RELEGATION_ZONE_PLACE;
}
