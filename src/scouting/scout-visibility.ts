import type { AbilityEstimate } from "./estimate-model.ts";
import type { Player } from "../types/player.ts";
import { roundStat } from "../types/player-display.ts";
import { formatMarketValueShort } from "../squad/pro-roster.ts";
import { estimateCa, marketValue } from "../transfers/market-value.ts";

export interface ScoutValueBounds {
  low: number;
  high: number;
  exact: boolean;
}

function marketValueFromPlayerCa(player: Player, ca: number, season: number): number {
  const wage = player.contract?.wage_weekly ?? 0;
  const seasonsLeft = player.contract ? Math.max(0, player.contract.until_season - season) : 0;
  return marketValue({
    ca,
    age: player.age,
    monthsRemaining: seasonsLeft * 12,
    wage,
    marketWage: Math.max(1, wage),
    demandFactor: 1,
    reputationFactor: 1,
  });
}

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

/** Sortable midpoint — never uses true CA until the player is well known. */
export function scoutMarketValueEstimate(
  player: Player,
  estimate: AbilityEstimate,
  season: number,
  owned: boolean,
): number {
  const bounds = scoutMarketValueBounds(player, estimate, season, owned);
  if (!bounds) return 0;
  return bounds.exact ? bounds.low : Math.round((bounds.low + bounds.high) / 2);
}

export function scoutMarketValueBounds(
  player: Player,
  estimate: AbilityEstimate,
  season: number,
  owned: boolean,
): ScoutValueBounds | null {
  if (owned) {
    return { low: player.market_value, high: player.market_value, exact: true };
  }
  const reveal = scoutReveal(estimate.uncertaintyRange);
  if (!reveal.showCi && !reveal.showExactCa) return null;
  if (reveal.showExactCa) {
    const exact = marketValueFromPlayerCa(player, estimateCa(player.attributes, player.position), season);
    return { low: exact, high: exact, exact: true };
  }
  const half = estimate.uncertaintyRange / 2;
  const lowCa = Math.max(0, estimate.estimatedAbilityMean - half);
  const highCa = Math.min(199, estimate.estimatedAbilityMean + half);
  return {
    low: marketValueFromPlayerCa(player, lowCa, season),
    high: marketValueFromPlayerCa(player, highCa, season),
    exact: false,
  };
}

export function formatScoutMarketValue(
  player: Player,
  estimate: AbilityEstimate,
  season: number,
  owned: boolean,
): string {
  const bounds = scoutMarketValueBounds(player, estimate, season, owned);
  if (!bounds) return "?";
  if (bounds.exact) return formatMarketValueShort(bounds.low);
  return `${formatMarketValueShort(bounds.low)}–${formatMarketValueShort(bounds.high)}`;
}
