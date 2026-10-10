import type { BoardState } from "../board/board-state.ts";
import { normalizeClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import type { Player } from "../types/player.ts";
import { appendPendingFinanceLines, type FinanceLine } from "./finance-ledger.ts";
import { applyFinanceLines } from "./club-finances.ts";
import type { ClubFinances } from "./club-finances.ts";
import { closeFinancingChannel } from "./financing-offers.ts";
import type { FinancingCareerState } from "./financing.ts";
import {
  computeWeeklyLoanPayment,
  SHARK_APR_WEEKLY,
  SHARK_TERM_WEEKS,
  type BankLoan,
} from "./financing.ts";
import type { FinancingStoryChannelId } from "./financing-channels.ts";
import { normalizeClubMerchandising } from "./merchandising.ts";

const FAN_COOP_GRANT = 450_000;
const NAMING_FEE = 600_000;
const SHARK_PRINCIPAL = 350_000;
const LIMITED_DROP_WEEKS = 10;
const LIMITED_DROP_DEMAND = 1.28;

export interface FinancingApplyResult {
  finances: ClubFinances;
  financing: FinancingCareerState;
  stadium?: ClubStadium;
  board?: BoardState;
  players?: Player[];
}

function applyGrant(
  finances: ClubFinances,
  kind: FinanceLine["kind"],
  amount: number,
  week: number,
): ClubFinances {
  const line: FinanceLine = { kind, amount, week };
  let next = applyFinanceLines(finances, [line]);
  next = appendPendingFinanceLines(next, [line]);
  return next;
}

export function applyFinancingStoryChoice(
  channelId: FinancingStoryChannelId,
  choiceId: string,
  context: {
    finances: ClubFinances;
    financing: FinancingCareerState;
    stadium: ClubStadium;
    board: BoardState;
    players: Player[];
    season: number;
    week: number;
  },
): FinancingApplyResult {
  let finances = context.finances;
  let financing = context.financing;
  let stadium = context.stadium;
  let board = { ...context.board };

  if (choiceId === "decline") {
    return {
      finances,
      financing: closeFinancingChannel(financing, channelId, "declined"),
      stadium,
      board,
      players: context.players,
    };
  }

  financing = closeFinancingChannel(financing, channelId, "accepted");

  switch (channelId) {
    case "fan_stadium_coop":
      finances = applyGrant(finances, "financing_fan_coop_grant", FAN_COOP_GRANT, context.week);
      stadium = advanceClubFanbase(stadium, -0.8);
      break;
    case "loan_shark_instant": {
      const weekly_payment = computeWeeklyLoanPayment(
        SHARK_PRINCIPAL,
        SHARK_APR_WEEKLY,
        SHARK_TERM_WEEKS,
      );
      const loan: BankLoan = {
        principal: SHARK_PRINCIPAL,
        remaining: SHARK_PRINCIPAL,
        apr_weekly: SHARK_APR_WEEKLY,
        weekly_payment,
        drawn_season: context.season,
        drawn_week: context.week,
      };
      finances = applyGrant(finances, "loan_draw", SHARK_PRINCIPAL, context.week);
      financing = { ...financing, active_shark_loan: loan };
      board = { ...board, pressure: Math.min(100, board.pressure + 8) };
      break;
    }
    case "naming_rights_sale": {
      finances = applyGrant(finances, "financing_naming_fee", NAMING_FEE, context.week);
      const sponsor = "NordEnergy Arena";
      const baseName = stadium.stadium_name_before_naming ?? stadium.name;
      stadium = normalizeClubStadium({
        ...stadium,
        stadium_name_before_naming: baseName,
        name: sponsor,
        naming_rights_sponsor: sponsor,
        naming_rights_until_season: context.season + 3,
      });
      stadium = advanceClubFanbase(stadium, -1.2);
      break;
    }
    case "merch_digi_drop": {
      const merch = normalizeClubMerchandising(stadium.merchandising);
      const until = careerWeekIndex(context.season, context.week) + LIMITED_DROP_WEEKS;
      stadium = normalizeClubStadium({
        ...stadium,
        merchandising: {
          ...merch,
          limited_drop_until_career_week: until,
          limited_drop_demand_multiplier: LIMITED_DROP_DEMAND,
        },
      });
      break;
    }
  }

  return { finances, financing, stadium, board, players: context.players };
}
