import { calculateWeeklyGrowth } from "./growth-engine.ts";
import type { TrainingWeekContext } from "./pipeline-week.ts";
import {
  developmentMinutes,
  effectiveDevelopmentScale,
  seededGrowthRandom,
} from "./pipeline-week.ts";
import { trainingIntensityMultiplier } from "./training-load.ts";
import type { Player, PositionPrimary } from "../types/player.ts";

/** F2.3 — extra programs on top of the team plan (PRD 09.2 Screen 1a). */
export type IndividualProgramKind = "weak_foot" | "position_retrain";

export interface IndividualProgram {
  playerId: string;
  kind: IndividualProgramKind;
  weeksRemaining: number;
  targetPosition?: PositionPrimary;
  startedWeek: number;
  season: number;
}

export const MAX_INDIVIDUAL_PROGRAMS = 3;
export const MIN_PROGRAM_WEEKS = 4;
export const MAX_PROGRAM_WEEKS = 12;
export const WEAK_FOOT_PROGRAM_BONUS = 1.35;
export const POSITION_PROFICIENCY_PER_WEEK = 0.04;

export const RETRAIN_POSITIONS: readonly PositionPrimary[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];

export function programLabel(program: IndividualProgram): string {
  if (program.kind === "weak_foot") {
    return `Schwaches Bein · ${program.weeksRemaining} Wo.`;
  }
  return `${program.targetPosition ?? "?"} umbauen · ${program.weeksRemaining} Wo.`;
}

export function programKindLabel(kind: IndividualProgramKind): string {
  return kind === "weak_foot" ? "Schwaches Bein" : "Position umbauen";
}

export function eligibleRetrainPositions(player: Player): PositionPrimary[] {
  return RETRAIN_POSITIONS.filter((position) => position !== player.position);
}

export function canAssignIndividualProgram(
  player: Player,
  kind: IndividualProgramKind,
  programs: readonly IndividualProgram[],
  targetPosition?: PositionPrimary,
): { ok: true } | { ok: false; reason: string } {
  if (player.squad_status === "loaned_out") {
    return { ok: false, reason: "Ausgeliehene Spieler trainieren nicht beim Verein." };
  }
  if (player.state.injury !== null) {
    return { ok: false, reason: "Verletzte Spieler können kein Extra-Programm starten." };
  }
  if (programs.length >= MAX_INDIVIDUAL_PROGRAMS && !programs.some((entry) => entry.playerId === player.id)) {
    return { ok: false, reason: `Maximal ${MAX_INDIVIDUAL_PROGRAMS} Programme gleichzeitig.` };
  }
  if (kind === "weak_foot") {
    if (player.attributes.weak_foot >= 85) {
      return { ok: false, reason: "Schwaches Bein ist schon stark genug (≥ 85)." };
    }
    return { ok: true };
  }
  if (!targetPosition) {
    return { ok: false, reason: "Zielposition wählen." };
  }
  if (targetPosition === player.position) {
    return { ok: false, reason: "Spieler steht schon auf dieser Position." };
  }
  const slot = player.flexibility.find((entry) => entry.trained_as === targetPosition);
  if (slot && slot.proficiency >= 1) {
    return { ok: false, reason: `${targetPosition} ist schon voll ausgebildet.` };
  }
  return { ok: true };
}

export function assignIndividualProgram(
  programs: readonly IndividualProgram[],
  player: Player,
  kind: IndividualProgramKind,
  weeks: number,
  season: number,
  week: number,
  targetPosition?: PositionPrimary,
): IndividualProgram[] {
  const duration = Math.min(MAX_PROGRAM_WEEKS, Math.max(MIN_PROGRAM_WEEKS, Math.round(weeks)));
  const check = canAssignIndividualProgram(player, kind, programs, targetPosition);
  if (!check.ok) throw new Error(check.reason);

  const next: IndividualProgram = {
    playerId: player.id,
    kind,
    weeksRemaining: duration,
    targetPosition: kind === "position_retrain" ? targetPosition : undefined,
    startedWeek: week,
    season,
  };

  const withoutPlayer = programs.filter((entry) => entry.playerId !== player.id);
  return [...withoutPlayer, next];
}

export function cancelIndividualProgram(
  programs: readonly IndividualProgram[],
  playerId: string,
): IndividualProgram[] {
  return programs.filter((entry) => entry.playerId !== playerId);
}

export function programForPlayer(
  programs: readonly IndividualProgram[],
  playerId: string,
): IndividualProgram | undefined {
  return programs.find((entry) => entry.playerId === playerId);
}

export function playerFatigueWarning(player: Player): boolean {
  if (player.state.injury !== null) return true;
  if (player.state.fitness < 60) return true;
  if (player.state.weekly_minutes >= 75) return true;
  return false;
}

function weakFootWeeklyGrowth(
  player: Player,
  context?: TrainingWeekContext,
  random?: () => number,
): number {
  const scale =
    effectiveDevelopmentScale(player, context) *
    trainingIntensityMultiplier(context?.intensity ?? 100) *
    WEAK_FOOT_PROGRAM_BONUS;
  const resolvedRandom =
    random ??
    (context?.masterSeed !== undefined
      ? seededGrowthRandom(
          context.masterSeed,
          context.season,
          context.week,
          player.id,
          "weak_foot",
          "individual",
        )
      : undefined);
  const raw = calculateWeeklyGrowth({
    age: player.age,
    maturityOffset: player.hidden.maturity_offset,
    attribute: "weak_foot",
    value: player.attributes.weak_foot,
    anlage: player.hidden.anlage.weak_foot,
    drive: player.hidden.drive,
    minutes: developmentMinutes(player.squad_status, player.state.weekly_minutes),
    injured: player.state.injury !== null,
    focusSlots: 1,
    noise: resolvedRandom ? undefined : 1,
    random: resolvedRandom,
  });
  return raw * scale;
}

function applyWeakFootProgram(player: Player, context?: TrainingWeekContext, random?: () => number): Player {
  const delta = weakFootWeeklyGrowth(player, context, random);
  const nextValue = Math.min(100, Math.max(0, player.attributes.weak_foot + delta));
  return {
    ...player,
    attributes: {
      ...player.attributes,
      weak_foot: nextValue,
    },
  };
}

function applyPositionRetrain(player: Player, target: PositionPrimary): Player {
  const existing = player.flexibility.find((entry) => entry.trained_as === target);
  if (existing) {
    return {
      ...player,
      flexibility: player.flexibility.map((entry) =>
        entry.trained_as === target
          ? {
              ...entry,
              proficiency: Math.min(1, entry.proficiency + POSITION_PROFICIENCY_PER_WEEK),
              weeks_trained: entry.weeks_trained + 1,
            }
          : entry,
      ),
    };
  }
  return {
    ...player,
    flexibility: [
      ...player.flexibility,
      {
        trained_as: target,
        proficiency: POSITION_PROFICIENCY_PER_WEEK,
        weeks_trained: 1,
      },
    ],
  };
}

/** Apply one week of individual programs, then tick durations. */
export function advanceIndividualTrainingWeek(
  players: readonly Player[],
  programs: readonly IndividualProgram[],
  context?: TrainingWeekContext,
  random?: () => number,
): { players: Player[]; programs: IndividualProgram[] } {
  const byId = new Map(programs.map((program) => [program.playerId, program]));
  const nextPlayers = players.map((player) => {
    const program = byId.get(player.id);
    if (!program || program.weeksRemaining <= 0) return player;
    if (program.kind === "weak_foot") {
      return applyWeakFootProgram(player, context, random);
    }
    if (program.targetPosition) {
      return applyPositionRetrain(player, program.targetPosition);
    }
    return player;
  });

  const nextPrograms = programs
    .map((program) => ({ ...program, weeksRemaining: program.weeksRemaining - 1 }))
    .filter((program) => program.weeksRemaining > 0);

  return { players: nextPlayers, programs: nextPrograms };
}
