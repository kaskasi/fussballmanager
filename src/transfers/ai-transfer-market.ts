/**
 * F5.6 / PRD 05.5 — KI-Transfermarkt (weekly compressor, same MV formulas as the player).
 */
import type { TeamId } from "@fussballmanager/shared";
import type { DivisionEconomyId } from "../economy/division-economy.ts";
import { DIVISION_ECONOMY } from "../economy/division-economy.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { processTransferBreakout } from "../development/breakouts.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { isTransferWindowOpen, transferWindowKind } from "../sim/transfer-windows.ts";
import type { PositionPrimary, Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  completePurchase,
  counterFee,
  evaluateOffer,
  sellerAskingPrice,
  type TransferState,
} from "./negotiations.ts";
import {
  appendTransferRecord,
  createAiTransferRecord,
  type TransferRecord,
} from "./transfer-history.ts";
import { STARTING_TRANSFER_BUDGET } from "../economy/club-finances.ts";
import { estimateCa, marketValue } from "./market-value.ts";
import { refreshPlayerMarketValue } from "./refresh-market-values.ts";
import { loanClubName } from "./loan-roster.ts";

export interface AiClubBudget {
  transfer_budget: number;
  spent: number;
  earned: number;
}

const POSITION_SLOTS: Record<PositionPrimary, number> = {
  GK: 2,
  CB: 3,
  LB: 1,
  RB: 1,
  DM: 2,
  CM: 3,
  AM: 2,
  // Wide roles are interchangeable in the generated three-player wing group.
  LM: 0,
  RM: 0,
  LW: 0,
  RW: 0,
  CF: 2,
};

export function defaultAiClubBudget(divisionId: DivisionEconomyId): number {
  const tier = DIVISION_ECONOMY[divisionId].tier;
  return tier <= 3 ? STARTING_TRANSFER_BUDGET : Math.round(STARTING_TRANSFER_BUDGET * 0.6);
}

export function normalizeAiBudgets(
  clubIds: readonly string[],
  divisionId: DivisionEconomyId,
  existing?: Record<string, AiClubBudget>,
): Record<string, AiClubBudget> {
  const budgets: Record<string, AiClubBudget> = {};
  for (const clubId of clubIds) {
    if (clubId === DEFAULT_CLUB_ID) continue;
    const saved = existing?.[clubId];
    budgets[clubId] = saved ?? {
      transfer_budget: defaultAiClubBudget(divisionId),
      spent: 0,
      earned: 0,
    };
  }
  return budgets;
}

export function resetAiBudgetsForSeason(
  clubIds: readonly string[],
  divisionId: DivisionEconomyId,
): Record<string, AiClubBudget> {
  return normalizeAiBudgets(clubIds, divisionId);
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

function squadByClub(players: readonly Player[]): Map<string, Player[]> {
  const map = new Map<string, Player[]>();
  for (const player of players) {
    if (!player.club_id || player.squad_status !== "pro") continue;
    const list = map.get(player.club_id) ?? [];
    list.push(player);
    map.set(player.club_id, list);
  }
  return map;
}

export function squadNeedPositions(squad: readonly Player[]): PositionPrimary[] {
  const counts = new Map<PositionPrimary, number>();
  for (const player of squad) {
    counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  }
  const needs: { position: PositionPrimary; gap: number; bestCa: number }[] = [];
  for (const [position, target] of Object.entries(POSITION_SLOTS) as [PositionPrimary, number][]) {
    const have = counts.get(position) ?? 0;
    if (have >= target) continue;
    const bestCa = squad
      .filter((player) => player.position === position)
      .reduce((max, player) => Math.max(max, estimateCa(player.attributes, player.position)), 0);
    needs.push({ position, gap: target - have, bestCa });
  }
  needs.sort((left, right) => right.gap - left.gap || left.bestCa - right.bestCa);
  return needs.map((entry) => entry.position);
}

export function buyerEstimatedValue(player: Player, season: number, noise: number): number {
  const ca = estimateCa(player.attributes, player.position);
  const estimateError = 1 + (noise - 0.5) * 0.24;
  const estimatedCa = Math.max(40, ca * estimateError);
  const wage = player.contract?.wage_weekly ?? 0;
  const seasonsLeft = player.contract ? Math.max(0, player.contract.until_season - season) : 0;
  return marketValue({
    ca: estimatedCa,
    age: player.age,
    monthsRemaining: seasonsLeft * 12,
    wage,
    marketWage: Math.max(1, wage),
    demandFactor: 1,
    reputationFactor: 1,
    estimatedGrowthRateNormalized: player.age < 20 ? Math.min(1, player.state.recent_growth_26w / 40) : 0,
  });
}

export function contractSeasonsLeft(player: Player, season: number): number {
  return player.contract ? Math.max(0, player.contract.until_season - season) : 0;
}

export function academyOverflowPlayers(squad: readonly Player[]): Player[] {
  const youngByPosition = new Map<string, Player[]>();
  for (const player of squad) {
    if (player.age > 21) continue;
    const list = youngByPosition.get(player.position) ?? [];
    list.push(player);
    youngByPosition.set(player.position, list);
  }
  const overflow: Player[] = [];
  for (const group of youngByPosition.values()) {
    if (group.length < 3) continue;
    const sorted = [...group].sort(
      (left, right) =>
        estimateCa(left.attributes, left.position) -
        estimateCa(right.attributes, right.position),
    );
    overflow.push(...sorted.slice(0, group.length - 2));
  }
  return overflow;
}

export function sellPressurePlayers(
  squad: readonly Player[],
  season: number,
): Player[] {
  const pressure: Player[] = [];
  for (const player of squad) {
    const seasonsLeft = contractSeasonsLeft(player, season);
    if (seasonsLeft <= 1) pressure.push(player);
    else if (player.age >= 32 && estimateCa(player.attributes, player.position) < 88) {
      pressure.push(player);
    }
  }
  return pressure;
}

function sellerWillSell(
  player: Player,
  season: number,
  offer: number,
  asking: number,
  forced = false,
): boolean {
  if (forced && offer >= asking * 0.75) return true;
  const reaction = evaluateOffer(offer, asking);
  if (reaction === "accept" || reaction === "counter") return true;
  const seasonsLeft = contractSeasonsLeft(player, season);
  if (seasonsLeft <= 1 && offer >= asking * 0.82) return true;
  const ca = estimateCa(player.attributes, player.position);
  return player.age >= 31 && offer >= asking * 0.88 && ca < 95;
}

function negotiateFee(asking: number, maxFee: number, rng: () => number): number {
  const opener = Math.round(asking * (0.88 + rng() * 0.17));
  if (opener > maxFee) return 0;
  const reaction = evaluateOffer(opener, asking);
  if (reaction === "accept") return opener;
  if (reaction === "reject") {
    const raised = Math.round(asking * 1.08);
    if (raised <= maxFee && evaluateOffer(raised, asking) !== "reject") return raised;
    return 0;
  }
  const agreed = counterFee(asking, opener / asking);
  return agreed <= maxFee ? agreed : 0;
}

export interface AiTransferWeekInput {
  rivalPlayers: readonly Player[];
  transferState: TransferState;
  leagueClubIds: readonly TeamId[];
  divisionId: DivisionEconomyId;
  season: number;
  week: number;
  masterSeed: number;
}

export interface AiTransferWeekResult {
  rivalPlayers: Player[];
  transferState: TransferState;
  records: TransferRecord[];
  messages: string[];
}

export function advanceAiTransferWeek(input: AiTransferWeekInput): AiTransferWeekResult {
  if (!isTransferWindowOpen(input.week)) {
    return {
      rivalPlayers: [...input.rivalPlayers],
      transferState: input.transferState,
      records: [],
      messages: [],
    };
  }

  const careerClubIds = input.leagueClubIds
    .map((teamId) => careerTeamId(teamId))
    .filter((clubId) => clubId !== DEFAULT_CLUB_ID);

  let budgets = normalizeAiBudgets(
    careerClubIds,
    input.divisionId,
    input.transferState.ai_budgets,
  );
  let players = [...input.rivalPlayers];
  let transferState = input.transferState;
  const records: TransferRecord[] = [];
  const messages: string[] = [];

  const maxDeals = transferWindowKind(input.week) === "summer" ? 3 : 2;
  const rng = weekRng(input.masterSeed, input.season, input.week, 0x5f6);

  for (let attempt = 0; attempt < maxDeals; attempt++) {
    const squads = squadByClub(players);
    const buyerClubId = pickBuyerClub(careerClubIds, squads, budgets, rng);
    if (!buyerClubId) break;

    const buyerSquad = squads.get(buyerClubId) ?? [];
    const needs = squadNeedPositions(buyerSquad);
    const targetPosition = needs[0] ?? pickSurplusPosition(buyerSquad, rng);
    if (!targetPosition) continue;

    const buyerBudget = budgets[buyerClubId];
    if (!buyerBudget) continue;
    const headroom = buyerBudget.transfer_budget - buyerBudget.spent;
    if (headroom < 80_000) continue;

    const sellerClubId = pickSellerClub(careerClubIds, buyerClubId, squads, input.season, rng);
    if (!sellerClubId) continue;

    const sellerSquad = squads.get(sellerClubId) ?? [];
    const overflowIds = new Set(
      [...academyOverflowPlayers(sellerSquad), ...sellPressurePlayers(sellerSquad, input.season)].map(
        (player) => player.id,
      ),
    );
    const candidates = sellerSquad
      .filter((player) => player.position === targetPosition || needs.length === 0)
      .map((player) => ({
        player,
        asking: sellerAskingPrice(player, input.season),
        forced: overflowIds.has(player.id),
      }))
      .filter((entry) => entry.asking <= headroom * 1.15)
      .sort((left, right) => {
        if (left.forced !== right.forced) return left.forced ? -1 : 1;
        return left.asking - right.asking;
      });

    let deal: { player: Player; fee: number } | null = null;
    for (const candidate of candidates.slice(0, 10)) {
      const fee = negotiateFee(candidate.asking, headroom, rng);
      if (fee <= 0) continue;
      if (!sellerWillSell(candidate.player, input.season, fee, candidate.asking, candidate.forced)) {
        continue;
      }
      deal = { player: candidate.player, fee };
      break;
    }
    if (!deal) continue;

    const bought = completePurchase(deal.player, buyerClubId, input.season);
    const shifted = processTransferBreakout(bought, {
      masterSeed: input.masterSeed,
      worldEventId: `ai_transfer_${input.season}_${input.week}_${deal.player.id}_${buyerClubId}`,
      week: input.week,
      previousMorale: deal.player.state.morale,
      matchFitPoor: false,
    });
    const valued = refreshPlayerMarketValue(shifted.player, input.season);
    players = players.map((player) => (player.id === deal.player.id ? valued : player));

    budgets = {
      ...budgets,
      [buyerClubId]: {
        ...budgets[buyerClubId]!,
        spent: budgets[buyerClubId]!.spent + deal.fee,
      },
      [sellerClubId]: {
        ...budgets[sellerClubId] ?? {
          transfer_budget: defaultAiClubBudget(input.divisionId),
          spent: 0,
          earned: 0,
        },
        earned: (budgets[sellerClubId]?.earned ?? 0) + deal.fee,
      },
    };

    const record = createAiTransferRecord(
      valued,
      deal.fee,
      input.season,
      input.week,
      sellerClubId,
      buyerClubId,
    );
    transferState = appendTransferRecord(transferState, record);
    records.push(record);

    const message = `Liga: ${formatPlayerName(valued)} · ${loanClubName(sellerClubId)} → ${loanClubName(buyerClubId)} (${formatFeeShort(deal.fee)})`;
    messages.push(message);
  }

  return {
    rivalPlayers: players,
    transferState: {
      ...transferState,
      ai_budgets: budgets,
    },
    records,
    messages,
  };
}

function pickBuyerClub(
  clubIds: readonly string[],
  squads: Map<string, Player[]>,
  budgets: Record<string, AiClubBudget>,
  rng: () => number,
): string | null {
  const eligible = clubIds.filter((clubId) => {
    const budget = budgets[clubId];
    if (!budget) return false;
    return budget.transfer_budget - budget.spent >= 120_000;
  });
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rng() * eligible.length)] ?? null;
}

function pickSellerClub(
  clubIds: readonly string[],
  buyerClubId: string,
  squads: Map<string, Player[]>,
  season: number,
  rng: () => number,
): string | null {
  const eligible = clubIds.filter((clubId) => {
    if (clubId === buyerClubId) return false;
    const squad = squads.get(clubId) ?? [];
    if (squad.length < 12) return false;
    const pressure = sellPressurePlayers(squad, season);
    const overflow = academyOverflowPlayers(squad);
    return pressure.length > 0 || overflow.length > 0 || squad.length >= 16;
  });
  if (eligible.length === 0) return null;
  const weighted = eligible.flatMap((clubId) => {
    const squad = squads.get(clubId) ?? [];
    const weight =
      1 +
      sellPressurePlayers(squad, season).length +
      academyOverflowPlayers(squad).length;
    return Array.from({ length: weight }, () => clubId);
  });
  return weighted[Math.floor(rng() * weighted.length)] ?? null;
}

function pickSurplusPosition(squad: readonly Player[], rng: () => number): PositionPrimary | null {
  if (squad.length === 0) return "CM";
  const player = squad[Math.floor(rng() * squad.length)];
  return player?.position ?? "CM";
}

function formatFeeShort(fee: number): string {
  if (fee >= 1_000_000) return `${(fee / 1_000_000).toFixed(1)}M`;
  if (fee >= 1_000) return `${Math.round(fee / 1_000)}k`;
  return String(fee);
}
