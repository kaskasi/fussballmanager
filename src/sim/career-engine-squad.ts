import {
  buildCareerEngineSquad,
  nordsternSquad,
  type CareerPlayerInput,
  type Squad,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export function careerEngineSquadFromPlayers(players: readonly Player[]): Squad | undefined {
  const pros = players.filter(
    (player) => player.club_id === DEFAULT_CLUB_ID && player.squad_status === "pro",
  );
  if (pros.length === 0) return undefined;

  const input: CareerPlayerInput[] = pros.map((player) => ({
    id: player.id,
    displayName: formatPlayerName(player),
    position: player.position,
    attributes: player.attributes,
    form: player.state.form,
    fitness: player.state.fitness,
    portraitSeed: player.portrait_seed,
    overall: estimateCa(player.attributes, player.position),
  }));

  return buildCareerEngineSquad(nordsternSquad, input);
}
