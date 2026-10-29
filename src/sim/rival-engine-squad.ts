import {
  buildCareerEngineSquad,
  type CareerPlayerInput,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { derivedExperienceFactor } from "../development/experience.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { careerTeamId } from "./rival-growth.ts";

export function rivalPlayersForTeam(
  rivalPlayers: readonly Player[],
  teamId: TeamId,
): Player[] {
  const clubId = careerTeamId(teamId);
  return rivalPlayers.filter((player) => player.club_id === clubId);
}

export function buildRivalEngineSquad(template: Squad, roster: readonly Player[]): Squad {
  const input: CareerPlayerInput[] = roster.map((player) => ({
    id: player.id,
    displayName: formatPlayerName(player),
    position: player.position,
    attributes: player.attributes,
    form: player.state.form,
    fitness: player.state.fitness,
    morale: player.state.morale,
    portraitSeed: player.portrait_seed,
    overall: estimateCa(player.attributes, player.position),
    experience: derivedExperienceFactor(player),
  }));
  return buildCareerEngineSquad(template, input);
}

export function squadWithRivalRoster(
  template: Squad | undefined,
  rivalPlayers: readonly Player[],
): Squad | undefined {
  if (!template) return undefined;
  const roster = rivalPlayersForTeam(rivalPlayers, template.team.id);
  if (roster.length === 0) return template;
  return buildRivalEngineSquad(template, roster);
}
