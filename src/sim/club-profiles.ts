import { NORDSTERN_ID, type Squad, type TeamId } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { DIVISION_ECONOMY, type DivisionEconomyId } from "../economy/division-economy.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { stadiumTotalCapacity } from "../stadium/club-stadium.ts";
import { DEFAULT_FANBASE } from "../stadium/club-stadium.ts";
import { careerEngineSquadFromPlayers } from "./career-engine-squad.ts";
import { clubPlaceName, clubIdsForDivision, defaultLeaguePools, squadForLeagueClub } from "./league-divisions.ts";
import { divisionLabel } from "./league-divisions.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { indexRivalRoster, resolveCareerPlayer } from "./rival-roster-match.ts";
import { rivalPlayersForTeam } from "./rival-engine-squad.ts";
import { DEFAULT_DIVISION_ID, divisionOfClub, pyramidDivisionIds } from "./league-pyramid.ts";

export interface ClubProfilePlayer {
  name: string;
  role: string;
  ca: number;
}

export interface ClubProfile {
  teamId: TeamId;
  name: string;
  place: string;
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

export function clubFlavorFanbase(teamId: string): number {
  return CLUB_FLAVOR[teamId]?.fanbase ?? DEFAULT_FANBASE;
}

export function divisionForClub(
  pools: Record<DivisionEconomyId, TeamId[]>,
  teamId: TeamId,
): DivisionEconomyId {
  return divisionOfClub(pools, teamId) ?? DEFAULT_DIVISION_ID;
}

function careerCaForStarter(
  place: Squad["starters"][number],
  rosterIndex: ReturnType<typeof indexRivalRoster>,
): number | null {
  const career = resolveCareerPlayer(place.player, rosterIndex);
  if (!career) return null;
  return Math.round(estimateCa(career.attributes, career.position));
}

/** Mean CA of current starters (engine squad), for study / profile comparisons. */
export function clubStarterCaAverage(
  squad: Squad,
  careerRoster: readonly Player[],
): number | null {
  return squadCaAverage(squad, careerRoster);
}

function squadCaAverage(squad: Squad, careerRoster: readonly Player[]): number | null {
  const rosterIndex = indexRivalRoster(careerRoster);
  const values = squad.starters
    .map((place) => careerCaForStarter(place, rosterIndex))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function topPlayersFromSquad(
  squad: Squad,
  careerRoster: readonly Player[],
  limit = 3,
): ClubProfilePlayer[] {
  const rosterIndex = indexRivalRoster(careerRoster);
  const players: ClubProfilePlayer[] = [];
  for (const place of squad.starters) {
    const career = resolveCareerPlayer(place.player, rosterIndex);
    if (!career) continue;
    players.push({
      name: formatPlayerName(career),
      role: place.player.role,
      ca: Math.round(estimateCa(career.attributes, career.position)),
    });
  }
  return players.sort((left, right) => right.ca - left.ca).slice(0, limit);
}

function squadForProfile(
  teamId: TeamId,
  careerPlayers?: readonly Player[],
  playerClubId?: TeamId,
  rivalPlayers?: readonly Player[],
): Squad | undefined {
  if (teamId === playerClubId && careerPlayers?.length) {
    return careerEngineSquadFromPlayers(careerPlayers, teamId);
  }
  return squadForLeagueClub(teamId, rivalPlayers, playerClubId);
}

export function buildClubProfile(
  teamId: TeamId,
  options?: {
    playerClubId?: TeamId;
    careerPlayers?: readonly Player[];
    stadium?: ClubStadium;
    pools?: Record<DivisionEconomyId, TeamId[]>;
    rivalPlayers?: readonly Player[];
    worldClubs?: readonly WorldClub[];
  },
): ClubProfile | null {
  const isPlayerClub = options?.playerClubId === teamId;
  const playerClubId = options?.playerClubId ?? NORDSTERN_ID;
  const profileSquad = isPlayerClub
    ? squadForProfile(teamId, options?.careerPlayers, playerClubId, options?.rivalPlayers)
    : squadForLeagueClub(teamId, options?.rivalPlayers, playerClubId);
  const team = profileSquad?.team;
  if (!team) return null;

  const worldClub = options?.worldClubs?.find((club) => club.id === teamId);
  const displayName = worldClub?.name ?? team.name;
  const shortName = worldClub?.short_name ?? team.shortName;
  const place = clubPlaceName(teamId, options?.worldClubs) || worldClub?.place || "";

  const pools = options?.pools ?? defaultLeaguePools();
  const divisionId = divisionForClub(pools, teamId);
  const division = DIVISION_ECONOMY[divisionId];
  const flavor = CLUB_FLAVOR[teamId] ?? {
    coach: "",
    founded: 1960,
    members: 600,
    stadium: `${team.shortName}-Arena`,
    fanbase: DEFAULT_FANBASE,
  };
  const defaultCapacity = division.stadium_defaults.capacity;
  const careerRoster = isPlayerClub
    ? (options?.careerPlayers ?? [])
    : rivalPlayersForTeam(options?.rivalPlayers ?? [], teamId);

  return {
    teamId,
    name: displayName,
    place,
    shortName,
    divisionId,
    divisionLabel: divisionLabel(divisionId),
    founded: flavor.founded,
    members: flavor.members,
    fanbase: isPlayerClub ? (options?.stadium?.fanbase ?? flavor.fanbase) : flavor.fanbase,
    coach: flavor.coach,
    stadiumName: isPlayerClub ? (options?.stadium?.name ?? flavor.stadium) : flavor.stadium,
    stadiumCapacity:
      isPlayerClub && options?.stadium ? stadiumTotalCapacity(options.stadium) : defaultCapacity,
    squadStrength: profileSquad ? (squadCaAverage(profileSquad, careerRoster) ?? 0) : 0,
    bestPlayers: profileSquad ? topPlayersFromSquad(profileSquad, careerRoster) : [],
    isPlayerClub,
  };
}

export function clubsInPools(pools: Record<DivisionEconomyId, TeamId[]>): TeamId[] {
  return pyramidDivisionIds().flatMap((divisionId) => clubIdsForDivision(pools, divisionId));
}
