import {
  applySandboxPlan,
  buildCareerEngineSquad,
  nordsternSquad,
  sandboxPlanFromFormation,
  type CareerPlayerInput,
  type FormationId,
  type SandboxPlan,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { derivedExperienceFactor } from "../development/experience.ts";
import { isPlayerMatchEligible } from "../development/injury-roll.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { templateSquadForClub } from "./league-divisions.ts";

export function careerPlayerInputs(
  players: readonly Player[],
  clubId: string = DEFAULT_CLUB_ID,
): CareerPlayerInput[] {
  return players
    .filter(
      (player) =>
        player.club_id === clubId && player.squad_status === "pro" && isPlayerMatchEligible(player),
    )
    .map((player) => ({
      id: player.id,
      displayName: formatPlayerName(player),
      position: player.position,
      attributes: player.attributes,
      form: player.state.form,
      fitness: player.state.fitness,
      portraitSeed: player.portrait_seed,
      overall: estimateCa(player.attributes, player.position),
      experience: derivedExperienceFactor(player),
    }));
}

export function suggestCareerSquad(
  players: readonly Player[],
  plan: SandboxPlan | FormationId = nordsternSquad.tactics.formation,
  playerClubId: TeamId = nordsternSquad.team.id,
  clubId: string = DEFAULT_CLUB_ID,
): Squad | undefined {
  const input = careerPlayerInputs(players, clubId);
  if (input.length === 0) return undefined;

  const sandbox =
    typeof plan === "string" ? sandboxPlanFromFormation(plan) : plan;
  const baseTemplate = templateSquadForClub(playerClubId) ?? nordsternSquad;
  const template =
    sandbox.formation === baseTemplate.tactics.formation
      ? baseTemplate
      : {
          ...baseTemplate,
          tactics: { ...baseTemplate.tactics, formation: sandbox.formation },
        };

  return applySandboxPlan(buildCareerEngineSquad(template, input), sandbox);
}

export function careerEngineSquadFromPlayers(
  players: readonly Player[],
  playerClubId: TeamId = nordsternSquad.team.id,
  clubId?: string,
): Squad | undefined {
  const careerClubId = clubId ?? players.find((player) => player.squad_status === "pro")?.club_id ?? DEFAULT_CLUB_ID;
  return suggestCareerSquad(players, nordsternSquad.tactics.formation, playerClubId, careerClubId);
}
