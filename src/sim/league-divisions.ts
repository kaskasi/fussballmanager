import {
  FORMATION_PRESETS,
  SEED_DIVISION,
  SEED_OBERLIGA,
  asTeamId,
  fillSquad,
  type FormationId,
  type Squad,
  type Team,
  type TeamId,
  type TeamTactics,
} from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { DIVISION_ECONOMY } from "../economy/division-economy.ts";
import type { Player } from "../types/player.ts";
import {
  clubNameFromWorld,
  clubPlaceName,
  clubShortNameFromWorld,
  resolveWorldClub,
} from "../world/club-display.ts";
import {
  generateWorld,
  NORDSTERN_TEAM_ID,
  WORLD_CLUB_SEED,
  type ClubIdentity,
  type WorldClub,
} from "../world/world-generator.ts";
import { squadWithRivalRoster } from "./rival-engine-squad.ts";

export const REGIONALLIGA_ID: DivisionEconomyId = "regionalliga-nord";
export const OBERLIGA_ID: DivisionEconomyId = "oberliga-nord";
export const DEFAULT_WORLD_SEED = WORLD_CLUB_SEED;

export const DEFAULT_GENERATED_WORLD = generateWorld(DEFAULT_WORLD_SEED);
const WORLD_CLUBS = new Map(
  DEFAULT_GENERATED_WORLD.clubs.map((club) => [club.id, club] as const),
);

export const ALL_LEAGUE_SQUADS: readonly Squad[] =
  DEFAULT_GENERATED_WORLD.clubs.map(templateForWorldClub);
/** Read-only compatibility templates for generation_version 0 saves. */
export const LEGACY_LEAGUE_SQUADS: readonly Squad[] = [
  ...SEED_DIVISION,
  ...SEED_OBERLIGA,
];

/** Pools of the fixed career club layer — independent of the save's roster seed. */
export function defaultLeaguePools(): Record<DivisionEconomyId, TeamId[]> {
  const clubs = DEFAULT_GENERATED_WORLD.clubs;
  return {
    "regionalliga-nord": clubs
      .filter((club) => club.division_id === REGIONALLIGA_ID)
      .map((club) => asTeamId(club.id)),
    "oberliga-nord": clubs
      .filter((club) => club.division_id === OBERLIGA_ID)
      .map((club) => asTeamId(club.id)),
  };
}

export function divisionLabel(divisionId: DivisionEconomyId): string {
  return DIVISION_ECONOMY[divisionId].label;
}

export function templateSquadForClub(teamId: TeamId): Squad | undefined {
  return (
    ALL_LEAGUE_SQUADS.find((entry) => entry.team.id === teamId) ??
    LEGACY_LEAGUE_SQUADS.find((entry) => entry.team.id === teamId)
  );
}

export function worldClubForTeam(
  teamId: TeamId,
  worldClubs?: readonly WorldClub[],
): WorldClub | undefined {
  const fromSave = resolveWorldClub(teamId, worldClubs);
  if (fromSave) return fromSave;
  return WORLD_CLUBS.get(teamId);
}

export { clubPlaceName } from "../world/club-display.ts";

export function clubDisplayName(teamId: TeamId, worldClubs?: readonly WorldClub[]): string {
  const fromWorld = clubNameFromWorld(teamId, worldClubs);
  if (fromWorld) {
    if (teamId === NORDSTERN_TEAM_ID && /nordstern/i.test(fromWorld)) {
      return "Kieler FC";
    }
    return fromWorld;
  }
  const worldClub = worldClubForTeam(teamId, worldClubs);
  if (worldClub) return worldClub.name;
  const template = templateSquadForClub(teamId);
  return template?.team.name ?? teamId;
}

export function clubShortLabel(teamId: TeamId, worldClubs?: readonly WorldClub[]): string {
  const fromWorld = clubShortNameFromWorld(teamId, worldClubs);
  if (fromWorld) {
    if (teamId === NORDSTERN_TEAM_ID && /nordstern/i.test(fromWorld)) {
      return "KFC";
    }
    return fromWorld;
  }
  const worldClub = worldClubForTeam(teamId, worldClubs);
  if (worldClub) return worldClub.short_name;
  const template = templateSquadForClub(teamId);
  return template?.team.shortName ?? template?.team.name ?? teamId;
}

export function squadForLeagueClub(
  teamId: TeamId,
  rivalPlayers?: readonly Player[],
  playerClubId?: TeamId,
): Squad | undefined {
  const template = templateSquadForClub(teamId);
  if (!template || teamId === playerClubId || !rivalPlayers?.length) {
    return template;
  }
  return squadWithRivalRoster(template, rivalPlayers) ?? template;
}

export function clubIdsForDivision(
  pools: Record<DivisionEconomyId, TeamId[]>,
  divisionId: DivisionEconomyId,
): TeamId[] {
  return [...(pools[divisionId] ?? [])];
}

function templateForWorldClub(club: WorldClub): Squad {
  const team: Team = {
    id: asTeamId(club.id),
    name: club.name,
    shortName: club.short_name,
  };
  const formation = formationForIdentity(club.identity);
  const preset = FORMATION_PRESETS[formation];
  const tactics: TeamTactics = {
    teamId: team.id,
    formation,
    mentality: club.identity === "ambitious" ? 62 : club.identity === "traditional" ? 44 : 52,
    pressing: preset.pressing,
    width: formation === "4-4-2" ? 50 : 60,
    tempo: club.identity === "workers" ? 58 : 50,
    lineHeight: preset.lineHeight,
    intensity: preset.intensity,
    fluidity: preset.fluidity,
    marking: club.identity === "traditional" ? "man" : "zonal",
    keeperDuty: preset.keeperDuty,
    fullbackDuty: preset.fullbackDuty,
    dmDuty: preset.dmDuty,
    cmDuty: preset.cmDuty,
    wideDuty: preset.wideDuty,
    strikerDuty: preset.strikerDuty,
  };
  return fillSquad({
    team,
    prefix: `world-${club.id}`,
    tactics,
    skillShift: 0,
    names: Array.from({ length: 18 }, (_, index) => `${club.short_name} Spieler ${index + 1}`),
  });
}

function formationForIdentity(identity: ClubIdentity): FormationId {
  if (identity === "traditional" || identity === "workers") return "4-4-2";
  return "4-3-3";
}
