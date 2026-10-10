import type { Player } from "../types/player.ts";

/** Career form −4…+4 → UI scale 4…10 (mid 7.0). */
export function careerFormToLineupScale(careerForm: number): number {
  const clamped = Math.min(4, Math.max(-4, careerForm));
  return Math.round((7 + clamped * 0.75) * 10) / 10;
}

export function engineFormToCareerForm(form: number): number {
  return Math.min(4, Math.max(-4, Math.round((form / 100) * 8 - 4)));
}

export type LineupStatusTone = "good" | "mid" | "low" | "empty";

export function lineupFormTone(display: number): Exclude<LineupStatusTone, "empty"> {
  if (display >= 8.5) return "good";
  if (display >= 6.5) return "mid";
  return "low";
}

export function lineupFormFromCareer(careerForm: number): {
  display: number;
  label: string;
  tone: Exclude<LineupStatusTone, "empty">;
} {
  const display = careerFormToLineupScale(careerForm);
  return {
    display,
    label: display.toFixed(1),
    tone: lineupFormTone(display),
  };
}

export function lineupFormFromPlayer(player: Player) {
  return lineupFormFromCareer(player.state.form);
}

export function lineupFormFromEngineForm(engineForm: number) {
  return lineupFormFromCareer(engineFormToCareerForm(engineForm));
}

/** 5 vertical bars — filled count from fitness 0–100 (0 = empty / exhausted). */
export function lineupFatigueFromFitness(fitness: number): {
  filled: number;
  tone: LineupStatusTone;
} {
  const f = Math.min(100, Math.max(0, fitness));
  const filled = Math.min(5, Math.round(f / 20));
  let tone: LineupStatusTone;
  if (filled === 0) tone = "empty";
  else if (filled >= 4) tone = "good";
  else if (filled >= 2) tone = "mid";
  else tone = "low";
  return { filled, tone };
}

export function lineupWeakFoot(player: Player): { show: boolean; label: string } {
  const weak = player.attributes.weak_foot;
  return {
    show: weak < 55,
    label: "WA",
  };
}
