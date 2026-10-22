import type { Player } from "../types/player.ts";
import { t } from "../i18n/index.ts";

export interface ContractWeights {
  money: number;
  playing_time: number;
  ambition: number;
  loyalty: number;
  location: number;
}

const WEIGHT_KEYS: (keyof ContractWeights)[] = [
  "money",
  "playing_time",
  "ambition",
  "loyalty",
  "location",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
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

/** Dirichlet sample via normalized Gamma draws (PRD 05.4). */
export function generateContractWeights(seed: string, masterSeed = 0): ContractWeights {
  const rng = mulberry32(hashString(`${masterSeed}:cw:${seed}`));
  const draws = WEIGHT_KEYS.map(() => -Math.log(Math.max(1e-9, rng())));
  const sum = draws.reduce((acc, value) => acc + value, 0);
  return {
    money: draws[0]! / sum,
    playing_time: draws[1]! / sum,
    ambition: draws[2]! / sum,
    loyalty: draws[3]! / sum,
    location: draws[4]! / sum,
  };
}

export function contractWeightsFor(player: Player, masterSeed = 0): ContractWeights {
  if (player.hidden.contract_weights) {
    return player.hidden.contract_weights;
  }
  return generateContractWeights(player.id, masterSeed);
}

type ClubTenureRow = {
  club_id?: string;
  from_season?: number;
  to_season?: number | null;
};

export function loyaltyYearsAtClub(player: Player, clubId: string | null): number {
  if (!clubId) return 0;
  const entry = player.history.clubs.find((row) => {
    const tenure = row as ClubTenureRow;
    return tenure.club_id === clubId && tenure.to_season == null;
  }) as ClubTenureRow | undefined;
  if (!entry?.from_season) return 0;
  return Math.max(0, (entry.to_season ?? 99) - entry.from_season);
}

const HINT_KEY_BY_WEIGHT: Record<keyof ContractWeights, string> = {
  money: "contract.advisor.priority.money",
  playing_time: "contract.advisor.priority.playingTime",
  ambition: "contract.advisor.priority.ambition",
  loyalty: "contract.advisor.priority.loyalty",
  location: "contract.advisor.priority.location",
};

export function advisorHintFromWeights(weights: ContractWeights, fallback: string): string {
  const ranked = WEIGHT_KEYS.map((key) => ({ key, value: weights[key] })).sort(
    (left, right) => right.value - left.value,
  );
  const top = ranked[0]?.key;
  const second = ranked[1]?.key;
  if (!top) return fallback;
  if (second && ranked[0]!.value - ranked[1]!.value < 0.08) {
    return `${t(HINT_KEY_BY_WEIGHT[top])} ${t(HINT_KEY_BY_WEIGHT[second])}`;
  }
  return t(HINT_KEY_BY_WEIGHT[top]);
}

export function loyaltyWageModifier(years: number): number {
  if (years >= 5) return 0.85;
  if (years >= 3) return 0.92;
  if (years >= 1) return 0.97;
  return 1;
}

/** Player CA above club tier → wage uplift (PRD 05.4 reputation_gap). */
export function reputationGapWageModifier(playerCa: number, divisionTier: number): number {
  const gap = playerCa - (divisionTier <= 2 ? 78 : divisionTier <= 3 ? 72 : 66);
  if (gap <= 5) return 1;
  if (gap <= 15) return 1 + Math.min(0.3, gap * 0.015);
  return 1.5;
}
