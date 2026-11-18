/**
 * PRD 36 §2–3 — the two domestic cups: who enters, which rounds, which weeks.
 * Weeks come from the season schedule (pre-season slot n, cup slot n), so a
 * template change moves the rounds with it.
 */
import { seasonSchedule, type SeasonSlotKind } from "../sim/season-schedule.ts";

export type CupId = "regional" | "national";

export type CupRoundKey = "prelim" | "r64" | "r32" | "r16" | "qf" | "sf" | "final";

interface RoundSpec {
  key: CupRoundKey;
  /** n-th slot of this kind in the season (1-based). */
  slot: { kind: Extract<SeasonSlotKind, "preseason" | "cup">; index: number };
}

export interface CupDefinition {
  id: CupId;
  /** Salt for the cup's draw and tie seeds. */
  salt: number;
  rounds: readonly RoundSpec[];
}

export const CUPS: readonly CupDefinition[] = [
  {
    id: "regional",
    salt: 0x4e6f7264,
    rounds: [
      { key: "prelim", slot: { kind: "preseason", index: 2 } },
      { key: "r32", slot: { kind: "preseason", index: 3 } },
      { key: "r16", slot: { kind: "cup", index: 3 } },
      { key: "qf", slot: { kind: "cup", index: 5 } },
      { key: "sf", slot: { kind: "cup", index: 7 } },
      { key: "final", slot: { kind: "cup", index: 8 } },
    ],
  },
  {
    id: "national",
    salt: 0x4d656973,
    rounds: [
      { key: "r64", slot: { kind: "preseason", index: 4 } },
      { key: "r32", slot: { kind: "cup", index: 1 } },
      { key: "r16", slot: { kind: "cup", index: 2 } },
      { key: "qf", slot: { kind: "cup", index: 4 } },
      { key: "sf", slot: { kind: "cup", index: 6 } },
      { key: "final", slot: { kind: "cup", index: 9 } },
    ],
  },
];

/** Regional cup: clubs of these tiers enter; the weakest Oberliga clubs play a preliminary round. */
export const REGIONAL_CUP_TIERS = [4, 5] as const;
export const REGIONAL_PRELIM_CLUBS = 8;
/** Tier whose lowest-reputation clubs play the preliminary round (Oberliga Nord). */
export const REGIONAL_PRELIM_TIER = 5;
/** National cup: tiers 1–3 enter, plus the regional finalists, filled from tier 4. */
export const NATIONAL_CUP_TIERS = [1, 2, 3] as const;
export const NATIONAL_CUP_SIZE = 64;
export const NATIONAL_FILL_TIER = 4;

export function cupDefinition(id: CupId): CupDefinition {
  const definition = CUPS.find((cup) => cup.id === id);
  if (!definition) throw new Error(`Unknown cup ${id}`);
  return definition;
}

/** Season week of a cup round (template slots are the same every season). */
export function cupRoundWeek(id: CupId, round: number): number {
  const spec = cupDefinition(id).rounds[round - 1];
  if (!spec) throw new Error(`Cup ${id} has no round ${round}`);
  // Season 2 has every slot; season 1 only drops weeks before the career start.
  const slots = seasonSchedule(2).slots.filter((slot) => slot.kind === spec.slot.kind);
  const slot = slots[spec.slot.index - 1];
  if (!slot) throw new Error(`No ${spec.slot.kind} slot ${spec.slot.index} for cup ${id}`);
  return slot.week;
}

export function cupRoundKey(id: CupId, round: number): CupRoundKey {
  const spec = cupDefinition(id).rounds[round - 1];
  if (!spec) throw new Error(`Cup ${id} has no round ${round}`);
  return spec.key;
}

export function cupRoundCount(id: CupId): number {
  return cupDefinition(id).rounds.length;
}

/**
 * PRD 36 slice 2 — prize money (€) for winning a round, i.e. reaching the
 * next one; the final pays the winner. Scaled to the tier economies (PRD 11):
 * a Nordpokal run is worth a few weeks of Oberliga TV money, a Meisterpokal
 * run for a lower-tier club is a season-changing windfall.
 */
const CUP_PRIZE_FOR_WIN: Record<CupId, Partial<Record<CupRoundKey, number>>> = {
  regional: { prelim: 5_000, r32: 10_000, r16: 20_000, qf: 35_000, sf: 60_000, final: 120_000 },
  national: { r64: 120_000, r32: 220_000, r16: 400_000, qf: 750_000, sf: 1_400_000, final: 2_500_000 },
};

export function cupPrizeForWin(id: CupId, key: CupRoundKey): number {
  return CUP_PRIZE_FOR_WIN[id][key] ?? 0;
}
