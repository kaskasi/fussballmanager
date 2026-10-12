import { ChartNoAxesColumn, Target } from "lucide-react";
import {
  isTrainingSlotEmpty,
  trainingUnit,
  trainingUnitPickerDetail,
  type TrainingSlot,
} from "../../development/training-units.ts";
import { attributeLabel } from "../player-profile.ts";
import {
  formatTrainingDelta,
  type TrainingHighlightMetric,
  type TrainingSlotOutcome,
} from "../../development/training-unit-result.ts";
import { trainingGroupDisplayLabel, trainingUnitDisplayLabel } from "../../i18n/training-unit-display.ts";
import { t } from "../../i18n/index.ts";

function trainingHighlightLabel(metric: TrainingHighlightMetric): string {
  if (metric === "fitness") return t("squad.col.fitness");
  return attributeLabel(metric);
}

export function TrainingSlotCard({
  slotIndex,
  periodLabel,
  slot,
  past,
  current,
  active,
  outcome,
  onOpenPicker,
  onShowOutcome,
  onToggleFocus,
  focusToggleDisabled,
  readOnly = false,
}: {
  slotIndex: number;
  periodLabel: string;
  slot: TrainingSlot;
  past: boolean;
  current: boolean;
  active: boolean;
  outcome: TrainingSlotOutcome | null;
  onOpenPicker: () => void;
  onShowOutcome: () => void;
  onToggleFocus: () => void;
  focusToggleDisabled: boolean;
  /** Hub desk: no focus toggle; slot opens training screen. */
  readOnly?: boolean;
}) {
  const empty = isTrainingSlotEmpty(slot);
  const unit = empty ? null : trainingUnit(slot.unitId);
  const highlight = outcome?.highlight ?? null;
  const className = [
    "training-slot",
    empty ? "is-empty" : "",
    slot.focus ? "is-focus" : "",
    active ? "is-active" : "",
    current ? "is-current" : "",
    past ? "is-past" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={className}
      data-training-slot-index={slotIndex}
      aria-disabled={past || undefined}
      aria-current={current ? "step" : undefined}
    >
      {readOnly ? null : (
        <button
          type="button"
          className={
            slot.focus ? "training-slot-focus-toggle is-on" : "training-slot-focus-toggle"
          }
          disabled={focusToggleDisabled}
          aria-label={t("training.slot.toggleFocus")}
          aria-pressed={slot.focus}
          onClick={(event) => {
            event.stopPropagation();
            if (!focusToggleDisabled) onToggleFocus();
          }}
        >
          <Target size={13} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="training-slot-main" disabled={past && !readOnly} onClick={onOpenPicker}>
        <span className="training-period">{periodLabel}</span>
        {empty ? (
          <>
            <strong className="training-unit-name training-unit-name--empty">{t("training.slot.empty")}</strong>
            <span className="training-group training-group--muted">{t("training.slot.emptyHint")}</span>
          </>
        ) : (
          <>
            <strong className="training-unit-name">{trainingUnitDisplayLabel(unit!)}</strong>
            <span className="training-group">{trainingGroupDisplayLabel(unit!.group)}</span>
            <span className="training-skills">
              {unit!.fitnessRecoveryFraction !== undefined
                ? trainingUnitPickerDetail(unit!, true)
                : unit!.skills.map((skill) => attributeLabel(skill)).join(" · ")}
            </span>
          </>
        )}
      </button>
      {past && highlight ? (
        <div className="training-slot-outcome">
          <p className="training-slot-outcome-teaser">
            {highlight.playerName} · +{formatTrainingDelta(highlight.delta)}{" "}
            {trainingHighlightLabel(highlight.metric)}
          </p>
          <button
            type="button"
            className="training-slot-outcome-btn"
            aria-label={t("training.slot.outcomeAria")}
            title={t("training.slot.outcomeHint")}
            onClick={(event) => {
              event.stopPropagation();
              onShowOutcome();
            }}
          >
            <ChartNoAxesColumn size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      ) : past && outcome && !highlight ? (
        <p className="training-slot-outcome training-slot-outcome--quiet">
          {t("training.slot.outcomeQuiet")}
        </p>
      ) : null}
    </article>
  );
}
