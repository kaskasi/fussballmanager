import type { PositionPrimary, Player } from "../types/player.ts";
import { estimateCa } from "./market-value.ts";
import { buyerEstimatedValue } from "./ai-transfer-market.ts";
import { squadNeedPositions } from "./ai-transfer-market.ts";

export interface ShortlistCandidate {
  playerId: string;
  position: PositionPrimary;
  estimatedFee: number;
  ca: number;
  academyWatch: boolean;
}

function weekRng(masterSeed: number, season: number, week: number, clubId: string): () => number {
  let state = (masterSeed ^ season ^ week) | 0;
  for (const ch of clubId) {
    state = Math.imul(state ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildAiClubShortlist(input: {
  buyerClubId: string;
  buyerSquad: readonly Player[];
  marketPlayers: readonly Player[];
  season: number;
  week: number;
  masterSeed: number;
  topClub?: boolean;
  buyerReputation?: number;
  limit?: number;
}): ShortlistCandidate[] {
  const needs = squadNeedPositions(input.buyerSquad);
  const needSet = new Set(needs);
  const rng = weekRng(input.masterSeed, input.season, input.week, input.buyerClubId);
  const rows: ShortlistCandidate[] = [];

  for (const player of input.marketPlayers) {
    if (player.club_id === input.buyerClubId) continue;
    if (player.squad_status !== "pro") continue;
    if (needSet.size > 0 && !needSet.has(player.position)) continue;
    const ca = estimateCa(player.attributes, player.position);
    const noise = rng();
    const estimatedFee = buyerEstimatedValue(player, input.season, noise);
    const tenure = player.state.academy_tenure_seasons ?? 0;
    const academyWatch = Boolean(
      input.topClub && player.age <= 21 && tenure >= 2 && ca >= 72,
    );
    rows.push({
      playerId: player.id,
      position: player.position,
      estimatedFee,
      ca,
      academyWatch,
    });
  }

  const bargainHunter = (input.buyerReputation ?? 50) < 42;
  rows.sort((left, right) => {
    if (left.academyWatch !== right.academyWatch) return left.academyWatch ? -1 : 1;
    if (bargainHunter) {
      return left.ca - right.ca || left.estimatedFee - right.estimatedFee;
    }
    return right.ca - left.ca || left.estimatedFee - right.estimatedFee;
  });

  return rows.slice(0, input.limit ?? 12);
}
