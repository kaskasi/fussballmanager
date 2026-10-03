import { formatPlayerName } from "../types/player-display.ts";
import type { Player } from "../types/player.ts";
import { needsYouthContract } from "../player/youth-contract.ts";
import { contractMonthsRemaining, isPreContractWindow } from "./contract-remaining.ts";
import { canSignPreContract } from "./pre-contracts.ts";
import type { PendingTransfer } from "./negotiations.ts";

export type TransferNextKind = "youth" | "renew" | "pre_contract";

export interface TransferNextAction {
  id: string;
  kind: TransferNextKind;
  playerId: string;
  owned: boolean;
  icon: string;
  title: string;
  hint: string;
}

export const TRANSFER_NEXT_LIMIT = 6;

function monthsHint(months: number): string {
  if (months <= 0) return "läuft aus";
  if (months === 1) return "noch 1 Monat";
  return `noch ${months} Monate`;
}

function ownSquad(players: readonly Player[], clubId: string): Player[] {
  return players.filter(
    (player) => player.club_id === clubId && player.squad_status !== "loaned_out",
  );
}

function isExpiringDeal(player: Player, season: number, week: number): boolean {
  if (!player.contract) return false;
  if (needsYouthContract(player, season)) return false;
  if (player.contract.until_season === season) return true;
  return isPreContractWindow(season, week, player.contract.until_season);
}

function youthAction(player: Player): TransferNextAction {
  return {
    id: `youth:${player.id}`,
    kind: "youth",
    playerId: player.id,
    owned: true,
    icon: "🧒",
    title: formatPlayerName(player),
    hint: "ohne Deal",
  };
}

function renewAction(player: Player, season: number, week: number): TransferNextAction {
  const months = player.contract
    ? contractMonthsRemaining(season, week, player.contract.until_season)
    : 0;
  return {
    id: `renew:${player.id}`,
    kind: "renew",
    playerId: player.id,
    owned: true,
    icon: "📝",
    title: formatPlayerName(player),
    hint: monthsHint(months),
  };
}

function preContractAction(player: Player, season: number, week: number): TransferNextAction {
  const months = player.contract
    ? contractMonthsRemaining(season, week, player.contract.until_season)
    : 0;
  return {
    id: `pre:${player.id}`,
    kind: "pre_contract",
    playerId: player.id,
    owned: false,
    icon: "✍️",
    title: formatPlayerName(player),
    hint: `Vorvertrag · ${monthsHint(months)}`,
  };
}

/** PRD 14.8 — next clicks when the transfer window is shut (and when it is open). */
export function listTransferNextActions(input: {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  scoutTargetIds: readonly string[];
  pending: readonly PendingTransfer[];
}): TransferNextAction[] {
  const squad = ownSquad(input.players, input.clubId);
  const youth = squad.filter((player) => needsYouthContract(player, input.season)).map(youthAction);
  const renew = squad
    .filter((player) => isExpiringDeal(player, input.season, input.week))
    .sort((a, b) => {
      const am = a.contract
        ? contractMonthsRemaining(input.season, input.week, a.contract.until_season)
        : 0;
      const bm = b.contract
        ? contractMonthsRemaining(input.season, input.week, b.contract.until_season)
        : 0;
      return am - bm;
    })
    .map((player) => renewAction(player, input.season, input.week));

  const scoutIds = new Set(input.scoutTargetIds);
  const pre = input.rivalPlayers
    .filter((player) => scoutIds.has(player.id))
    .filter((player) =>
      canSignPreContract(player, input.clubId, input.season, input.week, input.pending).allowed,
    )
    .sort((a, b) => {
      const am = a.contract
        ? contractMonthsRemaining(input.season, input.week, a.contract.until_season)
        : 0;
      const bm = b.contract
        ? contractMonthsRemaining(input.season, input.week, b.contract.until_season)
        : 0;
      return am - bm;
    })
    .map((player) => preContractAction(player, input.season, input.week));

  const urgent = [...youth, ...renew, ...pre];
  if (urgent.length > 0) return urgent.slice(0, TRANSFER_NEXT_LIMIT);

  const fallback = squad
    .filter((player) => player.contract)
    .sort((a, b) => {
      const am = contractMonthsRemaining(input.season, input.week, a.contract!.until_season);
      const bm = contractMonthsRemaining(input.season, input.week, b.contract!.until_season);
      return am - bm;
    })
    .slice(0, 3)
    .map((player) => renewAction(player, input.season, input.week));
  return fallback;
}
