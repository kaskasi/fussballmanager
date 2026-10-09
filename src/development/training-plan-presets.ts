import {
  assertWeeklyPlanLength,
  emptyWeeklyTrainingPlan,
  isTrainingSlotEmpty,
} from "./training-plan-state.ts";
import { migrateLegacyTrainingPlan, type TrainingSlot } from "./training-units.ts";

export const TRAINING_PLAN_PRESET_SLOTS = 3 as const;

export type TrainingPlanPresetId = 1 | 2 | 3;

export interface TrainingPlanPresetSlot {
  id: TrainingPlanPresetId;
  label: string;
  plan: TrainingSlot[];
}

const DEFAULT_LABELS: Record<TrainingPlanPresetId, string> = {
  1: "Vorlage 1",
  2: "Vorlage 2",
  3: "Vorlage 3",
};

export function defaultTrainingPlanPresets(): TrainingPlanPresetSlot[] {
  return ([1, 2, 3] as const).map((id) => ({
    id,
    label: DEFAULT_LABELS[id],
    plan: emptyWeeklyTrainingPlan(),
  }));
}

export function normalizeTrainingPlanPresets(
  presets?: readonly TrainingPlanPresetSlot[],
): TrainingPlanPresetSlot[] {
  const defaults = defaultTrainingPlanPresets();
  if (!presets || presets.length === 0) return defaults;
  return defaults.map((fallback) => {
    const saved = presets.find((entry) => entry.id === fallback.id);
    if (!saved) return fallback;
    const plan = migrateLegacyTrainingPlan(saved.plan ?? []);
    assertWeeklyPlanLength(plan);
    return {
      id: fallback.id,
      label: saved.label?.trim() || fallback.label,
      plan,
    };
  });
}

export function trainingPresetHasContent(slot: TrainingPlanPresetSlot): boolean {
  return slot.plan.some((entry) => !isTrainingSlotEmpty(entry));
}

export function saveTrainingPlanPreset(
  presets: readonly TrainingPlanPresetSlot[],
  id: TrainingPlanPresetId,
  plan: readonly TrainingSlot[],
  label?: string,
): TrainingPlanPresetSlot[] {
  const base = normalizeTrainingPlanPresets(presets);
  const copy = migrateLegacyTrainingPlan([...plan]);
  assertWeeklyPlanLength(copy);
  return base.map((slot) =>
    slot.id === id
      ? {
          ...slot,
          label: label?.trim() || slot.label,
          plan: copy,
        }
      : slot,
  );
}

export function loadTrainingPlanPreset(
  presets: readonly TrainingPlanPresetSlot[],
  id: TrainingPlanPresetId,
): TrainingSlot[] {
  const slot = normalizeTrainingPlanPresets(presets).find((entry) => entry.id === id);
  if (!slot) return emptyWeeklyTrainingPlan();
  return slot.plan.map((entry) => ({ ...entry }));
}
