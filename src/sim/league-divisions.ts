import { NORDSTERN_ID, SEED_DIVISION, SEED_OBERLIGA, type Squad, type TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { DIVISION_ECONOMY } from "../economy/division-economy.ts";
import type { Player } from "../types/player.ts";
import { squadWithRivalRoster } from "./rival-engine-squad.ts";

export const REGIONALLIGA_ID: DivisionEconomyId = "regionalliga-nord";
export const OBERLIGA_ID: DivisionEconomyId = "oberliga-nord";

export const ALL_LEAGUE_SQUADS: readonly Squad[] = [...SEED_DIVISION, ...SEED_OBERLIGA];

export function defaultLeaguePools(): Record<DivisionEconomyId, TeamId[]> {
  return {
    "regionalliga-nord": SEED_DIVISION.map((squad) => squad.team.id),
    "oberliga-nord": SEED_OBERLIGA.map((squad) => squad.team.id),
  };
}

export function divisionLabel(divisionId: DivisionEconomyId): string {
  return DIVISION_ECONOMY[divisionId].label;
}

export function templateSquadForClub(teamId: TeamId): Squad | undefined {
  return ALL_LEAGUE_SQUADS.find((entry) => entry.team.id === teamId);
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
