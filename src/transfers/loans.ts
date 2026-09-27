import { isWinterTransferWindow } from "../sim/game-calendar.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
import type { Player } from "../types/player.ts";
import { sellerAskingPrice } from "./negotiations.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { loanClubName } from "./loan-roster.ts";
import {
  DEFAULT_LOAN_PARTNER_ID,
  loanPlayerOut,
  type TransferRecord,
} from "./transfer-history.ts";

/** PRD 05.7 — max 5 players loaned out per club. */
export const MAX_LOANS_OUT_PER_CLUB = 5;

/** PRD 05.7 — loan fee guideline for talents with playing-time guarantee. */
export const LOAN_FEE_RATE = 0.15;

export interface LoanEligibility {
  allowed: boolean;
  reason?: string;
}

export function countActiveLoansOut(players: readonly Player[], clubId: string): number {
  return players.filter(
    (player) =>
      player.squad_status === "loaned_out" &&
      player.current_loan?.from_club === clubId,
  ).length;
}

export function estimateLoanFee(player: Player, season: number): number {
  return Math.round(sellerAskingPrice(player, season) * LOAN_FEE_RATE);
}

export function canLoanPlayerOut(
  players: readonly Player[],
  clubId: string,
  week: number,
  player: Player,
): LoanEligibility {
  if (!isTransferWindowOpen(week)) {
    return { allowed: false, reason: "Leihen nur in Sommer- oder Winterfenster möglich." };
  }
  if (player.squad_status === "loaned_out") {
    return { allowed: false, reason: "Spieler ist bereits verliehen." };
  }
  if (player.club_id && player.club_id !== clubId) {
    return { allowed: false, reason: "Nur eigene Spieler können verliehen werden." };
  }
  if (countActiveLoansOut(players, clubId) >= MAX_LOANS_OUT_PER_CLUB) {
    return { allowed: false, reason: `Maximal ${MAX_LOANS_OUT_PER_CLUB} Ausleihen gleichzeitig.` };
  }
  return { allowed: true };
}

/** PRD 05.7 — recall clause available in the winter transfer window. */
export function canRecallLoan(week: number, player: Player): LoanEligibility {
  if (player.squad_status !== "loaned_out" || !player.current_loan) {
    return { allowed: false, reason: "Spieler ist nicht verliehen." };
  }
  if (!isWinterTransferWindow(week)) {
    return { allowed: false, reason: "Recall nur im Winterfenster (KW 2–4)." };
  }
  return { allowed: true };
}

export function loanYouthPlayer(
  player: Player,
  season: number,
  week: number,
  fromClubId: string,
  toClubId = DEFAULT_LOAN_PARTNER_ID,
): { player: Player; record: TransferRecord; fee: number } {
  const fee = estimateLoanFee(player, season);
  const loaned = loanPlayerOut(player, season, week, fromClubId, toClubId, fee);
  return { ...loaned, fee };
}

export function recallLoanPlayer(
  player: Player,
  season: number,
  week: number,
): { player: Player; record: TransferRecord } | null {
  if (!canRecallLoan(week, player).allowed || !player.current_loan) {
    return null;
  }

  const restoredStatus: Player["squad_status"] =
    player.age >= 18 ? "pro" : player.age >= 16 ? "u19" : "u17";
  const record: TransferRecord = {
    id: `tr_${season}_${week}_loan_recall_${player.id}`,
    season,
    week,
    kind: "loan_return",
    player_id: player.id,
    player_name: formatPlayerName(player),
    other_club_id: player.current_loan.to_club,
    other_club_name: loanClubName(player.current_loan.to_club),
  };
  const { current_loan: _loan, ...rest } = player;
  return {
    player: {
      ...rest,
      squad_status: restoredStatus,
    },
    record,
  };
}
