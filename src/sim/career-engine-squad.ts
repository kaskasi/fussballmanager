import {
  applySandboxPlan,
  buildCareerEngineSquad,
  nordsternSquad,
  sandboxPlanFromFormation,
  type CareerPlayerInput,
  type FormationId,
  type SandboxPlan,
  type Squad,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export function careerPlayerInputs(players: readonly Player[]): CareerPlayerInput[] {
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
  plan: SandboxPlan | FormationId = nordsternSquad.tactics.formation,
): Squad | undefined {
  const input = careerPlayerInputs(players);
  if (input.length === 0) return undefined;

  const sandbox =
    typeof plan === "string" ? sandboxPlanFromFormation(plan) : plan;
  const template =
    sandbox.formation === nordsternSquad.tactics.formation
      ? nordsternSquad
      : {
          ...nordsternSquad,
          tactics: { ...nordsternSquad.tactics, formation: sandbox.formation },
        };

  return applySandboxPlan(buildCareerEngineSquad(template, input), sandbox);
}

export function careerEngineSquadFromPlayers(players: readonly Player[]): Squad | undefined {
  return suggestCareerSquad(players);
}
