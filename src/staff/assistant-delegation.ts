/**
 * F8.5 — Assistant auto-delegation (Item 11).
 * Quality from attack/defense coaches; weak assistants make noisier choices (PRD 01).
 */

import { getFormation, type FormationSlotId } from "@fussballmanager/shared";
import type { TrainingSlot } from "../development/training-units.ts";
import { TRAINING_UNITS, trainingUnit } from "../development/training-units.ts";
import { weeklyFocusCount } from "../development/training-plan-state.ts";
import { MAX_FOCUS_PER_GROUP, MAX_FOCUS_SLOTS } from "../development/weekly-plan.ts";
import {
  autoLineupAssignments,
  type AutoLineupMode,
} from "../match/auto-lineup.ts";
import type { MatchLineupState } from "../match/lineup-board.ts";
import { loadTacticsPreset, type TacticsPresetSlot } from "../match/tactics-presets.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import {
  addScoutAssignment,
  listBoardTargets,
  normalizeScoutBoard,
  syncAssignmentTargets,
  type ScoutBoard,
} from "../scouting/scout-board.ts";
import { createScoutAssignment } from "../scouting/scout-assignments.ts";
import { t } from "../i18n/index.ts";
import type { CoachingStaff } from "./coaching-staff.ts";

export type AssistantDelegationTask = "lineup" | "training" | "scouting";

export interface AssistantDelegation {
  lineup: boolean;
  training: boolean;
  scouting: boolean;
}

export const ASSISTANT_DELEGATION_TASKS: readonly {
  key: AssistantDelegationTask;
  label: string;
  icon: string;
  hint: string;
}[] = [
  {
    key: "lineup",
    label: "Aufstellung",
    icon: "lineup",
    hint: "Vor dem Spieltag Startelf und Formation wählen",
  },
  {
    key: "training",
    label: "Wochenplan",
    icon: "training",
    hint: "Erinnerung, bevor du den Wochenplan vergisst",
  },
  {
    key: "scouting",
    label: "Scouting",
    icon: "scouting",
    hint: "Aufträge pflegen und Ziele zuweisen",
  },
];

export const DEFAULT_ASSISTANT_DELEGATION: AssistantDelegation = {
  lineup: false,
  training: false,
  scouting: false,
};

export function normalizeAssistantDelegation(
  value?: Partial<AssistantDelegation>,
): AssistantDelegation {
  const base = DEFAULT_ASSISTANT_DELEGATION;
  if (!value) return base;
  return {
    lineup: value.lineup ?? base.lineup,
    training: value.training ?? base.training,
    scouting: value.scouting ?? base.scouting,
  };
}

/** Tactics-relevant staff quality (attack + defense coaches). */
export function assistantQuality(staff: CoachingStaff): number {
  const attack = staff.attack?.quality ?? 55;
  const defense = staff.defense?.quality ?? 55;
  return Math.round((attack + defense) / 2);
}

export function assistantQualityLabel(quality: number): string {
  if (quality >= 75) return "Scharf";
  if (quality >= 60) return "Solide";
  if (quality >= 48) return "Durchwachsen";
  return "Unsicher";
}

export function assistantLineupMode(quality: number): AutoLineupMode {
  if (quality >= 72) return "best_eleven";
  if (quality >= 58) return "rotation";
  return "youth";
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

export function assistantLineupAssignments(
  players: readonly Player[],
  formation: MatchLineupState["formation"],
  clubId: string,
  quality: number,
  seed: number,
): MatchLineupState["assignments"] {
  const mode = assistantLineupMode(quality);
  const base = autoLineupAssignments(players, formation, mode, clubId);
  const noiseScale = Math.max(0, (68 - quality) / 68);
  if (noiseScale <= 0.05) return base;

  const rng = mulberry32(hashSeed([seed, formation, quality, "assistant-lineup"]));
  const pool = players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
  const slots = getFormation(formation);
  const used = new Set(Object.values(base).filter(Boolean));
  const assignments = { ...base };

  for (const slot of slots) {
    if (rng() > noiseScale * 0.55) continue;
    const candidates = pool
      .filter((player) => !used.has(player.id) || assignments[slot.id] === player.id)
      .sort(
        (left, right) =>
          estimateCa(right.attributes, right.position) -
          estimateCa(left.attributes, left.position),
      );
    const pick = candidates[Math.min(candidates.length - 1, 1 + Math.floor(rng() * 2))];
    if (!pick) continue;
    if (assignments[slot.id]) used.delete(assignments[slot.id]!);
    assignments[slot.id as FormationSlotId] = pick.id;
    used.add(pick.id);
  }

  return assignments;
}

export function buildAssistantMatchLineup(
  players: readonly Player[],
  clubId: string,
  tacticsPresets: readonly TacticsPresetSlot[],
  existing: MatchLineupState | undefined,
  quality: number,
  seed: number,
): MatchLineupState {
  const fallbackPlan = loadTacticsPreset(tacticsPresets, 1);
  const plan = existing?.plan ?? fallbackPlan;
  const formation = existing?.formation ?? plan.formation;
  const nextPlan = { ...plan, formation };
  return {
    formation,
    plan: nextPlan,
    assignments: assistantLineupAssignments(players, formation, clubId, quality, seed),
  };
}

type SessionGroup = "technical" | "physical" | "mental";

function squadGroupScores(
  players: readonly Player[],
  clubId: string,
): Record<SessionGroup, number> {
  const squad = players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
  if (squad.length === 0) {
    return { technical: 70, physical: 70, mental: 70 };
  }
  const totals = { technical: 0, physical: 0, mental: 0 };
  for (const player of squad) {
    totals.technical +=
      (player.attributes.passing +
        player.attributes.technique +
        player.attributes.shooting) /
      3;
    totals.physical +=
      (player.attributes.pace +
        player.attributes.stamina +
        player.attributes.strength) /
      3;
    totals.mental +=
      (player.attributes.composure +
        player.attributes.positioning +
        player.attributes.teamwork) /
      3;
  }
  const count = squad.length;
  return {
    technical: totals.technical / count,
    physical: totals.physical / count,
    mental: totals.mental / count,
  };
}

function unitsForGroup(group: SessionGroup): string[] {
  return TRAINING_UNITS.filter((unit) => unit.group === group && !unit.requires).map((unit) => unit.id);
}

export function assistantTrainingPlan(
  players: readonly Player[],
  clubId: string,
  quality: number,
  season: number,
  week: number,
  masterSeed: number,
): TrainingSlot[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, clubId, "assistant-training"]));
  const scores = squadGroupScores(players, clubId);
  const ranked = (Object.entries(scores) as [SessionGroup, number][]).sort(
    (left, right) => left[1] - right[1],
  );
  const weakest = ranked[0]![0];
  const second = ranked[1]![0];

  const pickUnit = (group: SessionGroup, index: number): string => {
    const options = unitsForGroup(group);
    if (quality >= 70) return options[index % options.length] ?? options[0]!;
    if (quality >= 55) return options[Math.floor(rng() * options.length)] ?? options[0]!;
    return options[(index + Math.floor(rng() * options.length)) % options.length] ?? options[0]!;
  };

  const focusGroups: SessionGroup[] =
    quality >= 70
      ? [weakest, weakest, second]
      : quality >= 55
        ? [weakest, second, ranked[2]![0]]
        : [ranked[Math.floor(rng() * 3)]![0], ranked[Math.floor(rng() * 3)]![0], weakest];

  const groups: SessionGroup[] = ["technical", "physical", "mental", "technical", "mental"];
  const plan: TrainingSlot[] = groups.map((group, index) => ({
    unitId: pickUnit(group, index),
    focus: false,
  }));

  let focusLeft = MAX_FOCUS_SLOTS;
  const focusCount: Record<SessionGroup, number> = {
    technical: 0,
    physical: 0,
    mental: 0,
  };
  for (const group of focusGroups) {
    if (focusLeft <= 0) break;
    if (focusCount[group] >= MAX_FOCUS_PER_GROUP) continue;
    const slotIndex = plan.findIndex(
      (slot) => trainingUnit(slot.unitId).group === group && !slot.focus,
    );
    if (slotIndex < 0) continue;
    plan[slotIndex] = { ...plan[slotIndex]!, focus: true };
    focusCount[group] += 1;
    focusLeft -= 1;
  }

  return plan;
}

export function assistantScoutBoard(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
  quality: number,
  season: number,
  week: number,
  masterSeed: number,
): ScoutBoard {
  let next = normalizeScoutBoard(board);
  const assignments = next.assignments ?? [];
  if (assignments.length === 0) {
    const idBase = `asst_${season}_${week}`;
    if (quality >= 70) {
      next = addScoutAssignment(
        next,
        createScoutAssignment(`${idBase}_u21`, { age: "u21" }, "Talente U21"),
      );
      next = addScoutAssignment(
        next,
        createScoutAssignment(`${idBase}_st`, { position: "CF" }, "Stürmer"),
      );
    } else if (quality >= 55) {
      next = addScoutAssignment(
        next,
        createScoutAssignment(`${idBase}_u21`, { age: "u21" }, "Junge Spieler"),
      );
    } else {
      next = addScoutAssignment(
        next,
        createScoutAssignment(`${idBase}_wide`, { position: "all" }, "Breiter Markt"),
      );
    }
  }

  const targets = listBoardTargets(next, rivalPlayers);
  const rng = mulberry32(hashSeed([masterSeed, season, week, "assistant-scout"]));
  let ordered = [...targets];
  if (quality >= 68) {
    ordered.sort(
      (left, right) =>
        right.estimate.estimatedAbilityMean - left.estimate.estimatedAbilityMean,
    );
  } else if (quality < 52) {
    ordered.sort(() => rng() - 0.5);
  }

  let synced = syncAssignmentTargets(next, rivalPlayers);
  if (quality >= 68) {
    const activeAssignments = (synced.assignments ?? []).filter((entry) => entry.active);
    if (activeAssignments.length > 0) {
      let slots = 3 - Object.values(synced.targets).filter((target) => target.assigned).length;
      const nextTargets = { ...synced.targets };
      for (const target of ordered) {
        if (slots <= 0) break;
        const entry = nextTargets[target.player.id];
        if (!entry || entry.assigned) continue;
        const matches = activeAssignments.some((assignment) =>
          assignment.criteria.position === "all" ||
          assignment.criteria.position === target.player.position ||
          (assignment.criteria.age === "u21" && target.player.age <= 21),
        );
        if (!matches) continue;
        nextTargets[target.player.id] = { ...entry, assigned: true };
        slots -= 1;
      }
      synced = { ...synced, targets: nextTargets };
    }
  }

  return synced;
}

export interface AssistantDelegationResult {
  trainingPlan?: TrainingSlot[];
  scoutBoard?: ScoutBoard;
  matchLineup?: MatchLineupState;
  messages: string[];
}

export function applyAssistantDelegationWeek(input: {
  delegation: AssistantDelegation;
  assistantName: string;
  quality: number;
  players: readonly Player[];
  clubId: string;
  trainingPlan: TrainingSlot[];
  scoutBoard: ScoutBoard;
  rivalPlayers: readonly Player[];
  tacticsPresets: readonly TacticsPresetSlot[];
  matchLineup: MatchLineupState | undefined;
  season: number;
  week: number;
  masterSeed: number;
  hasPlayerFixture: boolean;
}): AssistantDelegationResult {
  const messages: string[] = [];
  let trainingPlan = input.trainingPlan;
  let scoutBoard = input.scoutBoard;
  let matchLineup = input.matchLineup;

  if (input.delegation.training) {
    const emptyWeek = weeklyFocusCount(input.trainingPlan) === 0;
    messages.push(
      emptyWeek
        ? `${input.assistantName}: Du hast noch keinen Wochenplan gesetzt — ohne Fokus gibt es kaum Entwicklung.`
        : `${input.assistantName}: Denk an den Wochenplan — ich erinnere dich, ich setze nichts für dich.`,
    );
  }

  if (input.delegation.scouting) {
    scoutBoard = assistantScoutBoard(
      input.scoutBoard,
      input.rivalPlayers,
      input.quality,
      input.season,
      input.week,
      input.masterSeed,
    );
    messages.push(t("clubEvent.assistantScoutsUpdated", { name: input.assistantName }));
  }

  if (input.delegation.lineup && input.hasPlayerFixture) {
    matchLineup = buildAssistantMatchLineup(
      input.players,
      input.clubId,
      input.tacticsPresets,
      input.matchLineup,
      input.quality,
      input.masterSeed,
    );
    messages.push(t("clubEvent.assistantLineupSet", { name: input.assistantName }));
  }

  return { trainingPlan, scoutBoard, matchLineup, messages };
}
