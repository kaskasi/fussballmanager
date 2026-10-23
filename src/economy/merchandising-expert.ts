import type { PlayerName } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import {
  CAMP_LEADER_WORKDAYS_REQUIRED,
  shouldOpenLeaderCandidates,
  workdaysElapsed,
} from "../youth/camp-leader-hire.ts";
import type { CampDayStamp } from "../youth/satellite-camps.ts";
import {
  fanshopMerchLevel,
  merchInboundQtyBySku,
  merchMaxStockForSku,
  normalizeClubMerchandising,
  orderMerchOnDemand,
  type MerchSkuId,
} from "./merchandising.ts";
import { MERCH_SKU_IDS } from "./merchandising-skus.ts";

export const MERCH_EXPERT_AGENCY_NOTICE =
  "Eine Agentur wurde beauftragt, geeignete Kandidaten für das Merchandising zu finden.";

/** Express reorders refill each SKU to this share of Fanshop capacity. */
export const MERCH_EXPERT_TARGET_FILL = 0.25;

/** The expert never spends the club below this cash line. */
export const MERCH_EXPERT_CASH_RESERVE = 100_000;

/** Best possible Express rebate (skill 100). */
export const MERCH_EXPERT_MAX_EXPRESS_REBATE = 0.08;

export type MerchExpertHireState = "none" | "agency_pending" | "hired";

/** `candidates_ready` is derived from the calendar, see {@link merchExpertHirePhase}. */
export type MerchExpertPhase = MerchExpertHireState | "candidates_ready";

export interface MerchExpertRecord {
  first: string;
  last: string;
  portrait_seed: number;
  /** 1–100: tighter reorder timing and a bigger Express rebate. */
  skill: number;
  wage_weekly: number;
}

export interface MerchExpertState {
  hire: MerchExpertHireState;
  agency_commissioned_at?: CampDayStamp;
  expert?: MerchExpertRecord;
}

export interface MerchExpertCandidate {
  id: string;
  name: PlayerName;
  portrait_seed: number;
  skill: number;
  wage_weekly: number;
  intro: readonly string[];
  disqualified: boolean;
  disqualifyReason?: string;
}

export interface MerchExpertRestockLine {
  sku: MerchSkuId;
  qty: number;
  cost: number;
}

export interface MerchExpertRestockResult {
  stadium: ClubStadium;
  cost: number;
  lines: MerchExpertRestockLine[];
}

const EXPERT_FIRST = [
  "Jonas",
  "Martin",
  "Selim",
  "Tobias",
  "Rafael",
  "Anja",
  "Katrin",
  "Mirela",
  "Nora",
  "Ines",
  "Paula",
  "Dilara",
] as const;

const EXPERT_LAST = [
  "Brandt",
  "Keller",
  "Haas",
  "Lindner",
  "Moreno",
  "Yıldız",
  "Vogel",
  "Maurer",
  "Ostrowski",
  "Brunner",
] as const;

export function defaultMerchExpertState(): MerchExpertState {
  return { hire: "none" };
}

function hashKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
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

export function normalizeMerchExpert(state: MerchExpertState | undefined): MerchExpertState {
  if (!state) return defaultMerchExpertState();
  if (state.hire === "hired" && state.expert) {
    return { hire: "hired", expert: state.expert };
  }
  if (state.hire === "agency_pending" && state.agency_commissioned_at) {
    return { hire: "agency_pending", agency_commissioned_at: state.agency_commissioned_at };
  }
  return defaultMerchExpertState();
}

export function merchExpertHirePhase(
  state: MerchExpertState | undefined,
  now: CampDayStamp,
): MerchExpertPhase {
  const expert = normalizeMerchExpert(state);
  if (expert.hire === "agency_pending" && expert.agency_commissioned_at) {
    return shouldOpenLeaderCandidates(expert.agency_commissioned_at, now)
      ? "candidates_ready"
      : "agency_pending";
  }
  return expert.hire;
}

export function merchExpertWorkdaysLeft(commissionedAt: CampDayStamp, now: CampDayStamp): number {
  return Math.max(0, CAMP_LEADER_WORKDAYS_REQUIRED - workdaysElapsed(commissionedAt, now));
}

export function merchExpertCandidateSetId(commissionedAt: CampDayStamp): string {
  return `merch-expert:${commissionedAt.season}:${commissionedAt.week}:${commissionedAt.weekday}`;
}

export function merchExpertWageWeekly(merch: { expert?: MerchExpertState } | undefined): number {
  const state = normalizeMerchExpert(merch?.expert);
  return state.hire === "hired" ? (state.expert?.wage_weekly ?? 0) : 0;
}

/** Express rebate for this expert's skill (0 … {@link MERCH_EXPERT_MAX_EXPRESS_REBATE}). */
export function merchExpertExpressRebate(skill: number): number {
  return (Math.max(0, Math.min(100, skill)) / 100) * MERCH_EXPERT_MAX_EXPRESS_REBATE;
}

/**
 * Reorder line as share of Fanshop capacity: a sharp expert reorders the moment a SKU dips
 * under the 25 % base, a weak one waits until it has sagged noticeably further.
 */
export function merchExpertReorderTrigger(skill: number): number {
  const clamped = Math.max(0, Math.min(100, skill));
  return MERCH_EXPERT_TARGET_FILL * (0.65 + 0.35 * (clamped / 100));
}

export function merchExpertWageForSkill(skill: number): number {
  return Math.round((350 + skill * 9) / 10) * 10;
}

export function merchExpertSkillLabel(skill: number): string {
  if (skill >= 80) return "Spitzenklasse";
  if (skill >= 60) return "Solide";
  if (skill >= 45) return "Durchschnitt";
  return "Anfänger";
}

export function commissionMerchExpertAgency(
  state: MerchExpertState | undefined,
  now: CampDayStamp,
): MerchExpertState {
  const current = normalizeMerchExpert(state);
  if (current.hire !== "none") return current;
  return { hire: "agency_pending", agency_commissioned_at: { ...now } };
}

export function dismissMerchExpert(): MerchExpertState {
  return defaultMerchExpertState();
}

export function hireMerchExpert(
  state: MerchExpertState | undefined,
  candidate: MerchExpertCandidate,
): MerchExpertState {
  const current = normalizeMerchExpert(state);
  if (candidate.disqualified || current.hire !== "agency_pending") return current;
  return {
    hire: "hired",
    expert: {
      first: candidate.name.first ?? "Unbekannt",
      last: candidate.name.last ?? "",
      portrait_seed: candidate.portrait_seed,
      skill: candidate.skill,
      wage_weekly: candidate.wage_weekly,
    },
  };
}

export function merchExpertDisplayName(expert: MerchExpertRecord): string {
  return formatPlayerName({
    name: { first: expert.first, last: expert.last },
    portrait_seed: expert.portrait_seed,
  });
}

type ProfileKind = "solid" | "sharp" | "budget" | "dropout";

function profileForSlot(slot: number, random: () => number): { kind: ProfileKind; skill: number } {
  if (slot === 2) return { kind: "dropout", skill: 30 };
  if (slot === 1) {
    return random() > 0.5
      ? { kind: "sharp", skill: 78 + Math.floor(random() * 13) }
      : { kind: "budget", skill: 36 + Math.floor(random() * 11) };
  }
  return { kind: "solid", skill: 56 + Math.floor(random() * 13) };
}

function introForProfile(name: PlayerName, kind: ProfileKind): readonly string[] {
  const full = formatPlayerName({ name, portrait_seed: 0 });
  switch (kind) {
    case "dropout":
      return [
        `${full} hat zuletzt Lager für einen Sportartikel-Händler betreut.`,
        "In den Unterlagen fehlen Bestandsberichte und saubere Abrechnungen.",
        "Im Gespräch winkt er ab: „Fanartikel nach Zahlen, das ist nichts für mich.“",
      ];
    case "sharp":
      return [
        `${full} hat bei einer Bundesliga-Fanshop-Kette den Einkauf verantwortet.`,
        "Er kennt jede Druckerei und drückt bei Express-Aufträgen den Preis.",
        "Sein Honorar liegt spürbar über dem Durchschnitt.",
      ];
    case "budget":
      return [
        `${full} kommt aus dem Versandhandel und lernt Fußballmerch gerade erst.`,
        "Er arbeitet gewissenhaft, plant aber eher großzügig mit dem Lager.",
        "Dafür ist er günstig zu haben.",
      ];
    default:
      return [
        `${full} leitet seit Jahren das Lager eines Regionalvereins.`,
        "Er kombiniert Verkaufszahlen mit festen Bestellrhythmen.",
        "Zuverlässig und fair im Preis.",
      ];
  }
}

function pickName(random: () => number, used: Set<string>): PlayerName {
  for (let attempt = 0; attempt < 24; attempt++) {
    const first = EXPERT_FIRST[Math.floor(random() * EXPERT_FIRST.length)]!;
    const last = EXPERT_LAST[Math.floor(random() * EXPERT_LAST.length)]!;
    const key = `${first}:${last}`;
    if (used.has(key)) continue;
    used.add(key);
    return { first, last };
  }
  return { first: EXPERT_FIRST[0], last: EXPERT_LAST[0] };
}

/** Three agency candidates: solid, a skill/price trade-off, and one who drops out. */
export function generateMerchExpertCandidates(input: {
  masterSeed: number;
  candidateSetId: string;
}): MerchExpertCandidate[] {
  const seed = hashKey(`${input.masterSeed}:${input.candidateSetId}:merch-expert`);
  const random = mulberry32(seed);
  const used = new Set<string>();
  const out: MerchExpertCandidate[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const name = pickName(random, used);
    const profile = profileForSlot(slot, random);
    const disqualified = profile.kind === "dropout";
    out.push({
      id: `${input.candidateSetId}:${slot}`,
      name,
      portrait_seed: hashKey(`${seed}:${slot}:${name.first}:${name.last}`),
      skill: profile.skill,
      wage_weekly: merchExpertWageForSkill(profile.skill),
      intro: introForProfile(name, profile.kind),
      disqualified,
      ...(disqualified ? { disqualifyReason: "Selbst ausgeschieden" } : {}),
    });
  }
  return out;
}

/**
 * Weekly Express reorder: every SKU whose stock plus inbound units sit under the expert's
 * trigger is refilled to {@link MERCH_EXPERT_TARGET_FILL} of Fanshop capacity.
 * Orders are skipped once they would push cash under {@link MERCH_EXPERT_CASH_RESERVE}.
 */
export function runMerchExpertRestock(
  stadium: ClubStadium,
  input: { cash: number; season: number; week: number; weekday?: number },
): MerchExpertRestockResult {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const state = normalizeMerchExpert(merch.expert);
  const none: MerchExpertRestockResult = { stadium, cost: 0, lines: [] };
  if (state.hire !== "hired" || !state.expert) return none;

  const { skill } = state.expert;
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);
  const priceFactor = 1 - merchExpertExpressRebate(skill);
  const trigger = merchExpertReorderTrigger(skill);
  const weekday = input.weekday ?? 1;

  let nextStadium = stadium;
  let spent = 0;
  const lines: MerchExpertRestockLine[] = [];
  for (const sku of MERCH_SKU_IDS) {
    const current = normalizeClubMerchandising(nextStadium.merchandising);
    const max = merchMaxStockForSku(fanshopLevel, sku);
    const target = Math.round(max * MERCH_EXPERT_TARGET_FILL);
    const pipeline = (current.skus[sku]?.stock ?? 0) + merchInboundQtyBySku(current)[sku]!;
    if (target <= 0 || pipeline >= max * trigger) continue;
    const qty = target - pipeline;
    if (qty <= 0) continue;
    const order = orderMerchOnDemand(
      nextStadium,
      sku,
      qty,
      input.season,
      input.week,
      weekday,
      priceFactor,
    );
    if (!order) continue;
    if (input.cash - spent - order.cost < MERCH_EXPERT_CASH_RESERVE) continue;
    nextStadium = order.stadium;
    spent += order.cost;
    lines.push({ sku, qty, cost: order.cost });
  }
  if (lines.length === 0) return none;
  return { stadium: nextStadium, cost: spent, lines };
}
