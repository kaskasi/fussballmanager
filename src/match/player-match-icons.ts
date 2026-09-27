import type { Player } from "../types/player.ts";
import { formMark, stateMark } from "../ui/player-profile.ts";

export interface MatchPlayerIcons {
  form: { mark: string; tone: "good" | "mid" | "low"; title: string };
  fitness: { mark: string; tone: "good" | "mid" | "low"; title: string };
  weakFoot: { show: boolean; label: string; title: string };
}

/** F1.1 — form, fitness, weak-foot badges for matchday cards (PRD 09). */
export function matchPlayerIcons(player: Player): MatchPlayerIcons {
  const form = formMark(player.state.form);
  const fitness = stateMark(player.state.fitness, 75, 50);
  const weak = player.attributes.weak_foot;
  return {
    form: {
      mark: form.mark,
      tone: form.tone,
      title: `Form ${player.state.form >= 0 ? "+" : ""}${player.state.form}`,
    },
    fitness: {
      mark: fitness.mark,
      tone: fitness.tone,
      title: `Fitness ${player.state.fitness}%`,
    },
    weakFoot: {
      show: weak < 55,
      label: "WA",
      title: `Schwaches Bein ${weak}`,
    },
  };
}
