import type { Contract, Player } from "../types/player.ts";

/** PRD 03.6 / F3.6 — simple youth wage bands until finances PRD exists. */
export function defaultYouthContract(age: number, currentSeason: number): Contract {
  const wageWeekly = age <= 15 ? 80 : age === 16 ? 120 : 175;
  return {
    wage_weekly: wageWeekly,
    bonus_goal: 0,
    bonus_appearance: 25,
    until_season: currentSeason + (age <= 16 ? 3 : 2),
    guaranteed_minutes_promise: "none",
  };
}

export function ensureYouthContract(player: Player, currentSeason: number): Player {
  if (player.squad_status !== "u17" && player.squad_status !== "u19") return player;
  if (player.contract) return player;
  return { ...player, contract: defaultYouthContract(player.age, currentSeason) };
}
