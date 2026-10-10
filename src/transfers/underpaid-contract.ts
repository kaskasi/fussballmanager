import { calendarDayIndex, type CalendarPoint } from "../sim/calendar-days.ts";
import type { Player } from "../types/player.ts";
import { playerContractAsk } from "./contract-talks.ts";

export const UNDERPAID_WAGE_RATIO = 0.85;
export const UNDERPAID_MIN_SEASONS = 1;
const PROMPT_MONTHS = [3, 9, 12] as const;
const DAYS_PER_MONTH = 30;

export interface UnderpaidWeekResult {
  player: Player;
  /** 3, 9, or 12 when a new story prompt should fire. */
  newPromptMonth?: (typeof PROMPT_MONTHS)[number];
}

function fairWeeklyWage(player: Player, season: number): number {
  return playerContractAsk(player, season).wageWeekly;
}

export function isUnderpaid(player: Player, season: number): boolean {
  if (!player.contract || player.squad_status === "loaned_out") return false;
  if (player.state.contract_demoralized) return false;
  const fair = fairWeeklyWage(player, season);
  return player.contract.wage_weekly < fair * UNDERPAID_WAGE_RATIO;
}

export function advanceUnderpaidContractWeek(
  player: Player,
  season: number,
  calendar: CalendarPoint,
): UnderpaidWeekResult {
  if (!isUnderpaid(player, season)) {
    if (player.state.contract_underpaid_since_day != null) {
      return {
        player: {
          ...player,
          state: {
            ...player.state,
            contract_underpaid_since_day: undefined,
          },
        },
      };
    }
    return { player };
  }

  const nowIndex = calendarDayIndex(calendar.season, calendar.week, calendar.weekday);
  const since = player.state.contract_underpaid_since_day ?? nowIndex;
  let next: Player = {
    ...player,
    state: {
      ...player.state,
      contract_underpaid_since_day: since,
    },
  };

  const daysUnder = Math.max(0, nowIndex - since);
  const monthsUnder = Math.floor(daysUnder / DAYS_PER_MONTH);
  const promptsSent = next.state.contract_renegotiation_prompts ?? 0;

  for (const month of PROMPT_MONTHS) {
    if (monthsUnder >= month && promptsSent < month) {
      return {
        player: {
          ...next,
          state: {
            ...next.state,
            contract_renegotiation_prompts: month,
          },
        },
        newPromptMonth: month,
      };
    }
  }

  if (monthsUnder >= 12 && promptsSent >= 12 && !next.state.contract_demoralized) {
    next = {
      ...next,
      state: {
        ...next.state,
        contract_demoralized: true,
        morale: Math.min(next.state.morale, 35),
      },
    };
  }

  return { player: next };
}

export function underpaidMoraleCap(player: Player): number | null {
  if (player.state.contract_demoralized) return 45;
  return null;
}
