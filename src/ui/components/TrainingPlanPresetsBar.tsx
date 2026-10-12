import { Download, Upload } from "lucide-react";
import {
  loadTrainingPlanPreset,
  saveTrainingPlanPreset,
  trainingPresetHasContent,
  type TrainingPlanPresetId,
  type TrainingPlanPresetSlot,
} from "../../development/training-plan-presets.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { trainingPresetDisplayLabel } from "../../i18n/training-preset-display.ts";
import { useT } from "../../i18n/react.ts";

export function TrainingPlanPresetsBar({
  presets,
  currentPlan,
  loadBlocked,
  onPresetsChange,
  onPlanChange,
  onNotice,
}: {
  presets: readonly TrainingPlanPresetSlot[];
  currentPlan: readonly TrainingSlot[];
  loadBlocked: boolean;
  onPresetsChange: (presets: TrainingPlanPresetSlot[]) => void;
  onPlanChange: (plan: TrainingSlot[]) => void;
  onNotice: (text: string, tone?: "ok" | "warn") => void;
}) {
  const tr = useT();

  function handleSave(id: TrainingPlanPresetId) {
    const next = saveTrainingPlanPreset(presets, id, currentPlan);
    onPresetsChange(next);
    const slot = next.find((entry) => entry.id === id);
    onNotice(tr("training.presets.saved", { label: trainingPresetDisplayLabel(id) }), "ok");
  }

  function handleLoad(id: TrainingPlanPresetId) {
    if (loadBlocked) {
      onNotice(tr("training.presets.loadBlocked"), "warn");
      return;
    }
    const slot = presets.find((entry) => entry.id === id);
    if (!slot || !trainingPresetHasContent(slot)) {
      onNotice(tr("training.presets.empty", { label: trainingPresetDisplayLabel(id) }), "warn");
      return;
    }
    onPlanChange(loadTrainingPlanPreset(presets, id));
    onNotice(tr("training.presets.loaded", { label: trainingPresetDisplayLabel(id) }), "ok");
  }

  return (
    <div className="training-plan-presets" role="group" aria-label={tr("training.presets.aria")}>
      {presets.map((slot) => (
        <div key={slot.id} className="training-plan-preset">
          <button
            type="button"
            className={
              trainingPresetHasContent(slot)
                ? "training-plan-preset-load"
                : "training-plan-preset-load is-empty"
            }
            title={tr("training.presets.loadTitle", { label: trainingPresetDisplayLabel(slot.id) })}
            onClick={() => handleLoad(slot.id)}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden="true" />
            <span className="training-plan-preset-label">{trainingPresetDisplayLabel(slot.id)}</span>
          </button>
          <button
            type="button"
            className="training-plan-preset-save"
            title={tr("training.presets.saveTitle", { label: trainingPresetDisplayLabel(slot.id) })}
            aria-label={tr("training.presets.saveTitle", { label: trainingPresetDisplayLabel(slot.id) })}
            onClick={() => handleSave(slot.id)}
          >
            <Upload size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
