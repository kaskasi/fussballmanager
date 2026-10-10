import type { Contract, Player } from "../types/player.ts";
import { contractUntilSeasonAfterTerm } from "./contract-until-season.ts";
import { defaultMinutesPromise, playerContractAsk } from "./contract-talks.ts";

/** PRD 05.4 — initial pro contract near fair ask, not inflated. */
export function fairInitialProContract(player: Player, season: number, termYears = 3): Contract {
  const minutesPromise = defaultMinutesPromise(player);
  const ask = playerContractAsk(player, season, minutesPromise);
  return {
    wage_weekly: ask.wageWeekly,
    bonus_goal: 0,
    bonus_appearance: ask.bonusAppearance,
    until_season: contractUntilSeasonAfterTerm(season, termYears),
    guaranteed_minutes_promise: minutesPromise,
  };
}

export function applyFairInitialContract(player: Player, season: number): Player {
  if (player.squad_status !== "pro" || !player.contract) return player;
  const fair = fairInitialProContract(player, season, 2 + (player.age % 2));
  const current = player.contract.wage_weekly;
  if (current <= fair.wage_weekly * 1.05) return player;
  return {
    ...player,
    contract: {
      ...player.contract,
      wage_weekly: fair.wage_weekly,
      bonus_appearance: Math.max(player.contract.bonus_appearance, fair.bonus_appearance),
    },
  };
}
