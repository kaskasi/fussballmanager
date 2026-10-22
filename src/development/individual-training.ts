import { calculateWeeklyGrowth } from "./growth-engine.ts";
import type { TrainingWeekContext } from "./pipeline-week.ts";
import {
  developmentMinutes,
  effectiveDevelopmentScale,
  seededGrowthRandom,
} from "./pipeline-week.ts";
import {
  normalizeTrainingIntensity,
  trainingIntensityMultiplier,
} from "./training-load.ts";
import { clampFitness } from "./fitness-management.ts";
import type { Attributes, Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  RETRAIN_MAX_FAILURES,
  retrainDeterministicUnit,
  retrainPartialProficiencyGain,
  retrainSuccessProbability,
  rollRetrainSuccess,
} from "./position-retrain-roll.ts";
import {
  awardStamp,
  canEarnStamp,
  eligibleTrainStamps,
  stampDefinition,
  stampLabel,
  type StampAwardNotice,
} from "./ability-stamps.ts";
import type { StampDefinition } from "./ability-stamps-catalog.ts";
import { t } from "../i18n/index.ts";
import { INDIVIDUAL_SLOTS_BASE, isIndividualSlotFree } from "./individual-training-capacity.ts";

/** F2.3 + F2.8 — extra programs on top of the team plan (PRD 09.2 Screen 1a). */
export type IndividualProgramKind =
  | "attribute_focus"
  | "weak_foot"
  | "position_retrain"
  | "stamp";

export interface IndividualProgram {
  playerId: string;
  kind: IndividualProgramKind;
  weeksRemaining: number;
  /** Initial duration chosen at assign (F2.3 retrain roll). */
  plannedWeeks?: number;
  targetPosition?: PositionPrimary;
  /** Weekly growth target when kind === "attribute_focus". */
  targetAttribute?: keyof Attributes;
  /** F2.8 catalog id when kind === "stamp". */
  stampId?: string;
  startedWeek: number;
  season: number;
  /** Attribute points gained by this program so far (target attribute, or the stamp's attributes). */
  gained?: number;
}

export type IndividualProgramOutcome = "gain" | "no_gain" | "retrained" | "failed" | "stamp";

/** A finished program, kept for the Results list on the Individual tab. */
export interface IndividualProgramResult {
  playerId: string;
  kind: IndividualProgramKind;
  targetAttribute?: keyof Attributes;
  targetPosition?: PositionPrimary;
  stampId?: string;
  weeks: number;
  outcome: IndividualProgramOutcome;
  gained: number;
  season: number;
  endedWeek: number;
}

export const INDIVIDUAL_HISTORY_LIMIT = 20;

/** Newest first, capped. */
export function appendIndividualHistory(
  history: readonly IndividualProgramResult[],
  results: readonly IndividualProgramResult[],
): IndividualProgramResult[] {
  return [...[...results].reverse(), ...history].slice(0, INDIVIDUAL_HISTORY_LIMIT);
}

export const MIN_PROGRAM_WEEKS = 4;
export const MAX_PROGRAM_WEEKS = 12;
export const WEAK_FOOT_PROGRAM_BONUS = 1.35;
/** Extra Einheit neben den 15 Mannschafts-Sessions (Mo–Fr × 3). */
export const ATTRIBUTE_FOCUS_PROGRAM_BONUS = 1.3;
export const STAMP_WEEKLY_ATTRIBUTE_BONUS = 1.15;
/** Hartes Mannschaftstraining + Einzelprogramm → zusätzliche Ermüdung. */
export const HARD_TRAINING_INTENSITY_FOR_EXTRA_FATIGUE = 115;
export const INDIVIDUAL_EXTRA_FITNESS_DRAIN = 4;

export const INDIVIDUAL_TRAINABLE_ATTRIBUTES = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "weak_foot",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

export function eligibleIndividualAttributes(player: Player): (keyof Attributes)[] {
  return INDIVIDUAL_TRAINABLE_ATTRIBUTES.filter((key) => {
    if (key === "gk_handling") return player.position === "GK";
    return true;
  });
}

function attributeValueCap(key: keyof Attributes): number {
  return key === "weak_foot" ? 100 : 199;
}

function attributeLabelKey(key: keyof Attributes): string {
  return `player.attribute.${key}`;
}
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
  if (program.kind === "attribute_focus" && program.targetAttribute) {
    const attrKey = attributeLabelKey(program.targetAttribute);
    const attrLabel = t(attrKey);
    const label = attrLabel !== attrKey ? attrLabel : program.targetAttribute;
    return t("training.program.attributeWeeks", {
      attribute: label,
      weeks: program.weeksRemaining,
    });
  }
  if (program.kind === "weak_foot") {
    return t("training.program.weakFootWeeks", { weeks: program.weeksRemaining });
  }
  if (program.kind === "stamp") {
    return t("training.program.stampWeeks", {
      stamp: stampLabel(program.stampId ?? "?"),
      weeks: program.weeksRemaining,
    });
  }
  return t("training.program.retrainWeeks", {
    position: program.targetPosition ?? "?",
    weeks: program.weeksRemaining,
  });
}

export function programKindLabel(kind: IndividualProgramKind): string {
  if (kind === "attribute_focus") return t("training.program.kind.attributeFocus");
  if (kind === "weak_foot") return t("training.program.kind.weakFoot");
  if (kind === "stamp") return t("training.program.kind.stamp");
  return t("training.program.kind.retrain");
}

export function retrainFailureCount(player: Player, target: PositionPrimary): number {
  return player.state.retrain_failures?.[target] ?? 0;
}

export function isRetrainTargetBlocked(player: Player, target: PositionPrimary): boolean {
  return retrainFailureCount(player, target) >= RETRAIN_MAX_FAILURES;
}

export function eligibleRetrainPositions(player: Player): PositionPrimary[] {
  return RETRAIN_POSITIONS.filter(
    (position) => position !== player.position && !isRetrainTargetBlocked(player, position),
  );
}

export interface RetrainNotice {
  playerId: string;
  target: PositionPrimary;
  success: boolean;
  label: string;
}

export function canAssignIndividualProgram(
  player: Player,
  kind: IndividualProgramKind,
  programs: readonly IndividualProgram[],
  targetPosition?: PositionPrimary,
  stampId?: string,
  targetAttribute?: keyof Attributes,
  /** From individualTrainingSlots(); running programs keep their slot. */
  maxSlots: number = INDIVIDUAL_SLOTS_BASE,
): { ok: true } | { ok: false; reason: string } {
  if (player.squad_status === "loaned_out") {
    return { ok: false, reason: "Ausgeliehene Spieler trainieren nicht beim Verein." };
  }
  if (player.state.injury !== null) {
    return { ok: false, reason: "Verletzte Spieler können kein Extra-Programm starten." };
  }
  if (!isIndividualSlotFree(programs, player.id, maxSlots)) {
    return { ok: false, reason: t("training.individual.slotsFull", { max: maxSlots }) };
  }
  if (kind === "attribute_focus") {
    if (!targetAttribute) return { ok: false, reason: "Attribut wählen." };
    if (!eligibleIndividualAttributes(player).includes(targetAttribute)) {
      return { ok: false, reason: "Dieses Attribut ist für den Spieler nicht trainierbar." };
    }
    if (player.attributes[targetAttribute] >= attributeValueCap(targetAttribute) - 1) {
      return { ok: false, reason: "Attribut ist praktisch am Maximum." };
    }
    return { ok: true };
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
    if (earn.definition.path !== "train" && earn.definition.path !== "hybrid") {
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
  if (isRetrainTargetBlocked(player, targetPosition)) {
    return {
      ok: false,
      reason: "Das hatten wir doch schon versucht — diese Position scheint nicht zu passen.",
    };
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
  targetAttribute?: keyof Attributes,
  maxSlots: number = INDIVIDUAL_SLOTS_BASE,
): IndividualProgram[] {
  const check = canAssignIndividualProgram(
    player,
    kind,
    programs,
    targetPosition,
    stampId,
    targetAttribute,
    maxSlots,
  );
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
    plannedWeeks: duration,
    targetPosition: kind === "position_retrain" ? targetPosition : undefined,
    targetAttribute:
      kind === "attribute_focus"
        ? targetAttribute
        : kind === "weak_foot"
          ? "weak_foot"
          : undefined,
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

function individualAttributeWeeklyDelta(
  player: Player,
  attribute: keyof Attributes,
  programBonus: number,
  context?: TrainingWeekContext,
  random?: () => number,
): number {
  const scale =
    effectiveDevelopmentScale(player, context) *
    trainingIntensityMultiplier(context?.intensity ?? 100) *
    programBonus;
  const resolvedRandom =
    random ??
    (context?.masterSeed !== undefined
      ? seededGrowthRandom(
          context.masterSeed,
          context.season,
          context.week,
          player.id,
          attribute,
          "individual",
        )
      : undefined);
  const raw = calculateWeeklyGrowth({
    age: player.age,
    maturityOffset: player.hidden.maturity_offset,
    attribute,
    value: player.attributes[attribute],
    anlage: player.hidden.anlage[attribute],
    drive: player.hidden.drive,
    minutes: developmentMinutes(player.squad_status, player.state.weekly_minutes),
    injured: player.state.injury !== null,
    focusSlots: 1,
    environmentFactor: context?.environmentFactor ?? 1,
    squadStatus: player.squad_status,
    seasonApps: player.state.season_apps,
    leagueMatchdaysPlayed: context?.leagueMatchdaysPlayed ?? 0,
    noise: resolvedRandom ? undefined : 1,
    random: resolvedRandom,
  });
  return raw * scale;
}

function applyIndividualAttributeGrowth(
  player: Player,
  attribute: keyof Attributes,
  programBonus: number,
  context?: TrainingWeekContext,
  random?: () => number,
): Player {
  const delta = individualAttributeWeeklyDelta(player, attribute, programBonus, context, random);
  const cap = attributeValueCap(attribute);
  const nextValue = Math.min(cap, Math.max(0, player.attributes[attribute] + delta));
  if (nextValue === player.attributes[attribute]) return player;
  return {
    ...player,
    attributes: {
      ...player.attributes,
      [attribute]: nextValue,
    },
  };
}

function applyWeakFootProgram(player: Player, context?: TrainingWeekContext, random?: () => number): Player {
  return applyIndividualAttributeGrowth(
    player,
    "weak_foot",
    WEAK_FOOT_PROGRAM_BONUS,
    context,
    random,
  );
}

function stampWeeklyAttributeKeys(def: StampDefinition): (keyof Attributes)[] {
  const fromGates = def.gates.attributes
    ? (Object.keys(def.gates.attributes) as (keyof Attributes)[])
    : [];
  if (fromGates.length > 0) return fromGates;
  return (Object.entries(def.applied) as [keyof Attributes, number][])
    .filter(([, delta]) => delta > 0)
    .map(([key]) => key);
}

function applyStampProgramWeek(
  player: Player,
  stampId: string,
  context?: TrainingWeekContext,
  random?: () => number,
): Player {
  const def = stampDefinition(stampId);
  if (!def) return player;
  let next = player;
  for (const key of stampWeeklyAttributeKeys(def)) {
    next = applyIndividualAttributeGrowth(
      next,
      key,
      STAMP_WEEKLY_ATTRIBUTE_BONUS,
      context,
      random,
    );
  }
  return next;
}

export function individualProgramFitnessDrain(intensity: number | undefined): number {
  if (normalizeTrainingIntensity(intensity ?? 100) < HARD_TRAINING_INTENSITY_FOR_EXTRA_FATIGUE) {
    return 0;
  }
  return INDIVIDUAL_EXTRA_FITNESS_DRAIN;
}

function applyExtraTrainingFatigue(
  player: Player,
  context?: TrainingWeekContext,
): Player {
  const drain = individualProgramFitnessDrain(context?.intensity);
  if (drain <= 0 || player.state.injury !== null) return player;
  const fitness = clampFitness(player.state.fitness - drain);
  if (fitness === player.state.fitness) return player;
  return { ...player, state: { ...player.state, fitness } };
}

function bumpRetrainFailure(player: Player, target: PositionPrimary): Player {
  const prior = retrainFailureCount(player, target);
  return {
    ...player,
    state: {
      ...player.state,
      retrain_failures: {
        ...player.state.retrain_failures,
        [target]: prior + 1,
      },
    },
  };
}

function upsertFlexibilitySlot(
  player: Player,
  target: PositionPrimary,
  proficiency: number,
  weeksTrained: number,
): Player {
  const existing = player.flexibility.find((entry) => entry.trained_as === target);
  if (existing) {
    return {
      ...player,
      flexibility: player.flexibility.map((entry) =>
        entry.trained_as === target
          ? {
              ...entry,
              proficiency: Math.min(1, Math.max(entry.proficiency, proficiency)),
              weeks_trained: entry.weeks_trained + weeksTrained,
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
        proficiency: Math.min(1, proficiency),
        weeks_trained: weeksTrained,
      },
    ],
  };
}

function resolvePositionRetrainFinal(
  player: Player,
  program: IndividualProgram,
  context?: TrainingWeekContext,
): { player: Player; notice: RetrainNotice } {
  const target = program.targetPosition!;
  const plannedWeeks = program.plannedWeeks ?? program.weeksRemaining;
  const existing = player.flexibility.find((entry) => entry.trained_as === target);
  const currentProficiency = existing?.proficiency ?? 0;
  const probability = retrainSuccessProbability({
    plannedWeeks,
    from: player.position,
    to: target,
    attrs: player.attributes,
    currentProficiency,
    flexibility: player.flexibility,
  });
  const masterSeed = context?.masterSeed ?? 0;
  const unit = retrainDeterministicUnit(
    masterSeed,
    player.id,
    target,
    program.season,
    program.startedWeek,
  );
  const success = rollRetrainSuccess(unit, probability);
  const who = formatPlayerName(player);

  if (success) {
    const next = upsertFlexibilitySlot(player, target, 1, plannedWeeks);
    return {
      player: next,
      notice: {
        playerId: player.id,
        target,
        success: true,
        label: `${who} hat ${target} gelernt.`,
      },
    };
  }

  const partial = retrainPartialProficiencyGain(
    plannedWeeks,
    player.attributes,
    currentProficiency,
  );
  let next = upsertFlexibilitySlot(player, target, partial, plannedWeeks);
  next = bumpRetrainFailure(next, target);
  return {
    player: next,
    notice: {
      playerId: player.id,
      target,
      success: false,
      label: `${who} ist ${target} noch nicht sicher genug.`,
    },
  };
}

/** Attributes whose growth counts as this program's effect. */
export function programAttributes(program: IndividualProgram): (keyof Attributes)[] {
  if (program.kind === "attribute_focus" && program.targetAttribute) return [program.targetAttribute];
  if (program.kind === "weak_foot") return ["weak_foot"];
  if (program.kind === "stamp" && program.stampId) {
    const def = stampDefinition(program.stampId);
    return def ? stampWeeklyAttributeKeys(def) : [];
  }
  return [];
}

/** Apply one week of individual programs, then tick durations. Stamp awards on completion. */
export function advanceIndividualTrainingWeek(
  players: readonly Player[],
  programs: readonly IndividualProgram[],
  context?: TrainingWeekContext,
  random?: () => number,
): {
  players: Player[];
  programs: IndividualProgram[];
  awards: StampAwardNotice[];
  retrainNotices: RetrainNotice[];
  results: IndividualProgramResult[];
} {
  const byId = new Map(programs.map((program) => [program.playerId, program]));
  const awards: StampAwardNotice[] = [];
  const retrainNotices: RetrainNotice[] = [];
  const gainedThisWeek = new Map<string, number>();
  const outcomes = new Map<string, IndividualProgramOutcome>();
  const season = context?.season ?? 1;
  const week = context?.week ?? 1;

  const nextPlayers = players.map((player) => {
    const program = byId.get(player.id);
    if (!program || program.weeksRemaining <= 0) return player;

    let next = player;
    const tracked = programAttributes(program);

    if (program.kind === "attribute_focus" && program.targetAttribute) {
      next = applyIndividualAttributeGrowth(
        next,
        program.targetAttribute,
        ATTRIBUTE_FOCUS_PROGRAM_BONUS,
        context,
        random,
      );
    } else if (program.kind === "weak_foot") {
      next = applyWeakFootProgram(next, context, random);
    } else if (program.kind === "position_retrain" && program.targetPosition) {
      if (program.weeksRemaining === 1) {
        const resolved = resolvePositionRetrainFinal(next, program, context);
        retrainNotices.push(resolved.notice);
        outcomes.set(player.id, resolved.notice.success ? "retrained" : "failed");
        next = resolved.player;
      }
    } else if (program.kind === "stamp" && program.stampId) {
      if (program.weeksRemaining === 1) {
        const before = next;
        next = awardStamp(next, program.stampId, season, week);
        const earned = next.stamps.length > (before.stamps?.length ?? 0);
        outcomes.set(player.id, earned ? "stamp" : "failed");
        if (earned) {
          const def = stampDefinition(program.stampId);
          awards.push({
            playerId: player.id,
            stampId: program.stampId,
            label: def?.label ?? program.stampId,
            icon: def?.icon ?? "◆",
          });
        }
      } else {
        next = applyStampProgramWeek(next, program.stampId, context, random);
      }
    }

    gainedThisWeek.set(
      player.id,
      tracked.reduce((sum, key) => sum + (next.attributes[key] - player.attributes[key]), 0),
    );
    return applyExtraTrainingFatigue(next, context);
  });

  const ticked = programs.map((program) => ({
    ...program,
    weeksRemaining: program.weeksRemaining - 1,
    gained: (program.gained ?? 0) + (gainedThisWeek.get(program.playerId) ?? 0),
  }));
  const results: IndividualProgramResult[] = ticked
    .filter((program) => program.weeksRemaining <= 0)
    .map((program) => {
      const gained = program.gained ?? 0;
      return {
        playerId: program.playerId,
        kind: program.kind,
        targetAttribute: program.targetAttribute,
        targetPosition: program.targetPosition,
        stampId: program.stampId,
        weeks: program.plannedWeeks ?? Math.max(1, week - program.startedWeek),
        outcome: outcomes.get(program.playerId) ?? (gained > 0 ? "gain" : "no_gain"),
        gained,
        season,
        endedWeek: week,
      };
    });
  const nextPrograms = ticked.filter((program) => program.weeksRemaining > 0);

  return { players: nextPlayers, programs: nextPrograms, awards, retrainNotices, results };
}

export { eligibleTrainStamps };
