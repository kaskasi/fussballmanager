import { t } from "../i18n/index.ts";
import { withClubEvent, type ClubEvent } from "../inbox/club-events.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import { advancePrecinctConstruction } from "../stadium/precinct-construction.ts";
import {
  listActiveConstructionProjects,
  maxConcurrentConstructionProjects,
} from "./construction-capacity.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import type { PrecinctState } from "../stadium/precinct.ts";
import type { AcademyFacility } from "../youth/intake-generator.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";

export const BASE_CONCURRENT_PROJECTS = 2;
/** @deprecated Use maxConcurrentConstructionProjects(snapshot) — HQ raises the cap. */
export const MAX_CONCURRENT_PROJECTS = BASE_CONCURRENT_PROJECTS;
export const CAMP_BUILD_WEEKS = 2;

export interface AcademyProject {
  target: AcademyFacility;
  ready_week_index: number;
}

export function academyBuildWeeks(target: AcademyFacility): number {
  return target === "academy_elite" ? 5 : 3;
}

export interface ConstructionSnapshot {
  precinct?: PrecinctState;
  stadium: ClubStadium;
  camps: readonly YouthCamp[];
  academyProject?: AcademyProject | null;
  season: number;
  week: number;
}

export function countActiveProjects(snapshot: ConstructionSnapshot): number {
  return listActiveConstructionProjects(snapshot).length;
}

export type { ActiveConstructionProject, ConstructionProjectKind } from "./construction-capacity.ts";
export {
  constructionCapacitySummary,
  constructionSnapshotFromSession,
  listActiveConstructionProjects,
  maxConcurrentConstructionProjects,
} from "./construction-capacity.ts";

export function constructionCapReason(snapshot: ConstructionSnapshot): string | null {
  if (countActiveProjects(snapshot) >= maxConcurrentConstructionProjects(snapshot)) {
    return t("construction.reason.capFull");
  }
  return null;
}

/**
 * Weekly construction step for the precinct and the youth campus.
 * Satellite camps open in `advanceYouthCampsForWeek` (youth/camp-construction-week.ts) — the only place
 * that delivers their opening talents, so they are generated exactly once.
 */
export function advanceCareerConstruction(input: {
  stadium: ClubStadium;
  academyFacility: AcademyFacility;
  academyProject: AcademyProject | null;
  season: number;
  week: number;
  clubEvents: ClubEvent[];
}): {
  stadium: ClubStadium;
  academyFacility: AcademyFacility;
  academyProject: AcademyProject | null;
  clubEvents: ClubEvent[];
} {
  const now = careerWeekIndex(input.season, input.week);
  const precinct = input.stadium.precinct
    ? advancePrecinctConstruction(input.stadium.precinct, now)
    : input.stadium.precinct;
  const stadium = precinct ? { ...input.stadium, precinct } : input.stadium;
  let clubEvents = input.clubEvents;
  let academyFacility = input.academyFacility;
  let academyProject = input.academyProject;
  if (academyProject && now >= academyProject.ready_week_index) {
    academyFacility = academyProject.target;
    clubEvents = withClubEvent(
      clubEvents,
      input.season,
      input.week,
      "info",
      t("clubEvent.academyBuilt"),
    );
    academyProject = null;
  }
  return {
    stadium,
    academyFacility,
    academyProject,
    clubEvents,
  };
}
