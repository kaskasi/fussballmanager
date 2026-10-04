import { t } from "../i18n/index.ts";
import type { Player } from "../types/player.ts";
import { isPlayerTired } from "./fitness-management.ts";

/** Same band as match tactics intensity (F2.1 — no dedicated PRD formula). */
export const TRAINING_INTENSITY_MIN = 80;
export const TRAINING_INTENSITY_MAX = 130;
export const DEFAULT_TRAINING_INTENSITY = 100;

export type FatigueAmpel = "good" | "watch" | "risk";

export interface TrainingLoadSummary {
  ampel: FatigueAmpel;
  icon: string;
  label: string;
  tiredCount: number;
  avgFitness: number;
}

export function clampTrainingIntensity(value: number): number {
  return Math.min(TRAINING_INTENSITY_MAX, Math.max(TRAINING_INTENSITY_MIN, Math.round(value)));
}

export function normalizeTrainingIntensity(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return DEFAULT_TRAINING_INTENSITY;
  return clampTrainingIntensity(value);
}

/** Multiplier on weekly training growth (100 = neutral). */
export function trainingIntensityMultiplier(intensity: number): number {
  return normalizeTrainingIntensity(intensity) / 100;
}

function proSquad(players: readonly Player[], clubId: string): Player[] {
  return players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
}

/**
 * Fatigue ampel for the coming training week (F2.1).
 * Icon-first per PRD 09: ● gut · ▲ beobachten · ◆ Risiko.
 */
export function squadTrainingLoad(
  players: readonly Player[],
  clubId: string,
  intensity: number,
  focusCount: number,
  individualProgramCount = 0,
): TrainingLoadSummary {
  const squad = proSquad(players, clubId);
  if (squad.length === 0) {
    return {
      ampel: "good",
      icon: "●",
      label: t("training.load.noSquad"),
      tiredCount: 0,
      avgFitness: 100,
    };
  }

  const tiredCount = squad.filter(isPlayerTired).length;
  const avgFitness =
    squad.reduce((sum, player) => sum + player.state.fitness, 0) / squad.length;
  const tiredRatio = tiredCount / squad.length;
  const loadIndex =
    trainingIntensityMultiplier(intensity) *
      (1 + focusCount * 0.07 + individualProgramCount * 0.05) +
    tiredRatio * 0.55;

  if (loadIndex >= 1.28 || tiredCount >= 3 || (intensity >= 120 && tiredCount >= 2)) {
    return {
      ampel: "risk",
      icon: "◆",
      label: t("training.load.high", {
        tired: tiredCount,
        intensity: normalizeTrainingIntensity(intensity),
      }),
      tiredCount,
      avgFitness,
    };
  }

  if (loadIndex >= 1.05 || tiredCount >= 1 || intensity >= 115) {
    return {
      ampel: "watch",
      icon: "▲",
      label: t("training.load.watch", {
        tired: tiredCount,
        intensity: normalizeTrainingIntensity(intensity),
      }),
      tiredCount,
      avgFitness,
    };
  }

  return {
    ampel: "good",
    icon: "●",
    label: t("training.load.ok", { fitness: Math.round(avgFitness) }),
    tiredCount,
    avgFitness,
  };
}

export function fatigueAmpelClassName(ampel: FatigueAmpel): string {
  if (ampel === "risk") return "is-risk";
  if (ampel === "watch") return "is-watch";
  return "is-set";
}
