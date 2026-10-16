import { careerWeekIndex } from "../stadium/hospitality.ts";
import { campNationById, type YouthCamp } from "./satellite-camps.ts";

export const CAMP_BUILD_WEEKS = 2;

export function isCampOperational(camp: YouthCamp, season: number, week: number): boolean {
  const until = camp.construction_until;
  if (until == null) return true;
  return careerWeekIndex(season, week) > until;
}

export function campConstructionWeeksRemaining(
  camp: YouthCamp,
  season: number,
  week: number,
): number {
  if (isCampOperational(camp, season, week)) return 0;
  const until = camp.construction_until;
  if (until == null) return 0;
  return Math.max(0, until - careerWeekIndex(season, week) + 1);
}

export function campConstructionLabel(camp: YouthCamp, season: number, week: number): string | null {
  if (isCampOperational(camp, season, week)) return null;
  const nation = campNationById(camp.id);
  const weeks = campConstructionWeeksRemaining(camp, season, week);
  const place = nation?.label ?? camp.id;
  if (weeks <= 1) return `${place}: Eröffnung nächste Woche`;
  return `${place}: Bau — noch ${weeks} Wochen`;
}
