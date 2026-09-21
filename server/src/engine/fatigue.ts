import type { MatchState, PlayerMatchStatus } from "@fussballmanager/shared";
import { clamp } from "./helpers.ts";

/** Fatigue added per elapsed second at 100 intensity, early in the match. */
const BASE_PER_SECOND = 0.014;

export function fatigueGain(input: {
  seconds: number;
  intensity: number;
  pressing: number;
  stamina: number;
  minute: number;
  defending: boolean;
}): number {
  const intensity = clamp(input.intensity, 80, 130) / 100;
  const late = input.minute >= 60 ? 1.45 + Math.max(0, intensity - 1) * 1.4 : 1;
  const stamina = 0.72 + (100 - input.stamina) / 180;
  const press = input.defending ? 0.55 + 0.7 * (input.pressing / 100) : 0.85;
  return (
    input.seconds *
    BASE_PER_SECOND *
    intensity *
    late *
    stamina *
    press *
    (intensity > 1 ? 1 + (intensity - 1) * 0.8 : 1)
  );
}

export function tickFatigue(state: MatchState, seconds: number): PlayerMatchStatus[] {
  if (seconds <= 0) {
    return [...state.players];
  }
  return state.players.map((player) => {
    if (!player.onPitch || player.sentOff) {
      return player;
    }
    const tactics =
      player.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
    const defending =
      state.possessionTeamId !== null && player.teamId !== state.possessionTeamId;
    const gain = fatigueGain({
      seconds,
      intensity: tactics.intensity,
      pressing: tactics.pressing,
      stamina: player.attributes.stamina,
      minute: state.clock.minute,
      defending,
    });
    return { ...player, fatigue: clamp(player.fatigue + gain, 0, 100) };
  });
}
