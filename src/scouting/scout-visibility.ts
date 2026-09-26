import type { AbilityEstimate } from "./estimate-model.ts";
import type { Player } from "../types/player.ts";
import { roundStat } from "../types/player-display.ts";
import { estimateCa } from "../transfers/market-value.ts";

/** How much of a foreign player the UI may reveal from scout knowledge. */
export interface ScoutReveal {
  showExactSkills: boolean;
  showExactState: boolean;
  showExactCa: boolean;
  showCi: boolean;
  visibleBarCount: number;
  barFillRatio: number;
}

export function scoutReveal(uncertaintyRange: number): ScoutReveal {
  if (uncertaintyRange >= 40) {
    return {
      showExactSkills: false,
      showExactState: false,
      showExactCa: false,
      showCi: false,
      visibleBarCount: 2,
      barFillRatio: 0,
    };
  }
  if (uncertaintyRange >= 20) {
    return {
      showExactSkills: false,
      showExactState: false,
      showExactCa: false,
      showCi: true,
      visibleBarCount: 4,
      barFillRatio: 0.2,
    };
  }
  if (uncertaintyRange >= 10) {
    return {
      showExactSkills: false,
      showExactState: false,
      showExactCa: false,
      showCi: true,
      visibleBarCount: 6,
      barFillRatio: 0.45,
    };
  }
  return {
    showExactSkills: true,
    showExactState: true,
    showExactCa: true,
    showCi: false,
    visibleBarCount: 6,
    barFillRatio: 1,
  };
}

export function formatScoutCa(player: Player, estimate: AbilityEstimate, owned: boolean): string {
  if (owned) return String(roundStat(estimateCa(player.attributes, player.position)));
  const reveal = scoutReveal(estimate.uncertaintyRange);
  if (!reveal.showExactCa) {
    if (!reveal.showCi) return "?";
    const half = estimate.uncertaintyRange / 2;
    const low = Math.max(0, Math.round(estimate.estimatedAbilityMean - half));
    const high = Math.min(199, Math.round(estimate.estimatedAbilityMean + half));
    return `${low}–${high}`;
  }
  return String(roundStat(estimateCa(player.attributes, player.position)));
}

export function formatScoutStateValue(value: number, estimate: AbilityEstimate, owned: boolean): string {
  if (owned) return String(value);
  if (!scoutReveal(estimate.uncertaintyRange).showExactState) return "?";
  return String(value);
}
