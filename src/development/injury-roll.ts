import { injuryRiskScore } from "./fitness-management.ts";
import { noteSevereInjury, signalRehabReturn } from "./breakouts.ts";
import type { Injury, Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { PendingDiagnosis } from "../medical/diagnosis-queue.ts";
import { buildPendingFromRoll } from "../medical/diagnosis-queue.ts";
import { t } from "../i18n/index.ts";

export const INJURY_MIN_SCORE = 40;
export const INJURY_SCORE_CAP = 92;
/** Max weekly injury chance when risk score is at or above cap. */
export const INJURY_MAX_WEEKLY_CHANCE = 0.12;

const INJURY_TYPES: { id: string; label: string }[] = [
  { id: "muscle", label: "Muskelfaserriss" },
  { id: "ankle", label: "Knöchel" },
  { id: "knee", label: "Knie" },
  { id: "groin", label: "Leiste" },
  { id: "back", label: "Rücken" },
];

export function isPlayerMatchEligible(player: Player): boolean {
  return player.state.injury === null;
}

export function injuryWeeklyChance(riskScore: number): number {
  if (riskScore < INJURY_MIN_SCORE) return 0;
  const span = INJURY_SCORE_CAP - INJURY_MIN_SCORE;
  const t = Math.min(1, (riskScore - INJURY_MIN_SCORE) / span);
  return t * t * INJURY_MAX_WEEKLY_CHANCE;
}

export function tickInjuryRecovery(player: Player): Player {
  const injury = player.state.injury;
  if (!injury) return player;
  const weeksRemaining = injury.weeks_remaining - 1;
  if (weeksRemaining <= 0) {
    return { ...player, state: { ...player.state, injury: null } };
  }
  return {
    ...player,
    state: {
      ...player.state,
      injury: { ...injury, weeks_remaining: weeksRemaining },
    },
  };
}

/** PRD 06 — severe injury cleared → rehab_rebirth eligibility signal. */
export function tickInjuryRecoveryWithSignals(player: Player, week: number): Player {
  const injury = player.state.injury;
  if (!injury) return player;
  const wasSevere = injury.severity === "severe";
  const next = tickInjuryRecovery(player);
  if (wasSevere && next.state.injury === null) {
    return signalRehabReturn(next, week);
  }
  return next;
}

export interface WeeklyInjuryRollContext {
  masterSeed: number;
  season: number;
  week: number;
  intensity: number;
  injuryRiskFactor: number;
  managerClubId: string;
  /** When set, injuries go to diagnosis queue instead of immediate player.injury. */
  medicalDiagnosisDays?: number;
  careerDay?: number;
}

export interface InjuryRollNotice {
  playerId: string;
  playerName: string;
  label: string;
  weeks: number;
  severity: Injury["severity"];
}

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicUnit(seedParts: readonly (string | number)[]): number {
  return mulberry32(hashSeed(seedParts))();
}

function pickInjuryType(seedParts: readonly (string | number)[]): { id: string; label: string } {
  const index = Math.floor(deterministicUnit(seedParts) * INJURY_TYPES.length);
  return INJURY_TYPES[Math.min(INJURY_TYPES.length - 1, index)] ?? INJURY_TYPES[0]!;
}

function pickSeverity(riskScore: number, seedParts: readonly (string | number)[]): Injury["severity"] {
  const roll = deterministicUnit(seedParts);
  if (riskScore >= 85 && roll > 0.55) return "severe";
  if (riskScore >= 65 && roll > 0.35) return "moderate";
  if (roll > 0.75) return "moderate";
  return "minor";
}

function weeksForSeverity(severity: Injury["severity"], seedParts: readonly (string | number)[]): number {
  const roll = deterministicUnit(seedParts);
  if (severity === "severe") return 4 + Math.floor(roll * 4);
  if (severity === "moderate") return 2 + Math.floor(roll * 3);
  return 1 + Math.floor(roll * 2);
}

export function createInjuryForPlayer(
  player: Player,
  riskScore: number,
  season: number,
  week: number,
  masterSeed: number,
): Injury {
  const base = [masterSeed, season, week, player.id] as const;
  const type = pickInjuryType([...base, "type"]);
  const severity = pickSeverity(riskScore, [...base, "severity"]);
  const weeks_remaining = weeksForSeverity(severity, [...base, "weeks"]);
  return {
    type_id: type.id,
    weeks_remaining,
    severity,
    sustained_week: week,
  };
}

export function injuryTypeLabel(typeId: string): string {
  const key = `injury.type.${typeId}`;
  const label = t(key);
  return label !== key ? label : (INJURY_TYPES.find((entry) => entry.id === typeId)?.label ?? typeId);
}

export function rollWeeklyInjuries(
  players: readonly Player[],
  context: WeeklyInjuryRollContext,
): { players: Player[]; notices: InjuryRollNotice[]; pendingDiagnoses: PendingDiagnosis[] } {
  const notices: InjuryRollNotice[] = [];
  const pendingDiagnoses: PendingDiagnosis[] = [];
  const useQueue =
    context.medicalDiagnosisDays != null &&
    context.medicalDiagnosisDays > 0 &&
    context.careerDay != null;
  const nextPlayers = players.map((player) => {
    if (player.club_id !== context.managerClubId) return player;
    if (player.squad_status !== "pro") return player;
    if (player.state.injury !== null) return player;
    if (player.state.weekly_minutes <= 0) return player;

    const score = injuryRiskScore(player, context.intensity, context.injuryRiskFactor);
    const chance = injuryWeeklyChance(score);
    if (chance <= 0) return player;

    const roll = deterministicUnit([context.masterSeed, context.season, context.week, player.id, "injury-roll"]);
    if (roll >= chance) return player;

    const injury = createInjuryForPlayer(player, score, context.season, context.week, context.masterSeed);
    const label = injuryTypeLabel(injury.type_id);
    if (useQueue) {
      pendingDiagnoses.push(
        buildPendingFromRoll(
          player,
          score,
          context.season,
          context.week,
          context.masterSeed,
          context.careerDay!,
          context.medicalDiagnosisDays!,
        ),
      );
      notices.push({
        playerId: player.id,
        playerName: formatPlayerName(player),
        label: `${label} — Diagnose`,
        weeks: injury.weeks_remaining,
        severity: injury.severity,
      });
      return player;
    }
    notices.push({
      playerId: player.id,
      playerName: formatPlayerName(player),
      label,
      weeks: injury.weeks_remaining,
      severity: injury.severity,
    });
    const injured =
      injury.severity === "severe" ? noteSevereInjury({ ...player, state: { ...player.state, injury } }) : { ...player, state: { ...player.state, injury } };
    return injured;
  });
  return { players: nextPlayers, notices, pendingDiagnoses };
}

export function tickInjuryRecoveryBatch(players: readonly Player[], week?: number): Player[] {
  if (week === undefined) return players.map(tickInjuryRecovery);
  return players.map((player) => tickInjuryRecoveryWithSignals(player, week));
}
