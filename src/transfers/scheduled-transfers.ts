/**
 * PRD 05 — deals agreed outside a transfer window wait for the next window.
 * The player stays at his club (and keeps playing) until the first day of the next window;
 * then he moves and the fee is paid. A waiting purchase's fee is reserved in the transfer pot.
 */
import { processTransferBreakout } from "../development/breakouts.ts";
import { applyPlayerSaleIncome, applyTransferFee, type ClubFinances } from "../economy/club-finances.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import { formatCalendarWeekDisplay, formatSeasonDisplay } from "../i18n/calendar-display.ts";
import { t } from "../i18n/index.ts";
import { nextTransferWindowStart } from "../sim/game-calendar.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { applyContractOffer, type ContractOffer } from "./contract-talks.ts";
import { loanClubName } from "./loan-roster.ts";
import { completePurchase, type TransferState } from "./negotiations.ts";
import { completeSale } from "./player-sales.ts";
import { appendTransferRecord, type TransferRecord } from "./transfer-history.ts";

export interface ScheduledTransfer {
  id: string;
  player_id: string;
  /** "in" = we bought him, "out" = we sold him. */
  direction: "in" | "out";
  other_club_id: string;
  fee: number;
  /** Agreed personal terms for an incoming player, applied on transfer day. */
  contract?: ContractOffer;
  agreed_season: number;
  agreed_week: number;
  effective_season: number;
  effective_week: number;
  /** The pending row in `history` that is completed on transfer day. */
  history_id: string;
}

export function scheduledTransferFor(state: TransferState, playerId: string): ScheduledTransfer | undefined {
  return (state.scheduled_transfers ?? []).find((entry) => entry.player_id === playerId);
}

export function hasScheduledTransfer(state: TransferState, playerId: string): boolean {
  return scheduledTransferFor(state, playerId) !== undefined;
}

export function scheduledPlayerIds(state: TransferState): Set<string> {
  return new Set((state.scheduled_transfers ?? []).map((entry) => entry.player_id));
}

/** Fees we have promised for waiting purchases — not available for new deals. */
export function committedTransferFees(state: TransferState | undefined): number {
  return (state?.scheduled_transfers ?? [])
    .filter((entry) => entry.direction === "in")
    .reduce((sum, entry) => sum + entry.fee, 0);
}

/** "KW 2" this season, "KW 35 · Saison 2027/28" when the move falls into the next season. */
export function scheduledMoveLabel(effective: { season: number; week: number }, currentSeason: number): string {
  const kw = formatCalendarWeekDisplay(effective.week);
  return effective.season === currentSeason
    ? kw
    : t("transfer.scheduled.whenNextSeason", { kw, season: formatSeasonDisplay(effective.season) });
}

/** Why a player with a waiting transfer can't get a new contract, be listed, loaned or sold again. */
export function scheduledTransferReason(state: TransferState, playerId: string, currentSeason: number): string | null {
  const entry = scheduledTransferFor(state, playerId);
  if (!entry) return null;
  const when = scheduledMoveLabel({ season: entry.effective_season, week: entry.effective_week }, currentSeason);
  return entry.direction === "out"
    ? t("transfer.scheduled.blockedOut", { club: loanClubName(entry.other_club_id), when })
    : t("transfer.scheduled.blockedIn", { when });
}

export function scheduleTransfer(input: {
  state: TransferState;
  player: Player;
  direction: "in" | "out";
  otherClubId: string;
  fee: number;
  contract?: ContractOffer;
  season: number;
  week: number;
}): { state: TransferState; entry: ScheduledTransfer } {
  const effective = nextTransferWindowStart(input.season, input.week);
  const historyId = `tr_${input.season}_${input.week}_${input.direction}_${input.player.id}`;
  const entry: ScheduledTransfer = {
    id: `st_${input.season}_${input.week}_${input.player.id}`,
    player_id: input.player.id,
    direction: input.direction,
    other_club_id: input.otherClubId,
    fee: input.fee,
    contract: input.contract,
    agreed_season: input.season,
    agreed_week: input.week,
    effective_season: effective.season,
    effective_week: effective.week,
    history_id: historyId,
  };
  const record: TransferRecord = {
    id: historyId,
    season: input.season,
    week: input.week,
    kind: input.direction,
    player_id: input.player.id,
    player_name: formatPlayerName(input.player),
    other_club_id: input.otherClubId,
    other_club_name: loanClubName(input.otherClubId),
    fee: input.fee,
    pending: true,
    effective_season: effective.season,
    effective_week: effective.week,
  };
  const withRecord = appendTransferRecord(input.state, record);
  return {
    state: { ...withRecord, scheduled_transfers: [...(input.state.scheduled_transfers ?? []), entry] },
    entry,
  };
}

export interface ExecuteScheduledTransfersInput {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  finances: ClubFinances;
  transferState: TransferState;
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  boardCashFloor: number;
}

export interface ExecuteScheduledTransfersResult {
  players: Player[];
  rivalPlayers: Player[];
  finances: ClubFinances;
  transferState: TransferState;
  arrivedPlayerIds: string[];
  messages: string[];
}

/** Run every waiting deal (call on a transfer-window week): move players, settle fees, complete history rows. */
export function executeScheduledTransfers(input: ExecuteScheduledTransfersInput): ExecuteScheduledTransfersResult {
  const due = input.transferState.scheduled_transfers ?? [];
  let players = [...input.players];
  let rivalPlayers = [...input.rivalPlayers];
  let finances = input.finances;
  let history = [...input.transferState.history];
  const arrivedPlayerIds: string[] = [];
  const messages: string[] = [];
  if (due.length === 0) {
    return { players, rivalPlayers, finances, transferState: input.transferState, arrivedPlayerIds, messages };
  }

  const completeRecord = (entry: ScheduledTransfer, player: Player | null) => {
    history = history.flatMap((record) => {
      if (record.id !== entry.history_id) return [record];
      if (!player) return [];
      const { pending: _pending, effective_season: _season, effective_week: _week, ...done } = record;
      return [{ ...done, season: input.season, week: input.week, player_name: formatPlayerName(player) }];
    });
  };

  for (const entry of due) {
    if (entry.direction === "in") {
      const source = rivalPlayers.find((player) => player.id === entry.player_id);
      if (!source) {
        completeRecord(entry, null);
        continue;
      }
      const signed = entry.contract ? applyContractOffer(source, input.season, entry.contract) : source;
      const bought = completePurchase(signed, input.clubId, input.season);
      const arrived = processTransferBreakout(bought, {
        masterSeed: input.masterSeed,
        worldEventId: `purchase_${input.season}_${input.week}_${entry.player_id}_${input.clubId}`,
        week: input.week,
        previousMorale: source.state.morale,
        matchFitPoor: false,
      }).player;
      rivalPlayers = rivalPlayers.filter((player) => player.id !== entry.player_id);
      players = [...players, arrived];
      finances = applyTransferFee(finances, entry.fee, input.week);
      arrivedPlayerIds.push(arrived.id);
      completeRecord(entry, arrived);
      messages.push(
        t("transfer.scheduled.arrived", {
          player: formatPlayerName(arrived),
          club: loanClubName(entry.other_club_id),
          fee: formatClubCash(entry.fee),
        }),
      );
      continue;
    }

    const leaving = players.find((player) => player.id === entry.player_id);
    if (!leaving) {
      completeRecord(entry, null);
      continue;
    }
    const sold = completeSale(leaving, entry.other_club_id, input.season);
    players = players.filter((player) => player.id !== entry.player_id);
    rivalPlayers = [...rivalPlayers.filter((player) => player.id !== entry.player_id), sold];
    finances = applyPlayerSaleIncome(finances, entry.fee, input.week, input.boardCashFloor);
    completeRecord(entry, sold);
    messages.push(
      t("transfer.scheduled.departed", {
        player: formatPlayerName(sold),
        club: loanClubName(entry.other_club_id),
        fee: formatClubCash(entry.fee),
      }),
    );
  }

  return {
    players,
    rivalPlayers,
    finances,
    transferState: { ...input.transferState, history, scheduled_transfers: [] },
    arrivedPlayerIds,
    messages,
  };
}
