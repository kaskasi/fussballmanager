import type { ClubStadium } from "../stadium/club-stadium.ts";
import { isBlockUnderConstruction } from "../stadium/stadium-block-expansion.ts";
import {
  occupiedCells,
  PRECINCT_BUILDINGS,
  precinctBuildingLevel,
  type PrecinctBuilding,
} from "../stadium/precinct.ts";
import { facilityById } from "../youth/academy.ts";
import { campNationById, type YouthCamp } from "../youth/satellite-camps.ts";
import {
  BASE_CONCURRENT_PROJECTS,
  type AcademyProject,
  type ConstructionSnapshot,
} from "./advance-construction.ts";

/** Default cap; Vereinsgebäude on precinct adds +1 (built) and +1 (upgraded). */
export function maxConcurrentConstructionProjects(snapshot: ConstructionSnapshot): number {
  const precinct = snapshot.precinct;
  if (!precinct || occupiedCells(precinct, "clubhouse") <= 0) {
    return BASE_CONCURRENT_PROJECTS;
  }
  const hqLevel = precinctBuildingLevel(precinct, "clubhouse");
  if (hqLevel <= 0) return BASE_CONCURRENT_PROJECTS;
  return BASE_CONCURRENT_PROJECTS + Math.min(2, hqLevel);
}

export type ConstructionProjectKind =
  | "precinct_build"
  | "precinct_upgrade"
  | "tribune"
  | "camp"
  | "academy";

export interface ActiveConstructionProject {
  id: string;
  kind: ConstructionProjectKind;
  /** Display name (precinct defs / block / nation — already localized in data). */
  name: string;
}

function precinctLabel(building: PrecinctBuilding): string {
  return PRECINCT_BUILDINGS.find((entry) => entry.id === building)?.label ?? building;
}

export function listActiveConstructionProjects(
  snapshot: ConstructionSnapshot,
): ActiveConstructionProject[] {
  const projects: ActiveConstructionProject[] = [];
  const precinct = snapshot.precinct;
  if (precinct) {
    for (const patch of precinct.patches) {
      if (!patch.constructing) continue;
      projects.push({
        id: `precinct_build_${patch.id}`,
        kind: "precinct_build",
        name: precinctLabel(patch.building),
      });
    }
    for (const building of Object.keys(precinct.pendingUpgrades ?? {}) as PrecinctBuilding[]) {
      projects.push({
        id: `precinct_upgrade_${building}`,
        kind: "precinct_upgrade",
        name: precinctLabel(building),
      });
    }
  }
  for (const block of snapshot.stadium.blocks) {
    if (isBlockUnderConstruction(snapshot.stadium, block.id, snapshot.season, snapshot.week)) {
      projects.push({
        id: `tribune_${block.id}`,
        kind: "tribune",
        name: block.name,
      });
    }
  }
  for (const camp of snapshot.camps) {
    if (camp.construction_until == null) continue;
    const nation = campNationById(camp.id);
    projects.push({
      id: `camp_${camp.id}`,
      kind: "camp",
      name: nation?.label ?? camp.id,
    });
  }
  if (snapshot.academyProject) {
    const target = snapshot.academyProject.target;
    projects.push({
      id: `academy_${target}`,
      kind: "academy",
      name: facilityById(target)?.name ?? target,
    });
  }
  return projects;
}

export function constructionCapacitySummary(snapshot: ConstructionSnapshot): {
  active: number;
  max: number;
  projects: ActiveConstructionProject[];
  atCap: boolean;
} {
  const projects = listActiveConstructionProjects(snapshot);
  const active = projects.length;
  const max = maxConcurrentConstructionProjects(snapshot);
  return {
    active,
    max,
    projects,
    atCap: active >= max,
  };
}

export function constructionSnapshotFromSession(input: {
  stadium: ClubStadium;
  youthCamps: readonly YouthCamp[];
  academyProject?: AcademyProject | null;
  season: number;
  week: number;
}): ConstructionSnapshot {
  return {
    precinct: input.stadium.precinct,
    stadium: input.stadium,
    camps: input.youthCamps,
    academyProject: input.academyProject ?? null,
    season: input.season,
    week: input.week,
  };
}
