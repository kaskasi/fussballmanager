import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import { defaultYouthContract } from "../player/youth-contract.ts";
import {
  addCalendarDays,
  daysUntil,
  type CalendarPoint,
} from "../sim/calendar-days.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";
import type { Contract, Player } from "../types/player.ts";
import { estimateCa } from "./market-value.ts";

/** PRD 05.4 — market_value × 0.8% per year, paid weekly. */
export const WAGE_ANCHOR_YEAR_RATE = 0.008;
export const FRUSTRATION_THRESHOLD = 3;
export const FRUSTRATION_MORALE_HIT = 10;
export const STAR_CA = 90;
export const MIN_PRO_WEEKLY_WAGE = 200;
export const ACCEPT_WAGE_RATIO = 0.97;
export const ACCEPT_BONUS_RATIO = 0.45;
export const TERM_YEARS_MIN = 1;
export const TERM_YEARS_MAX = 5;
export const CONTRACT_SIGN_COOLDOWN_DAYS = 60;
export const CONTRACT_FAIL_COOLDOWN_DAYS = 45;

export type MinutesPromise = NonNullable<Contract["guaranteed_minutes_promise"]>;

const PROMISE_RANK: Record<MinutesPromise, number> = {
  none: 0,
  rotation: 1,
  starter: 2,
};

export interface ContractOffer {
  wageWeekly: number;
  termYears: number;
  bonusAppearance: number;
  minutesPromise: MinutesPromise;
}

export interface ContractAsk {
  wageWeekly: number;
  termYearsMin: number;
  bonusAppearance: number;
  advisorHint: string;
}

export interface ContractTalkResult {
  player: Player;
  accepted: boolean;
  message: string;
}

export type TalkBlockKind = "signed" | "angry" | "bigger_club";

export const TALK_BLOCK_REASON: Record<TalkBlockKind, string> = {
  signed: "Hat gerade einen neuen Vertrag unterzeichnet.",
  angry: "Ist sauer und will erst mal nicht reden.",
  bigger_club: "Will zu einem größeren Verein — unterzeichnet hier nicht mehr.",
};

export interface ContractTalkLock {
  allowed: boolean;
  kind: TalkBlockKind | null;
  reason: string | null;
}

function clampMorale(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function weeklyWageAnchor(marketValue: number): number {
  return Math.max(1, Math.round((marketValue * WAGE_ANCHOR_YEAR_RATE) / 52));
}

export function currentMinutesPromise(player: Player): MinutesPromise {
  return player.contract?.guaranteed_minutes_promise ?? "none";
}

export function roleWageModifier(player: Player, promise: MinutesPromise = currentMinutesPromise(player)): number {
  const rating = estimateCa(player.attributes, player.position);
  if (player.squad_status === "pro" && rating >= STAR_CA) return 1.3;
  if (promise === "starter") return 1.1;
  if (promise === "rotation") return 0.85;
  return 1;
}

export function isSlumpTalk(player: Player): boolean {
  return player.hidden.breakout_flags.includes("success_inflation");
}

export function playerContractAsk(
  player: Player,
  season: number,
  promise: MinutesPromise = currentMinutesPromise(player),
): ContractAsk {
  const youth = player.squad_status === "u17" || player.squad_status === "u19";
  let wage = weeklyWageAnchor(player.market_value);
  if (youth) {
    wage = Math.max(wage, defaultYouthContract(player.age, season).wage_weekly);
  } else {
    wage = Math.max(wage, MIN_PRO_WEEKLY_WAGE);
  }
  wage = Math.round(wage * roleWageModifier(player, promise));
  if (player.state.desire_to_leave) {
    wage = Math.round(wage * 1.2);
  }

  const slump = isSlumpTalk(player);
  const termYearsMin = slump ? 4 : youth ? (player.age <= 16 ? 3 : 2) : 2;
  const bonusAppearance = slump ? Math.round(wage * 0.05) : Math.round(wage * 0.15);

  let advisorHint = "Will vor allem ein faires Gehalt.";
  if (slump) {
    advisorHint = "Will Sicherheit — lange Laufzeit, kleiner Bonus.";
  } else if (currentMinutesPromise(player) === "starter") {
    advisorHint = "Will seinen Stammplatz behalten.";
  } else if (player.age <= 18) {
    advisorHint = "Will Perspektive: Laufzeit zählt fast so viel wie Geld.";
  } else if (roleWageModifier(player, promise) >= 1.3) {
    advisorHint = "Sieht sich als Stammkraft — Gehalt zuerst.";
  }

  return { wageWeekly: wage, termYearsMin, bonusAppearance, advisorHint };
}

export function evaluateContractOffer(
  player: Player,
  season: number,
  offer: ContractOffer,
): "accept" | "reject" {
  const ask = playerContractAsk(player, season, offer.minutesPromise);
  if (PROMISE_RANK[offer.minutesPromise] < PROMISE_RANK[currentMinutesPromise(player)]) {
    return "reject";
  }
  if (offer.termYears < ask.termYearsMin) return "reject";
  if (offer.wageWeekly < ask.wageWeekly * ACCEPT_WAGE_RATIO) return "reject";
  if (offer.bonusAppearance < ask.bonusAppearance * ACCEPT_BONUS_RATIO) return "reject";
  return "accept";
}

export function wageDeltaFitsBudget(
  headroomWeekly: number,
  currentWageWeekly: number,
  offeredWageWeekly: number,
): boolean {
  const delta = offeredWageWeekly - currentWageWeekly;
  return delta <= headroomWeekly;
}

export function remainingContractYears(player: Player, season: number): number {
  if (!player.contract) return 0;
  return Math.max(0, player.contract.until_season - season);
}

export function defaultMinutesPromise(player: Player): MinutesPromise {
  if (player.contract?.guaranteed_minutes_promise) {
    return player.contract.guaranteed_minutes_promise;
  }
  const youth = player.squad_status === "u17" || player.squad_status === "u19";
  return youth && player.age >= 17 ? "rotation" : "none";
}

export function defaultContractOffer(player: Player, season: number): ContractOffer {
  const minutesPromise = defaultMinutesPromise(player);
  const ask = playerContractAsk(player, season, minutesPromise);
  const remaining = remainingContractYears(player, season);
  const currentWage = player.contract?.wage_weekly ?? 0;
  const currentBonus = player.contract?.bonus_appearance ?? 0;
  return {
    wageWeekly: Math.max(currentWage, ask.wageWeekly),
    termYears: Math.min(
      TERM_YEARS_MAX,
      Math.max(ask.termYearsMin, remaining || ask.termYearsMin),
    ),
    bonusAppearance: Math.max(currentBonus, ask.bonusAppearance),
    minutesPromise,
  };
}

export function contractTalkBounds(
  player: Player,
  season: number,
  promise: MinutesPromise = currentMinutesPromise(player),
): {
  wageMin: number;
  wageMax: number;
  termMin: number;
  termMax: number;
  bonusMin: number;
  bonusMax: number;
} {
  const ask = playerContractAsk(player, season, promise);
  const currentWage = player.contract?.wage_weekly ?? 0;
  const currentBonus = player.contract?.bonus_appearance ?? 0;
  const wageFloor = Math.max(1, Math.round(ask.wageWeekly * 0.55));
  const wageMin = currentWage > 0 ? Math.min(wageFloor, currentWage) : wageFloor;
  const wageMax = Math.max(Math.round(ask.wageWeekly * 1.8), currentWage, ask.wageWeekly);
  const bonusMax = Math.max(ask.bonusAppearance * 2, currentBonus, 25);
  return {
    wageMin,
    wageMax: Math.max(wageMax, wageMin),
    termMin: TERM_YEARS_MIN,
    termMax: TERM_YEARS_MAX,
    bonusMin: 0,
    bonusMax,
  };
}

export function lockContractTalks(player: Player, calendar: CalendarPoint, days: number): Player {
  const until = addCalendarDays(calendar, days);
  return {
    ...player,
    state: {
      ...player.state,
      contract_talks_locked_until_day: until.dayIndex,
    },
  };
}

export function contractTalkLock(player: Player, calendar: CalendarPoint): ContractTalkLock {
  const failed = player.state.contract_failed_offers ?? 0;
  const until = player.state.contract_talks_locked_until_day;
  const lockedNow = until != null && daysUntil(calendar, until) > 0;

  if (lockedNow && failed >= FRUSTRATION_THRESHOLD) {
    return { allowed: false, kind: "angry", reason: TALK_BLOCK_REASON.angry };
  }
  if (lockedNow && failed === 0) {
    return { allowed: false, kind: "signed", reason: TALK_BLOCK_REASON.signed };
  }
  if (failed >= FRUSTRATION_THRESHOLD && player.state.desire_to_leave) {
    return { allowed: false, kind: "bigger_club", reason: TALK_BLOCK_REASON.bigger_club };
  }
  return { allowed: true, kind: null, reason: null };
}

export function applyContractOffer(player: Player, season: number, offer: ContractOffer): Player {
  const hadContract = Boolean(player.contract);
  const moraleBoost = hadContract ? 4 : 8;
  let next: Player = {
    ...player,
    contract: {
      wage_weekly: Math.round(offer.wageWeekly),
      bonus_goal: player.contract?.bonus_goal ?? 0,
      bonus_appearance: Math.round(offer.bonusAppearance),
      until_season: season + Math.round(offer.termYears),
      buyout_clause: player.contract?.buyout_clause,
      sell_on_percentage: player.contract?.sell_on_percentage,
      guaranteed_minutes_promise: offer.minutesPromise,
    },
    state: {
      ...player.state,
      morale: clampMorale(player.state.morale + moraleBoost),
      contract_failed_offers: 0,
      desire_to_leave: false,
    },
  };
  if (!hadContract) {
    next = grantAchievement(next, ACHIEVEMENT.contractSigned);
  }
  return next;
}

export function submitContractOffer(
  player: Player,
  season: number,
  offer: ContractOffer,
  calendar: CalendarPoint,
): ContractTalkResult {
  if (player.squad_status === "loaned_out") {
    return { player, accepted: false, message: "Ausgeliehene Spieler verhandeln nicht hier." };
  }

  const lock = contractTalkLock(player, calendar);
  if (!lock.allowed) {
    return { player, accepted: false, message: lock.reason ?? "Gesprächssperre." };
  }

  if (evaluateContractOffer(player, season, offer) === "accept") {
    const next = lockContractTalks(
      applyContractOffer(player, season, offer),
      calendar,
      CONTRACT_SIGN_COOLDOWN_DAYS,
    );
    return {
      player: next,
      accepted: true,
      message: `Vertrag bis ${formatSeasonLabel(next.contract?.until_season ?? season)} · € ${next.contract?.wage_weekly}/Woche.`,
    };
  }

  const failed = (player.state.contract_failed_offers ?? 0) + 1;
  let next: Player = {
    ...player,
    state: {
      ...player.state,
      contract_failed_offers: failed,
    },
  };
  if (failed >= FRUSTRATION_THRESHOLD) {
    next = lockContractTalks(
      {
        ...next,
        state: {
          ...next.state,
          morale: clampMorale(next.state.morale - FRUSTRATION_MORALE_HIT),
          desire_to_leave: true,
        },
      },
      calendar,
      CONTRACT_FAIL_COOLDOWN_DAYS,
    );
    return {
      player: next,
      accepted: false,
      message: TALK_BLOCK_REASON.angry,
    };
  }
  return {
    player: next,
    accepted: false,
    message: `Angebot abgelehnt (${failed}/${FRUSTRATION_THRESHOLD}) — will mehr Gehalt, Laufzeit oder Einsatz.`,
  };
}
