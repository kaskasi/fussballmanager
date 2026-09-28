import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";
import type { BoardObjective } from "../board/board-state.ts";
import { generateSeasonObjectives } from "../board/season-objectives.ts";

/** Bottom three places in an 18-team league. */
export const RELEGATION_ZONE_PLACE = 16;
export const SURVIVAL_TARGET_PLACE = 15;

export function survivalSeasonObjectives(
  employerClubId: TeamId,
  season: number,
): BoardObjective[] {
  const generic = generateSeasonObjectives(employerClubId, season);
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

export function isInRelegationZone(place: number): boolean {
  return place >= RELEGATION_ZONE_PLACE;
}
