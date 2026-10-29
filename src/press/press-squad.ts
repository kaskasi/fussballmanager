/** PRD 28 — carry a presser's morale swing into the engine squad the manager already confirmed. */

import {
  careerEngineForm,
  type PlayerSeasonStat,
  type Squad,
} from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";

export function withMoraleForms(squad: Squad, players: readonly Player[]): Squad {
  const byId = new Map(players.map((player) => [player.id, player]));
  const refresh = <T extends { id: string; form: number }>(enginePlayer: T): T => {
    const career = byId.get(enginePlayer.id);
    if (!career) return enginePlayer;
    return { ...enginePlayer, form: careerEngineForm({ form: career.state.form, morale: career.state.morale }) };
  };
  return {
    ...squad,
    starters: squad.starters.map((place) => ({ ...place, player: refresh(place.player) })),
    bench: squad.bench.map(refresh),
  };
}

/** Goals weigh more than assists; nobody stands out without either. */
export function standoutPlayerId(stats: readonly PlayerSeasonStat[] | undefined): string | undefined {
  let best: PlayerSeasonStat | undefined;
  let bestScore = 0;
  for (const row of stats ?? []) {
    const score = row.goals * 3 + row.assists * 2;
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best?.playerId;
}
