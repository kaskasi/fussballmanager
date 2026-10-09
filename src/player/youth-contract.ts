import type { Contract, Player } from "../types/player.ts";
import { contractUntilSeasonAfterTerm } from "../transfers/contract-until-season.ts";

/** PRD 03.6 / F3.6 — simple youth wage bands until finances PRD exists. */
export function defaultYouthContract(age: number, currentSeason: number): Contract {
  const wageWeekly = age <= 15 ? 80 : age === 16 ? 120 : 175;
  return {
    wage_weekly: wageWeekly,
    bonus_goal: 0,
    bonus_appearance: 25,
    until_season: contractUntilSeasonAfterTerm(currentSeason, age <= 16 ? 3 : 2),
    guaranteed_minutes_promise: age >= 17 ? "rotation" : "none",
  };
}

export interface YouthContractOptions {
  moraleBoost?: number;
}

function clampMorale(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function signYouthContract(
  player: Player,
  currentSeason: number,
  options: YouthContractOptions = {},
): Player {
  const hadContract = Boolean(player.contract);
  const contract = defaultYouthContract(player.age, currentSeason);
  const moraleBoost = options.moraleBoost ?? (hadContract ? 3 : 8);
  return {
    ...player,
    contract,
    state: {
      ...player.state,
      morale: clampMorale(player.state.morale + moraleBoost),
    },
  };
}

export function ensureYouthContract(player: Player, currentSeason: number): Player {
  if (player.squad_status !== "u17" && player.squad_status !== "u19") return player;
  if (player.contract) return player;
  return signYouthContract(player, currentSeason, { moraleBoost: 0 });
}

export function needsYouthContract(player: Player, currentSeason: number): boolean {
  if (player.squad_status !== "u17" && player.squad_status !== "u19") return false;
  if (!player.contract) return true;
  return player.contract.until_season <= currentSeason;
}
