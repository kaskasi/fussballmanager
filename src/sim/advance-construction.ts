import { t } from "../i18n/index.ts";
import type { Player } from "../types/player.ts";
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
import {
  campNationById,
  generateCampOpeningBundle,
  type YouthCamp,
} from "../youth/satellite-camps.ts";
import { formatPlayerName } from "../types/player-display.ts";

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

export function advanceCareerConstruction(input: {
  stadium: ClubStadium;
  youthCamps: readonly YouthCamp[];
  academyFacility: AcademyFacility;
  academyProject: AcademyProject | null;
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  clubEvents: ClubEvent[];
}): {
  stadium: ClubStadium;
  youthCamps: YouthCamp[];
  academyFacility: AcademyFacility;
  academyProject: AcademyProject | null;
  newPlayers: Player[];
  clubEvents: ClubEvent[];
} {
  const now = careerWeekIndex(input.season, input.week);
  const precinct = input.stadium.precinct
    ? advancePrecinctConstruction(input.stadium.precinct, now)
    : input.stadium.precinct;
  const stadium = precinct ? { ...input.stadium, precinct } : input.stadium;
  let knownPlayers = [...input.players];
  const newPlayers: Player[] = [];
  let clubEvents = input.clubEvents;
  const youthCamps = input.youthCamps.map((camp) => {
    if (camp.construction_until == null || now < camp.construction_until) return camp;
    const opening = generateCampOpeningBundle({
      campId: camp.id,
      clubId: input.clubId,
      season: input.season,
      week: input.week,
      masterSeed: input.masterSeed,
      players: knownPlayers,
      facility: input.academyFacility,
    });
    if (opening.players.length > 0) {
      newPlayers.push(...opening.players);
      knownPlayers = [...knownPlayers, ...opening.players];
      const nation = campNationById(camp.id);
      const headline = opening.players.find((player) => player.id === opening.headlinePlayerId);
      if (nation && headline) {
        clubEvents = withClubEvent(
          clubEvents,
          input.season,
          input.week,
          "info",
          t("clubEvent.campBuilt", { nation: nation.label, player: formatPlayerName(headline) }),
        );
      }
    }
    return { ...camp, construction_until: undefined };
  });
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
    youthCamps,
    academyFacility,
    academyProject,
    newPlayers,
    clubEvents,
  };
}
