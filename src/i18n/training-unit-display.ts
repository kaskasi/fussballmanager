import type { TrainingUnit } from "../development/training-units.ts";
import type { SessionGroup } from "../development/weekly-plan.ts";
import { t } from "./index.ts";

export function trainingUnitDisplayLabel(unit: TrainingUnit): string {
  const key = `training.units.${unit.id}.label`;
  const translated = t(key);
  return translated === key ? unit.label : translated;
}

export function trainingGroupDisplayLabel(group: SessionGroup): string {
  return t(`training.group.${group}`);
}
