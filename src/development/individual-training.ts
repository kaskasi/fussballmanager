import { calculateWeeklyGrowth } from "./growth-engine.ts";
import type { TrainingWeekContext } from "./pipeline-week.ts";
import {
  developmentMinutes,
  effectiveDevelopmentScale,
  seededGrowthRandom,
} from "./pipeline-week.ts";
import { trainingIntensityMultiplier } from "./training-load.ts";
import type { Player, PositionPrimary } from "../types/player.ts";
import {
  awardStamp,
  canEarnStamp,
  eligibleTrainStamps,
  stampDefinition,
  stampLabel,
  type StampAwardNotice,
} from "./ability-stamps.ts";

/** F2.3 + F2.8 — extra programs on top of the team plan (PRD 09.2 Screen 1a). */
export type IndividualProgramKind = "weak_foot" | "position_retrain" | "stamp";

export interface IndividualProgram {
  playerId: string;
  kind: IndividualProgramKind;
  weeksRemaining: number;
  targetPosition?: PositionPrimary;
  /** F2.8 catalog id when kind === "stamp". */
  stampId?: string;
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
  if (program.kind === "stamp") {
    return `${stampLabel(program.stampId ?? "?")} · ${program.weeksRemaining} Wo.`;
  }
  return `${program.targetPosition ?? "?"} umbauen · ${program.weeksRemaining} Wo.`;
}

export function programKindLabel(kind: IndividualProgramKind): string {
  if (kind === "weak_foot") return "Schwaches Bein";
  if (kind === "stamp") return "Fähigkeit / Stempel";
  return "Position umbauen";
}

export function eligibleRetrainPositions(player: Player): PositionPrimary[] {
  return RETRAIN_POSITIONS.filter((position) => position !== player.position);
}

export function canAssignIndividualProgram(
  player: Player,
  kind: IndividualProgramKind,
  programs: readonly IndividualProgram[],
  targetPosition?: PositionPrimary,
  stampId?: string,
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
  if (kind === "stamp") {
    if (!stampId) return { ok: false, reason: "Stempel wählen." };
    const earn = canEarnStamp(player, stampId);
    if (!earn.ok) return earn;
    if (earn.definition.path !== "train") {
      return { ok: false, reason: "Dieser Stempel wird nicht trainiert — er kommt durch Leistung." };
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
  stampId?: string,
): IndividualProgram[] {
  const check = canAssignIndividualProgram(player, kind, programs, targetPosition, stampId);
  if (!check.ok) throw new Error(check.reason);

  let duration = Math.min(MAX_PROGRAM_WEEKS, Math.max(MIN_PROGRAM_WEEKS, Math.round(weeks)));
  if (kind === "stamp" && stampId) {
    const def = stampDefinition(stampId);
    duration = def?.weeks ?? duration;
  }

  const next: IndividualProgram = {
    playerId: player.id,
    kind,
    weeksRemaining: duration,
    targetPosition: kind === "position_retrain" ? targetPosition : undefined,
    stampId: kind === "stamp" ? stampId : undefined,
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

/** Apply one week of individual programs, then tick durations. Stamp awards on completion. */
export function advanceIndividualTrainingWeek(
  players: readonly Player[],
  programs: readonly IndividualProgram[],
  context?: TrainingWeekContext,
  random?: () => number,
): { players: Player[]; programs: IndividualProgram[]; awards: StampAwardNotice[] } {
  const byId = new Map(programs.map((program) => [program.playerId, program]));
  const awards: StampAwardNotice[] = [];
  const season = context?.season ?? 1;
  const week = context?.week ?? 1;

  const nextPlayers = players.map((player) => {
    const program = byId.get(player.id);
    if (!program || program.weeksRemaining <= 0) return player;

    if (program.kind === "weak_foot") {
      return applyWeakFootProgram(player, context, random);
    }
    if (program.kind === "position_retrain" && program.targetPosition) {
      return applyPositionRetrain(player, program.targetPosition);
    }
    if (program.kind === "stamp" && program.stampId) {
      // Spend weeks training toward the stamp; award on the final week.
      if (program.weeksRemaining === 1) {
        const before = player;
        const awarded = awardStamp(player, program.stampId, season, week);
        if (awarded.stamps.length > (before.stamps?.length ?? 0)) {
          const def = stampDefinition(program.stampId);
          awards.push({
            playerId: player.id,
            stampId: program.stampId,
            label: def?.label ?? program.stampId,
            icon: def?.icon ?? "◆",
          });
        }
        return awarded;
      }
      return player;
    }
    return player;
  });

  const nextPrograms = programs
    .map((program) => ({ ...program, weeksRemaining: program.weeksRemaining - 1 }))
    .filter((program) => program.weeksRemaining > 0);

  return { players: nextPlayers, programs: nextPrograms, awards };
}

export { eligibleTrainStamps };
