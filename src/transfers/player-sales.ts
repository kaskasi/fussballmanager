import type { TeamId } from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
import { canReleasePlayer } from "../player/profile-actions.ts";
import type { Player } from "../types/player.ts";
import { buyerEstimatedValue } from "./ai-transfer-market.ts";
import { counterFee, evaluateOffer, sellerAskingPrice } from "./negotiations.ts";
import { refreshPlayerMarketValue } from "./refresh-market-values.ts";

export interface SaleEligibility {
  allowed: boolean;
  reason?: string;
}

const FALLBACK_BUYER_CLUB_ID = "cl_loan_partner";

function saleRng(masterSeed: number, season: number, week: number, playerId: string): () => number {
  let state = (masterSeed ^ season ^ week) | 0;
  for (const ch of playerId) {
    state = Math.imul(state ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canSellPlayer(
  player: Player,
  squad: readonly Player[],
  clubId: string,
  week: number,
): SaleEligibility {
  if (!isTransferWindowOpen(week)) {
    return { allowed: false, reason: "Verkauf nur in Sommer- oder Winterfenster." };
  }
  if (player.club_id !== clubId) {
    return { allowed: false, reason: "Nur eigene Spieler können verkauft werden." };
  }
  if (player.squad_status === "loaned_out") {
    return { allowed: false, reason: "Ausgeliehene Spieler können nicht verkauft werden." };
  }
  if (player.squad_status === "u17") {
    return { allowed: false, reason: "U17-Spieler werden entlassen oder verliehen, nicht verkauft." };
  }
  const releaseBlock = canReleasePlayer(player, squad, clubId);
  if (releaseBlock) {
    return { allowed: false, reason: releaseBlock };
  }
  return { allowed: true };
}

export function pickAiBuyerClub(
  leagueClubIds: readonly TeamId[],
  playerId: string,
  masterSeed: number,
  season: number,
  week: number,
): string {
  const candidates = leagueClubIds
    .map((teamId) => careerTeamId(teamId))
    .filter((clubId) => clubId !== DEFAULT_CLUB_ID);
  if (candidates.length === 0) return FALLBACK_BUYER_CLUB_ID;
  const rng = saleRng(masterSeed, season, week, playerId);
  return candidates[Math.floor(rng() * candidates.length)] ?? FALLBACK_BUYER_CLUB_ID;
}

/** Rough UI hint — true offer is negotiated on click. */
export function estimateSaleOffer(player: Player, season: number): number {
  return sellerAskingPrice(player, season);
}

export function attemptPlayerSale(
  player: Player,
  season: number,
  week: number,
  masterSeed: number,
): { accepted: boolean; fee: number } {
  const asking = sellerAskingPrice(player, season);
  const rng = saleRng(masterSeed, season, week, player.id);
  const noise = rng();
  const estimate = buyerEstimatedValue(player, season, noise);
  let fee = Math.round(estimate * (0.9 + noise * 0.15));
  const reaction = evaluateOffer(fee, asking);
  if (reaction === "accept") {
    return { accepted: true, fee };
  }
  if (reaction === "reject") {
    const raised = Math.round(Math.max(fee, asking * 1.05));
    if (evaluateOffer(raised, asking) !== "reject") {
      return { accepted: true, fee: raised };
    }
    return { accepted: false, fee: 0 };
  }
  fee = counterFee(asking, fee / asking);
  return { accepted: true, fee };
}

export function completeSale(player: Player, buyerClubId: string, season: number): Player {
  const moved: Player = {
    ...player,
    club_id: buyerClubId,
    squad_status: player.age >= 18 ? "pro" : player.squad_status === "u19" ? "u19" : "u17",
  };
  return refreshPlayerMarketValue(moved, season);
}
