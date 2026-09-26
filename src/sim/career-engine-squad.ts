import {
  buildCareerEngineSquad,
  nordsternSquad,
  type CareerPlayerInput,
  type FormationId,
  type Squad,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

function careerPlayerInputs(players: readonly Player[]): CareerPlayerInput[] {
  return players
    .filter((player) => player.club_id === DEFAULT_CLUB_ID && player.squad_status === "pro")
    .map((player) => ({
      id: player.id,
      displayName: formatPlayerName(player),
      position: player.position,
      attributes: player.attributes,
      form: player.state.form,
      fitness: player.state.fitness,
      portraitSeed: player.portrait_seed,
      overall: estimateCa(player.attributes, player.position),
    }));
}

export function suggestCareerSquad(
  players: readonly Player[],
  formation: FormationId = nordsternSquad.tactics.formation,
): Squad | undefined {
  const input = careerPlayerInputs(players);
  if (input.length === 0) return undefined;

  const template =
    formation === nordsternSquad.tactics.formation
      ? nordsternSquad
      : {
          ...nordsternSquad,
          tactics: { ...nordsternSquad.tactics, formation },
        };

  return buildCareerEngineSquad(template, input);
}

export function careerEngineSquadFromPlayers(players: readonly Player[]): Squad | undefined {
  return suggestCareerSquad(players);
}
