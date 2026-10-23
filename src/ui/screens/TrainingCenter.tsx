/**
 * WIREFRAME: PRD 09.3b — Training timetable; header NEXT runs units (toast), not calendar days.
 */
import { useEffect, useMemo, useState } from "react";
import {
  planToSessions,
  slotLabel,
  slotPeriodLabel,
  TRAINING_DAYS,
  TRAINING_UNITS,
  UNITS_PER_DAY,
  currentTrainingSlotIndex,
  firstEmptySchedulableSlotIndex,
  isTrainingDayFullyPastForSession,
  isTrainingSlotEmpty,
  isTrainingSlotPastForSession,
  trainingDayIndexForWeekday,
  trainingUnit,
  trainingUnitLockHint,
  trainingUnitPickerDetail,
  trainingUnitUnlocked,
  type TrainingSlot,
  type TrainingUnlocks,
} from "../../development/training-units.ts";
import { attributeLabel } from "../player-profile.ts";
import {
  MAX_FOCUS_SLOTS,
  SLOT_COUNT,
  validateWeeklyPlan,
  type SessionGroup,
} from "../../development/weekly-plan.ts";
import type { Player } from "../../types/player.ts";
import { TrainingPlanPresetsBar } from "../components/TrainingPlanPresetsBar.tsx";
import type { TrainingPlanPresetSlot } from "../../development/training-plan-presets.ts";
import type { IndividualProgram } from "../../development/individual-training.ts";
import {
  fatigueAmpelClassName,
  squadTrainingLoad,
  snapTrainingIntensityToPreset,
  TRAINING_INTENSITY_PRESETS,
  type TrainingLoadSummary,
} from "../../development/training-load.ts";
import { Hint } from "../components/Hint.tsx";
import { AttributeTrainingHeatmap } from "../components/AttributeTrainingHeatmap.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";
import { TrainingSlotCard } from "../components/TrainingSlotCard.tsx";
import { squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type {
  AssistantDelegation,
  AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import {
  formatTrainingDelta,
  trainingSlotOutcomeAt,
  type TrainingHighlightMetric,
  type TrainingSlotOutcome,
} from "../../development/training-unit-result.ts";
import { trainingDayShortLabel } from "../../i18n/training-schedule-display.ts";
import { trainingGroupDisplayLabel, trainingUnitDisplayLabel } from "../../i18n/training-unit-display.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";
import { activeTutorialStepId, COACH_TARGET } from "../../tutorial/index.ts";
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";
import { useTutorialUi } from "../tutorial/TutorialUiContext.tsx";
import { useGameSession } from "../session/GameSessionContext.tsx";
import { FmScreenTab, FmScreenTabBar } from "../components/FmScreenTabBar.tsx";
import { IndividualTrainingTab } from "./training/IndividualTrainingTab.tsx";

type TrainingTab = "team" | "individual";

function trainingHighlightLabel(metric: TrainingHighlightMetric): string {
  if (metric === "fitness") return t("squad.col.fitness");
  return attributeLabel(metric);
}

/**
 * WIREFRAME: docs/prd/design.md §9.10 — Training
 *
 * Stundenplan: Mo–Fr × 3, Intensität, Heatmap-Band, Fokus-Icons.
 * Individuell: Extra-Programme pro Spieler (F2.3).
 */

export function TrainingCenter({
  week,
  weekday,
  season,
  plan,
  intensity,
  individualPrograms,
  onPlanChange,
  onIntensityChange,
  onProgramsChange,
  players,
  clubId,
  coachingStaff,
  masterSeed,
  onHireCoach,
  assistantName,
  assistantDelegation,
  onAssistantDelegationChange,
  onAssignMentor,
  onClearMentor,
  onSelectPlayer,
  focusIndividualPlayerId = null,
  onClearIndividualFocus,
  trainingUnlocks = {},
  injuryRiskFactor = 1,
  trainingUnitsCompleted = 0,
  trainingUnitOutcomes = [],
  useTrainingUnitProgress = false,
  readOnly = false,
  trainingPlanPresets,
  onTrainingPlanPresetsChange,
  onTrainingPresetNotice,
  onTrainingPresetLoaded,
  onTrainingPresetSaved,
  trainingAutoNext = false,
  onStopTrainingAutoNext,
}: {
  week: number;
  weekday: number;
  season: number;
  plan: TrainingSlot[];
  intensity: number;
  individualPrograms: IndividualProgram[];
  onPlanChange: (plan: TrainingSlot[]) => void;
  onIntensityChange: (intensity: number) => void;
  onProgramsChange: (programs: IndividualProgram[]) => void;
  players: Player[];
  clubId: string;
  coachingStaff: CoachingStaff;
  masterSeed: number;
  onHireCoach: (coach: Coach) => void;
  assistantName: string;
  assistantDelegation: AssistantDelegation;
  onAssistantDelegationChange: (task: AssistantDelegationTask, enabled: boolean) => void;
  onAssignMentor: (menteeId: string, mentorId: string) => void;
  onClearMentor: (menteeId: string) => void;
  onSelectPlayer?: (playerId: string) => void;
  /** Öffnet Tab „Individuell“ und Programm-Modal für diesen Spieler (z. B. aus Spielerakte). */
  focusIndividualPlayerId?: string | null;
  onClearIndividualFocus?: () => void;
  trainingUnlocks?: TrainingUnlocks;
  injuryRiskFactor?: number;
  trainingUnitsCompleted?: number;
  trainingUnitOutcomes?: (TrainingSlotOutcome | null)[];
  useTrainingUnitProgress?: boolean;
  /** PRD 19 Act 1 — assistant owns the plan; the screen is view-only. */
  readOnly?: boolean;
  trainingPlanPresets: TrainingPlanPresetSlot[];
  onTrainingPlanPresetsChange: (presets: TrainingPlanPresetSlot[]) => void;
  onTrainingPresetNotice: (text: string, tone?: "ok" | "warn") => void;
  onTrainingPresetLoaded?: () => void;
  onTrainingPresetSaved?: () => void;
  trainingAutoNext?: boolean;
  onStopTrainingAutoNext?: () => void;
}) {
  const tr = useT();
  const [tab, setTab] = useState<TrainingTab>("team");
  useTutorialTabFocus("training", "training.individual_tab", "individual", setTab);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const check = useMemo(() => validateWeeklyPlan(planToSessions(plan)), [plan]);
  const focusCount = plan.filter((slot) => slot.focus).length;
  const load = useMemo(
    () => squadTrainingLoad(players, clubId, intensity, focusCount, individualPrograms.length),
    [players, clubId, intensity, focusCount, individualPrograms.length],
  );

  useEffect(() => {
    if (focusIndividualPlayerId) {
      setTab("individual");
    }
  }, [focusIndividualPlayerId]);

  const trainingTabs: { id: TrainingTab; labelKey: string }[] = [
    { id: "team", labelKey: "training.tab.team" },
    { id: "individual", labelKey: "training.tab.individual" },
  ];

  return (
    <main className="training club-shell-card-body">
      <FmScreenTabBar
        role="tablist"
        aria-label={t("training.tabs.aria")}
        data-coach-target={COACH_TARGET.trainingTabs}
      >
        {trainingTabs.map(({ id, labelKey }) => (
          <FmScreenTab
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </FmScreenTab>
        ))}
      </FmScreenTabBar>

      {trainingAutoNext ? (
        <div className="training-auto-next-banner" role="status">
          <span>{tr("training.autoNext.active")}</span>
          {onStopTrainingAutoNext ? (
            <button type="button" className="training-auto-next-stop" onClick={onStopTrainingAutoNext}>
              {tr("training.autoNext.stop")}
            </button>
          ) : null}
        </div>
      ) : null}

      {readOnly ? (
        <div className="training-auto-next-banner" role="status">
          <span>{tr("training.assistantRuns", { name: assistantName })}</span>
        </div>
      ) : null}

      <fieldset className="training-readonly-scope" disabled={readOnly}>
      {tab === "team" ? (
        <div className="fm-tab-panel">
          <TeamPlan
            plan={plan}
            weekday={weekday}
            trainingUnitsCompleted={trainingUnitsCompleted}
            trainingUnitOutcomes={trainingUnitOutcomes}
            useTrainingUnitProgress={useTrainingUnitProgress}
            trainingPlanPresets={trainingPlanPresets}
            onTrainingPlanPresetsChange={onTrainingPlanPresetsChange}
            onTrainingPresetNotice={onTrainingPresetNotice}
            onTrainingPresetLoaded={onTrainingPresetLoaded}
            onTrainingPresetSaved={onTrainingPresetSaved}
            pickSlot={pickSlot}
            focusCount={focusCount}
            check={check}
            intensity={intensity}
            load={load}
            trainingUnlocks={trainingUnlocks}
            players={players}
            clubId={clubId}
            onPickSlot={setPickSlot}
            onPlanChange={onPlanChange}
            onIntensityChange={onIntensityChange}
            onSelectPlayer={onSelectPlayer}
            season={season}
            week={week}
          />
        </div>
      ) : null}
      {tab === "individual" ? (
        <div className="fm-tab-panel">
          <IndividualTrainingTab
            players={players}
            programs={individualPrograms}
            season={season}
            week={week}
            onProgramsChange={onProgramsChange}
            openPlayerId={focusIndividualPlayerId}
            onDismissOpenPlayer={onClearIndividualFocus}
          />
        </div>
      ) : null}
      </fieldset>
    </main>
  );
}

function TrainingIntensityStatus({
  intensity,
  load,
  onIntensityChange,
}: {
  intensity: number;
  load: TrainingLoadSummary;
  onIntensityChange: (value: number) => void;
}) {
  const activeValue = snapTrainingIntensityToPreset(intensity);
  return (
    <div className="training-status-row">
      <div className="training-intensity-presets" role="group" aria-label={t("training.intensity.aria")}>
        {TRAINING_INTENSITY_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={
              activeValue === preset.value
                ? "training-intensity-preset is-active"
                : "training-intensity-preset"
            }
            aria-pressed={activeValue === preset.value}
            onClick={() => onIntensityChange(preset.value)}
          >
            {t(preset.labelKey)}
          </button>
        ))}
      </div>
      <p
        className={`training-status-load is-${load.ampel}`}
        title={load.label}
        aria-label={t("training.overview.fatigueAria", { label: load.label })}
      >
        <span className={`pipeline-light ${fatigueAmpelClassName(load.ampel)}`} aria-hidden="true">
          {load.icon}
        </span>
        <span>{load.label}</span>
      </p>
    </div>
  );
}

function TeamPlan({
  plan,
  weekday,
  trainingUnitsCompleted,
  trainingUnitOutcomes,
  useTrainingUnitProgress,
  trainingPlanPresets,
  onTrainingPlanPresetsChange,
  onTrainingPresetNotice,
  onTrainingPresetLoaded,
  onTrainingPresetSaved,
  pickSlot,
  focusCount,
  check,
  intensity,
  load,
  trainingUnlocks,
  players,
  clubId,
  onPickSlot,
  onPlanChange,
  onIntensityChange,
  onSelectPlayer,
  season,
  week,
}: {
  plan: TrainingSlot[];
  weekday: number;
  trainingUnitsCompleted: number;
  trainingUnitOutcomes: (TrainingSlotOutcome | null)[];
  useTrainingUnitProgress: boolean;
  trainingPlanPresets: TrainingPlanPresetSlot[];
  onTrainingPlanPresetsChange: (presets: TrainingPlanPresetSlot[]) => void;
  onTrainingPresetNotice: (text: string, tone?: "ok" | "warn") => void;
  onTrainingPresetLoaded?: () => void;
  onTrainingPresetSaved?: () => void;
  pickSlot: number | null;
  focusCount: number;
  check: ReturnType<typeof validateWeeklyPlan>;
  intensity: number;
  load: ReturnType<typeof squadTrainingLoad>;
  trainingUnlocks: TrainingUnlocks;
  players: Player[];
  clubId: string;
  onPickSlot: (slot: number | null) => void;
  onPlanChange: (plan: TrainingSlot[]) => void;
  onIntensityChange: (intensity: number) => void;
  onSelectPlayer?: (playerId: string) => void;
  season: number;
  week: number;
}) {
  const mobileNarrow = useMobileNarrow();
  const heatmapFullLayout = mobileNarrow;
  const heatCells = useMemo(
    () => squadGrowthHeatmap(players, clubId, "weekSoFar", { season, week }),
    [players, clubId, season, week],
  );
  const nextSlotIndex = currentTrainingSlotIndex(trainingUnitsCompleted, useTrainingUnitProgress);
  const [outcomeModal, setOutcomeModal] = useState<TrainingSlotOutcome | null>(null);

  const coachPickSlotIndex = useMemo(
    () =>
      firstEmptySchedulableSlotIndex(
        plan,
        weekday,
        trainingUnitsCompleted,
        useTrainingUnitProgress,
      ),
    [plan, weekday, trainingUnitsCompleted, useTrainingUnitProgress],
  );
  const todayDayIndex = trainingDayIndexForWeekday(weekday);
  const { coachMarksEnabled, matchFlowActive } = useTutorialUi();
  const { session } = useGameSession();
  const activeCoachStepId = useMemo(
    () => activeTutorialStepId(session, "training", coachMarksEnabled, matchFlowActive),
    [session, coachMarksEnabled, matchFlowActive],
  );

  useEffect(() => {
    if (activeCoachStepId !== "training.set_plan") return;
    if (coachPickSlotIndex === null) return;
    if (pickSlot === coachPickSlotIndex) return;
    onPickSlot(coachPickSlotIndex);
  }, [activeCoachStepId, coachPickSlotIndex, pickSlot, onPickSlot]);

  useEffect(() => {
    if (nextSlotIndex === null) return;
    const node = document.querySelector<HTMLElement>(
      `[data-training-slot-index="${nextSlotIndex}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [nextSlotIndex]);

  return (
    <section className="training-team">
      <Hint text={t("training.schedule.hint")} block>
        <p className="training-rules">
          {t("training.schedule.meta", {
            days: TRAINING_DAYS.length,
            unitsPerDay: UNITS_PER_DAY,
            focus: focusCount,
            maxFocus: MAX_FOCUS_SLOTS,
          })}
          {!check.valid ? <span className="training-warn">{t("training.schedule.invalidPlan")}</span> : null}
        </p>
      </Hint>

      <TrainingIntensityStatus
        intensity={intensity}
        load={load}
        onIntensityChange={onIntensityChange}
      />

      <TrainingPlanPresetsBar
        presets={trainingPlanPresets}
        currentPlan={plan}
        loadBlocked={useTrainingUnitProgress && trainingUnitsCompleted > 0}
        onPresetsChange={onTrainingPlanPresetsChange}
        onPlanChange={onPlanChange}
        onNotice={onTrainingPresetNotice}
        onPresetLoaded={() => onTrainingPresetLoaded?.()}
        onPresetSaved={() => onTrainingPresetSaved?.()}
      />

      <div
        className={
          mobileNarrow ? "training-timetable-scroll is-mobile-week-stack" : "training-timetable-scroll"
        }
      >
      <div className="training-timetable" aria-label={t("training.timetable.aria")}>
        {TRAINING_DAYS.map((_day, dayIndex) => {
          const dayPast = isTrainingDayFullyPastForSession(
            dayIndex,
            weekday,
            trainingUnitsCompleted,
            useTrainingUnitProgress,
          );
          return (
          <div
            key={dayIndex}
            className={dayPast ? "training-day-column is-past" : "training-day-column"}
            {...(dayIndex === todayDayIndex
              ? { "data-coach-target": COACH_TARGET.trainingTodayColumn }
              : {})}
          >
            <p className="training-day-header">{trainingDayShortLabel(dayIndex)}</p>
            {Array.from({ length: UNITS_PER_DAY }, (_, period) => {
              const index = dayIndex * UNITS_PER_DAY + period;
              const slot = plan[index]!;
              const slotPast = isTrainingSlotPastForSession(
                index,
                weekday,
                trainingUnitsCompleted,
                useTrainingUnitProgress,
              );
              const slotCurrent = nextSlotIndex === index;
              return (
                <TrainingSlotCard
                  key={index}
                  slotIndex={index}
                  periodLabel={slotPeriodLabel(index)}
                  slot={slot}
                  past={slotPast}
                  current={slotCurrent}
                  active={pickSlot === index}
                  outcome={trainingSlotOutcomeAt(trainingUnitOutcomes, index)}
                  coachTarget={
                    index === coachPickSlotIndex ? COACH_TARGET.trainingPickSlot : undefined
                  }
                  onOpenPicker={() => {
                    if (!slotPast) onPickSlot(index);
                  }}
                  onShowOutcome={() => {
                    const outcome = trainingSlotOutcomeAt(trainingUnitOutcomes, index);
                    if (outcome) setOutcomeModal(outcome);
                  }}
                  onToggleFocus={() => onPlanChange(toggleFocus(plan, index))}
                  focusToggleDisabled={
                    slotPast ||
                    isTrainingSlotEmpty(slot) ||
                    (!slot.focus && !canSetFocus(plan, index))
                  }
                />
              );
            })}
          </div>
          );
        })}
      </div>
      </div>

      <div className="training-schedule-heatmap">
        <GrowthHeatmap
          cells={heatCells}
          compact={!heatmapFullLayout}
          mode="weekSoFar"
          onSelectPlayer={(playerId) => onSelectPlayer?.(playerId)}
        />
        <AttributeTrainingHeatmap
          players={players}
          clubId={clubId}
          season={season}
          week={week}
          trainingUnitsCompleted={trainingUnitsCompleted}
          compact={!heatmapFullLayout}
        />
      </div>

      {outcomeModal ? (
        <TrainingSlotOutcomeModal outcome={outcomeModal} onClose={() => setOutcomeModal(null)} />
      ) : null}

      {pickSlot !== null ? (
        <UnitPickerModal
          day={slotLabel(pickSlot)}
          trainingUnlocks={trainingUnlocks}
          onClose={() => onPickSlot(null)}
          onPick={(unitId) => {
            const next = [...plan];
            next[pickSlot] = { ...next[pickSlot]!, unitId };
            onPlanChange(next);
            onPickSlot(null);
          }}
        />
      ) : null}

      {!check.valid ? (
        <ul className="training-errors">
          {check.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function canSetFocus(plan: TrainingSlot[], index: number): boolean {
  const slot = plan[index];
  if (!slot || isTrainingSlotEmpty(slot)) return false;
  if (slot.focus) return true;
  const trial = plan.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, focus: true } : entry,
  );
  return validateWeeklyPlan(planToSessions(trial)).valid;
}

function toggleFocus(plan: TrainingSlot[], index: number): TrainingSlot[] {
  const slot = plan[index];
  if (!slot || isTrainingSlotEmpty(slot)) return plan;
  if (slot.focus) {
    const next = [...plan];
    next[index] = { ...slot, focus: false };
    return next;
  }
  if (!canSetFocus(plan, index)) return plan;
  const next = [...plan];
  next[index] = { ...slot, focus: true };
  return next;
}

function TrainingSlotOutcomeModal({
  outcome,
  onClose,
}: {
  outcome: TrainingSlotOutcome;
  onClose: () => void;
}) {
  useT();
  const unit = trainingUnit(outcome.unitId);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="training-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="training-modal training-slot-outcome-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("training.slot.outcomeDialogAria", { unit: unit.label })}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-modal-head">
          <div>
            <p className="eyebrow">{slotLabel(outcome.slotIndex)}</p>
            <h2>{unit.label}</h2>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label={t("shell.modal.close")}>
            ✕
          </button>
        </header>
        {outcome.gains.length === 0 ? (
          <p className="training-slot-outcome-empty">{t("training.slot.outcomeQuiet")}</p>
        ) : (
          <ul className="training-slot-outcome-list">
            {outcome.gains.map((gain) => (
              <li key={`${gain.playerId}-${gain.metric}`}>
                <strong>{gain.playerName}</strong>
                <span>
                  +{formatTrainingDelta(gain.delta)} {trainingHighlightLabel(gain.metric)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const SESSION_GROUPS: SessionGroup[] = ["technical", "physical", "mental"];

function UnitPickerModal({
  day,
  trainingUnlocks,
  onClose,
  onPick,
}: {
  day: string;
  trainingUnlocks: TrainingUnlocks;
  onClose: () => void;
  onPick: (unitId: string) => void;
}) {
  const tr = useT();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="training-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="training-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("training.slot.dialogAria", { day })}
        data-coach-target={COACH_TARGET.trainingUnitPicker}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-modal-head">
          <div>
            <p className="eyebrow">{day}</p>
            <h2>{tr("training.modal.pickTitle")}</h2>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label={t("shell.modal.close")}>
            ✕
          </button>
        </header>

        <div className="training-modal-columns">
          {SESSION_GROUPS.map((group) => (
            <section key={group} className="training-modal-col" aria-label={trainingGroupDisplayLabel(group)}>
              <h3>{trainingGroupDisplayLabel(group)}</h3>
              <ul>
                {TRAINING_UNITS.filter((unit) => unit.group === group).map((unit) => {
                  const unlocked = trainingUnitUnlocked(unit, trainingUnlocks);
                  const lockHint = trainingUnitLockHint(unit);
                  return (
                    <li key={unit.id}>
                      <button
                        type="button"
                        className={unlocked ? "training-modal-unit" : "training-modal-unit is-locked"}
                        disabled={!unlocked}
                        title={unlocked ? undefined : lockHint}
                        onClick={() => onPick(unit.id)}
                      >
                        <strong>{trainingUnitDisplayLabel(unit)}</strong>
                        <span>
                          {!unlocked
                            ? lockHint
                            : unit.fitnessRecoveryFraction !== undefined
                              ? trainingUnitPickerDetail(unit, true)
                              : unit.skills.map((skill) => attributeLabel(skill)).join(" · ")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
