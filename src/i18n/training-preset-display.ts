import type { TrainingPlanPresetId } from "../development/training-plan-presets.ts";
import { t } from "./index.ts";

export function trainingPresetDisplayLabel(id: TrainingPlanPresetId): string {
  if (id === 1) {
    const starterKey = "training.presets.starterBalanced";
    const starter = t(starterKey);
    if (starter !== starterKey) return starter;
  }
  const key = `training.presets.default.${id}`;
  const translated = t(key);
  return translated === key ? `Preset ${id}` : translated;
}
