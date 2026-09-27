import {
  NORDSTERN_ID,
  squadAverageStrength,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { DIVISION_ECONOMY, type DivisionEconomyId } from "../economy/division-economy.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { stadiumTotalCapacity } from "../stadium/club-stadium.ts";
import { DEFAULT_FANBASE } from "../stadium/club-stadium.ts";
import { careerEngineSquadFromPlayers } from "./career-engine-squad.ts";
import { clubIdsForDivision, defaultLeaguePools, squadForLeagueClub } from "./league-divisions.ts";
import { divisionLabel } from "./league-divisions.ts";

export interface ClubProfilePlayer {
  name: string;
  role: string;
  strength: number;
}

export interface ClubProfile {
  teamId: TeamId;
  name: string;
  shortName: string;
  divisionId: DivisionEconomyId;
  divisionLabel: string;
  founded: number;
  members: number;
  fanbase: number;
  coach: string;
  stadiumName: string;
  stadiumCapacity: number;
  squadStrength: number;
  bestPlayers: ClubProfilePlayer[];
  isPlayerClub: boolean;
}

interface ClubFlavor {
  coach: string;
  founded: number;
  members: number;
  stadium: string;
  fanbase: number;
}

const CLUB_FLAVOR: Record<string, ClubFlavor> = {
  "fc-nordstern": {
    coach: "Markus Lehmann",
    founded: 1908,
    members: 2_840,
    stadium: "Nordlicht-Arena",
    fanbase: 62,
  },
  "sv-rheinwacht": {
    coach: "Thomas Engel",
    founded: 1924,
    members: 1_920,
    stadium: "Weserblick-Stadion",
    fanbase: 58,
  },
  "tsv-holzweg": {
    coach: "Uwe Grabow",
    founded: 1952,
    members: 980,
    stadium: "Holzweg-Sportpark",
    fanbase: 44,
  },
  "union-elbstrand": {
    coach: "Patrick Evers",
    founded: 1968,
    members: 1_240,
    stadium: "Elbstrand-Arena",
    fanbase: 51,
  },
  "vfb-moorsiel": {
    coach: "Stefan Cohrs",
    founded: 1931,
    members: 760,
    stadium: "Moorwiese",
    fanbase: 39,
  },
  "spvgg-kuestenholz": {
    coach: "Lars Buchholz",
    founded: 1946,
    members: 1_080,
    stadium: "Küstenholz-Stadion",
    fanbase: 47,
  },
  "sv-altenbruch": {
    coach: "Henning Voß",
    founded: 1912,
    members: 640,
    stadium: "Altenbruch-Arena",
    fanbase: 36,
  },
  "fc-brookfeld": {
    coach: "Jörg Hartmann",
    founded: 1974,
    members: 520,
    stadium: "Brookfeld-Sportplatz",
    fanbase: 33,
  },
  "tsg-deichhausen": {
    coach: "Rainer Klug",
    founded: 1958,
    members: 710,
    stadium: "Deichhausen-Arena",
    fanbase: 35,
  },
  "sc-hafenloh": {
    coach: "Matthias Prinz",
    founded: 1929,
    members: 890,
    stadium: "Hafenloh-Stadion",
    fanbase: 41,
  },
  "vfr-marschdorf": {
    coach: "Oliver Behrens",
    founded: 1963,
    members: 480,
    stadium: "Marschdorf-Sportpark",
    fanbase: 31,
  },
  "spvgg-wiesmoor": {
    coach: "Frank Dose",
    founded: 1981,
    members: 430,
    stadium: "Wiesmoor-Arena",
    fanbase: 29,
  },
};

export function divisionForClub(
  pools: Record<DivisionEconomyId, TeamId[]>,
  teamId: TeamId,
): DivisionEconomyId {
  for (const divisionId of ["regionalliga-nord", "oberliga-nord"] as const) {
    if (pools[divisionId]?.includes(teamId)) return divisionId;
  }
  return "regionalliga-nord";
}

function topPlayersFromSquad(squad: Squad, limit = 3): ClubProfilePlayer[] {
  return squad.starters
    .map((place) => ({
      name: place.player.name,
      role: place.player.role,
      strength: Math.round(squadAverageStrength({ ...squad, starters: [place], bench: [] })),
    }))
    .sort((left, right) => right.strength - left.strength)
    .slice(0, limit);
}

function squadForProfile(teamId: TeamId, careerPlayers?: readonly Player[]): Squad | undefined {
  if (teamId === NORDSTERN_ID && careerPlayers?.length) {
    return careerEngineSquadFromPlayers(careerPlayers);
  }
  return squadForLeagueClub(teamId);
}

export function buildClubProfile(
  teamId: TeamId,
  options?: {
    playerClubId?: TeamId;
    careerPlayers?: readonly Player[];
    stadium?: ClubStadium;
    pools?: Record<DivisionEconomyId, TeamId[]>;
    rivalPlayers?: readonly Player[];
  },
): ClubProfile | null {
  const isPlayerClub = options?.playerClubId === teamId;
  const profileSquad = isPlayerClub
    ? squadForProfile(teamId, options?.careerPlayers)
    : squadForLeagueClub(teamId, options?.rivalPlayers);
  const team = profileSquad?.team;
  if (!team) return null;

  const pools = options?.pools ?? defaultLeaguePools();
  const divisionId = divisionForClub(pools, teamId);
  const division = DIVISION_ECONOMY[divisionId];
  const flavor = CLUB_FLAVOR[teamId] ?? {
    coach: "Cheftrainer",
    founded: 1960,
    members: 600,
    stadium: `${team.shortName}-Arena`,
    fanbase: DEFAULT_FANBASE,
  };
  const defaultCapacity = division.stadium_defaults.capacity;

  return {
    teamId,
    name: team.name,
    shortName: team.shortName,
    divisionId,
    divisionLabel: divisionLabel(divisionId),
    founded: flavor.founded,
    members: flavor.members,
    fanbase: isPlayerClub ? (options?.stadium?.fanbase ?? flavor.fanbase) : flavor.fanbase,
    coach: flavor.coach,
    stadiumName: isPlayerClub ? (options?.stadium?.name ?? flavor.stadium) : flavor.stadium,
    stadiumCapacity:
      isPlayerClub && options?.stadium ? stadiumTotalCapacity(options.stadium) : defaultCapacity,
    squadStrength: profileSquad ? Math.round(squadAverageStrength(profileSquad)) : 48,
    bestPlayers: profileSquad ? topPlayersFromSquad(profileSquad) : [],
    isPlayerClub,
  };
}

export function clubsInPools(pools: Record<DivisionEconomyId, TeamId[]>): TeamId[] {
  return [
    ...clubIdsForDivision(pools, "regionalliga-nord"),
    ...clubIdsForDivision(pools, "oberliga-nord"),
  ];
}
