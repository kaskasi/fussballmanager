/** F5.6 — AI bids on the user's squad (weekly, transfer window). */
import type { Player } from "../types/player.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
import type { TransferState } from "./negotiations.ts";
import { estimateCa } from "./market-value.ts";
import { sellerAskingPrice } from "./negotiations.ts";
import { pickAiBuyerClub } from "./player-sales.ts";
import type { TeamId } from "@fussballmanager/shared";
import { careerTeamId } from "../sim/rival-growth.ts";

export interface InboundTransferOffer {
  id: string;
  player_id: string;
  buyer_club_id: string;
  fee: number;
  season: number;
  week: number;
  status: "pending" | "declined" | "accepted";
}

export interface ScanInboundOffersInput {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  leagueClubIds: readonly TeamId[];
  transferState: TransferState;
}

export interface ScanInboundOffersResult {
  transferState: TransferState;
  newOffers: InboundTransferOffer[];
}

function weekRng(masterSeed: number, season: number, week: number, salt: number): () => number {
  let state = (masterSeed ^ season ^ week ^ salt) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scanInboundOffers(input: ScanInboundOffersInput): ScanInboundOffersResult {
  if (!isTransferWindowOpen(input.week)) {
    return { transferState: input.transferState, newOffers: [] };
  }

  const existing = input.transferState.inbound_offers ?? [];
  const pendingThisWeek = existing.filter(
    (row) => row.season === input.season && row.week === input.week && row.status === "pending",
  );
  if (pendingThisWeek.length >= 1) {
    return { transferState: input.transferState, newOffers: [] };
  }

  const rng = weekRng(input.masterSeed, input.season, input.week, 0x1b0);
  const candidates = input.players.filter((player) => {
    if (player.club_id !== input.clubId) return false;
    if (player.squad_status !== "pro") return false;
    if (player.state.desire_to_leave) return true;
    const ca = estimateCa(player.attributes, player.position);
    if (ca >= 88 && rng() < 0.12) return true;
    if (player.contract && player.contract.until_season <= input.season && rng() < 0.2) {
      return true;
    }
    return false;
  });

  if (candidates.length === 0 || rng() > 0.55) {
    return { transferState: input.transferState, newOffers: [] };
  }

  const player = candidates[Math.floor(rng() * candidates.length)]!;
  const buyerClubId = pickAiBuyerClub(
    input.leagueClubIds,
    player.id,
    input.masterSeed,
    input.season,
    input.week,
  );
  const asking = sellerAskingPrice(player, input.season);
  const fee = Math.round(asking * (0.88 + rng() * 0.22));

  const offer: InboundTransferOffer = {
    id: `in_${input.season}_${input.week}_${player.id}`,
    player_id: player.id,
    buyer_club_id: buyerClubId,
    fee,
    season: input.season,
    week: input.week,
    status: "pending",
  };

  return {
    transferState: {
      ...input.transferState,
      inbound_offers: [...existing, offer],
    },
    newOffers: [offer],
  };
}

export function listPendingInboundOffers(
  transferState: TransferState,
  clubId: string,
  players: readonly Player[],
): InboundTransferOffer[] {
  void clubId;
  const ids = new Set(players.map((player) => player.id));
  return (transferState.inbound_offers ?? []).filter(
    (row) => row.status === "pending" && ids.has(row.player_id),
  );
}
