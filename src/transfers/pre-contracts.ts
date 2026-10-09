import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  sellerAskingPrice,
  completePurchase,
  type PendingTransfer,
  type TransferState,
} from "./negotiations.ts";
import { isPreContractWindow } from "./contract-remaining.ts";
import { contractUntilSeasonAfterTerm } from "./contract-until-season.ts";
import { appendTransferRecord, createPurchaseRecord } from "./transfer-history.ts";
import { loanClubName } from "./loan-roster.ts";

export interface PreContractEligibility {
  allowed: boolean;
  reason?: string;
}

export interface PreContractOffer {
  signingBonus: number;
  savedFee: number;
  wageWeekly: number;
  effectiveSeason: number;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

export function defaultWageWeekly(player: Player): number {
  return Math.max(200, Math.round(player.market_value * 0.008 / 52));
}

export function signingBonusFromSavedFee(savedFee: number, ratio = 0.125): number {
  return Math.round(savedFee * ratio);
}

export function preContractOffer(player: Player, season: number, week: number): PreContractOffer | null {
  if (!player.contract) return null;
  const savedFee = sellerAskingPrice(player, season);
  const ratio = 0.1 + ((hashSeed([player.id, season, week]) % 6) / 100);
  return {
    signingBonus: signingBonusFromSavedFee(savedFee, ratio),
    savedFee,
    wageWeekly: defaultWageWeekly(player),
    effectiveSeason: player.contract.until_season + 1,
  };
}

export function canSignPreContract(
  player: Player,
  buyerClubId: string,
  season: number,
  week: number,
  pending: readonly PendingTransfer[],
): PreContractEligibility {
  if (!player.contract) {
    return { allowed: false, reason: "Spieler hat keinen Vertrag." };
  }
  if (player.club_id === buyerClubId) {
    return { allowed: false, reason: "Eigener Spieler." };
  }
  if (player.squad_status === "loaned_out") {
    return { allowed: false, reason: "Ausgeliehen — kein Vorvertrag möglich." };
  }
  if (pending.some((entry) => entry.player_id === player.id)) {
    return { allowed: false, reason: "Bereits ein Vorvertrag hängt." };
  }
  if (!isPreContractWindow(season, week, player.contract.until_season)) {
    return { allowed: false, reason: "Vorvertrag erst ab 6 Monate vor Vertragsende." };
  }
  return { allowed: true };
}

interface BidPackage {
  clubId: string;
  signingBonus: number;
  wageWeekly: number;
  score: number;
}

function rivalBidPackages(
  player: Player,
  offer: PreContractOffer,
  buyerClubId: string,
  leagueClubIds: readonly string[],
  masterSeed: number,
  season: number,
  week: number,
): BidPackage[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, player.id, "pre-contract"]));
  const rivals = leagueClubIds.filter((clubId) => clubId !== buyerClubId && clubId !== player.club_id);
  const competitorCount = 1 + Math.floor(rng() * 3);
  const shuffled = [...rivals].sort(() => rng() - 0.5).slice(0, competitorCount);
  const packages: BidPackage[] = [
    {
      clubId: buyerClubId,
      signingBonus: offer.signingBonus,
      wageWeekly: offer.wageWeekly,
      score: offer.signingBonus + offer.wageWeekly * 104,
    },
  ];
  for (const clubId of shuffled) {
    const bonusRatio = 0.1 + rng() * 0.05;
    const signingBonus = signingBonusFromSavedFee(offer.savedFee, bonusRatio);
    const wageWeekly = Math.round(offer.wageWeekly * (0.95 + rng() * 0.2));
    packages.push({
      clubId,
      signingBonus,
      wageWeekly,
      score: signingBonus + wageWeekly * 104,
    });
  }
  return packages;
}

export function attemptPreContract(
  state: TransferState,
  player: Player,
  buyerClubId: string,
  season: number,
  week: number,
  masterSeed: number,
  leagueClubIds: readonly string[],
): {
  state: TransferState;
  won: boolean;
  pending?: PendingTransfer;
  winnerClubId?: string;
} {
  const pending = state.pending_transfers ?? [];
  const eligibility = canSignPreContract(player, buyerClubId, season, week, pending);
  if (!eligibility.allowed) {
    return { state, won: false };
  }
  const offer = preContractOffer(player, season, week);
  if (!offer) return { state, won: false };

  const packages = rivalBidPackages(
    player,
    offer,
    buyerClubId,
    leagueClubIds,
    masterSeed,
    season,
    week,
  );
  const winner = packages.reduce((best, entry) => (entry.score > best.score ? entry : best));

  if (winner.clubId !== buyerClubId) {
    return { state, won: false, winnerClubId: winner.clubId };
  }

  const entry: PendingTransfer = {
    id: `pre_${player.id}_${season}_${week}`,
    player_id: player.id,
    buyer_club_id: buyerClubId,
    signing_bonus: offer.signingBonus,
    wage_weekly: offer.wageWeekly,
    contract_until_season: player.contract!.until_season,
    signed_season: season,
    signed_week: week,
    effective_season: offer.effectiveSeason,
    saved_transfer_fee: offer.savedFee,
  };

  return {
    state: {
      ...state,
      pending_transfers: [...pending, entry],
    },
    won: true,
    pending: entry,
  };
}

export function pendingForPlayer(
  pending: readonly PendingTransfer[],
  playerId: string,
): PendingTransfer | undefined {
  return pending.find((entry) => entry.player_id === playerId);
}

export interface PreContractActivationResult {
  players: Player[];
  rivalPlayers: Player[];
  transferState: TransferState;
  messages: string[];
}

/** Activate pre-contracts whose old deal ends with `endingSeason`. */
export function activatePendingPreContracts(
  players: readonly Player[],
  rivalPlayers: readonly Player[],
  transferState: TransferState,
  endingSeason: number,
  week: number,
  managerClubId: string,
): PreContractActivationResult {
  const pending = transferState.pending_transfers ?? [];
  const due = pending.filter((entry) => entry.contract_until_season === endingSeason);
  if (due.length === 0) {
    return { players: [...players], rivalPlayers: [...rivalPlayers], transferState, messages: [] };
  }

  let nextPlayers = [...players];
  let nextRivals = [...rivalPlayers];
  let nextState = transferState;
  const messages: string[] = [];
  const remaining = pending.filter((entry) => entry.contract_until_season !== endingSeason);

  for (const entry of due) {
    const fromUser = nextPlayers.find((player) => player.id === entry.player_id);
    const fromRival = nextRivals.find((player) => player.id === entry.player_id);
    const source = fromUser ?? fromRival;
    if (!source) continue;

    const joined = completePurchase(
      {
        ...source,
        contract: {
          ...(source.contract ?? {
            bonus_goal: 0,
            bonus_appearance: 0,
            guaranteed_minutes_promise: "none",
          }),
          wage_weekly: entry.wage_weekly,
          until_season: contractUntilSeasonAfterTerm(entry.effective_season, 3),
        },
      },
      entry.buyer_club_id,
      entry.effective_season,
    );

    nextPlayers = nextPlayers.filter((player) => player.id !== entry.player_id);
    nextRivals = nextRivals.filter((player) => player.id !== entry.player_id);

    if (entry.buyer_club_id === managerClubId) {
      nextPlayers.push(joined);
    } else {
      nextRivals.push(joined);
    }

    const record = createPurchaseRecord(
      joined,
      0,
      entry.effective_season,
      week,
      source.club_id ?? "cl_rival_pool",
      entry.buyer_club_id,
    );
    nextState = appendTransferRecord(nextState, {
      ...record,
      other_club_name: `${loanClubName(source.club_id ?? "cl_rival_pool")} → ${loanClubName(entry.buyer_club_id)} (Vorvertrag)`,
      fee: 0,
    });
    messages.push(
      `${formatPlayerName(joined)} wechselt ablösefrei zu ${loanClubName(entry.buyer_club_id)}.`,
    );
  }

  return {
    players: nextPlayers,
    rivalPlayers: nextRivals,
    transferState: { ...nextState, pending_transfers: remaining },
    messages,
  };
}
