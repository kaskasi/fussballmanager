import type { Player } from "../types/player.ts";
import { withClubEvent, type ClubEvent } from "../inbox/club-events.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import { isBlockUnderConstruction } from "../stadium/stadium-block-expansion.ts";
import { advancePrecinctConstruction } from "../stadium/precinct-construction.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import type { PrecinctState } from "../stadium/precinct.ts";
import type { AcademyFacility } from "../youth/intake-generator.ts";
import {
  campNationById,
  generateCampOpeningBundle,
  type YouthCamp,
} from "../youth/satellite-camps.ts";
import { formatPlayerName } from "../types/player-display.ts";

export const MAX_CONCURRENT_PROJECTS = 2;
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
  let count = 0;
  const precinct = snapshot.precinct;
  if (precinct) {
    count += precinct.patches.filter((patch) => patch.constructing).length;
    count += Object.keys(precinct.pendingUpgrades ?? {}).length;
  }
  for (const blockId of Object.keys(snapshot.stadium.block_expansion ?? {})) {
    if (isBlockUnderConstruction(snapshot.stadium, blockId, snapshot.season, snapshot.week)) {
      count += 1;
    }
  }
  count += snapshot.camps.filter((camp) => camp.construction_until != null).length;
  if (snapshot.academyProject) count += 1;
  return count;
}

export function constructionCapReason(snapshot: ConstructionSnapshot): string | null {
  if (countActiveProjects(snapshot) >= MAX_CONCURRENT_PROJECTS) {
    return "Zwei Bauvorhaben laufen bereits.";
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
          `${nation.label}: Camp fertig — ${formatPlayerName(headline)} ist im Kader.`,
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
      "Jugend-Campus ist fertig.",
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
