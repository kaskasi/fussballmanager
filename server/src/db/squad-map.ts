import type {
  FormationId,
  FormationSlotId,
  Player,
  PlayerAttributes,
  PlayerRole,
  Squad,
  TeamTactics,
} from "@fussballmanager/shared";
import {
  asPlayerId,
  asTeamId,
  assertValidSquad,
} from "@fussballmanager/shared";

const ROLES = new Set<PlayerRole>([
  "GK",
  "FB",
  "CB",
  "DM",
  "CM",
  "AM",
  "W",
  "ST",
]);

const FORMATIONS = new Set<FormationId>(["4-3-3", "4-4-2"]);

export const DIVISION_ID = "regionalliga-nord";
export const DIVISION_NAME = "Regionalliga Nord";
export const DEFAULT_MATCH_ID = "md-1";

export type ClubRecord = {
  id: string;
  divisionId: string;
  name: string;
  shortName: string;
  tactics: TeamTactics;
};

export type PlayerRecord = {
  id: string;
  clubId: string;
  name: string;
  role: PlayerRole;
  form: number;
  fatigue: number;
  attributes: PlayerAttributes;
  isStarter: boolean;
  slot: FormationSlotId | null;
  sortOrder: number;
};

export function recordsFromSquad(
  squad: Squad,
  divisionId = DIVISION_ID,
): { club: ClubRecord; players: PlayerRecord[] } {
  const club: ClubRecord = {
    id: squad.team.id,
    divisionId,
    name: squad.team.name,
    shortName: squad.team.shortName,
    tactics: squad.tactics,
  };
  const players: PlayerRecord[] = [
    ...squad.starters.map((place, index) => ({
      id: place.player.id,
      clubId: squad.team.id,
      name: place.player.name,
      role: place.player.role,
      form: place.player.form,
      fatigue: place.player.fatigue,
      attributes: place.player.attributes,
      isStarter: true,
      slot: place.slot,
      sortOrder: index,
    })),
    ...squad.bench.map((player, index) => ({
      id: player.id,
      clubId: squad.team.id,
      name: player.name,
      role: player.role,
      form: player.form,
      fatigue: player.fatigue,
      attributes: player.attributes,
      isStarter: false,
      slot: null,
      sortOrder: squad.starters.length + index,
    })),
  ];
  return { club, players };
}

export function squadFromRecords(
  club: ClubRecord,
  players: readonly PlayerRecord[],
): Squad {
  const ordered = [...players].sort((a, b) => a.sortOrder - b.sortOrder);
  const squad: Squad = {
    team: {
      id: asTeamId(club.id),
      name: club.name,
      shortName: club.shortName,
    },
    tactics: parseTactics(club.tactics, club.id),
    starters: ordered
      .filter((row) => row.isStarter)
      .map((row) => {
        if (!row.slot) {
          throw new Error(`Starter ${row.id} is missing a formation slot`);
        }
        return { player: toPlayer(row), slot: row.slot };
      }),
    bench: ordered.filter((row) => !row.isStarter).map(toPlayer),
  };
  assertValidSquad(squad);
  return squad;
}

function toPlayer(row: PlayerRecord): Player {
  if (!ROLES.has(row.role)) {
    throw new Error(`Unknown role ${row.role}`);
  }
  return {
    id: asPlayerId(row.id),
    teamId: asTeamId(row.clubId),
    name: row.name,
    role: row.role,
    form: row.form,
    fatigue: row.fatigue,
    attributes: row.attributes,
  };
}

function parseTactics(tactics: TeamTactics, clubId: string): TeamTactics {
  if (!FORMATIONS.has(tactics.formation)) {
    throw new Error(`Unknown formation ${tactics.formation}`);
  }
  return {
    ...tactics,
    teamId: asTeamId(clubId),
  };
}
