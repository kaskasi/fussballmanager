/**
 * WIREFRAME: PRD 09.3b — Training timetable; header NEXT runs units (toast), not calendar days.
 */
import { useEffect, useMemo, useState } from "react";
import { MapPinOff } from "lucide-react";
import {
  planToSessions,
  slotLabel,
  slotPeriodLabel,
  TRAINING_DAYS,
  TRAINING_UNITS,
  UNITS_PER_DAY,
  currentTrainingSlotIndex,
  isTrainingDayFullyPastForSession,
  isTrainingSlotEmpty,
  isTrainingSlotPastForSession,
  trainingUnit,
  trainingUnitLockHint,
  trainingUnitPickerDetail,
  trainingUnitUnlocked,
  type TrainingSlot,
  type TrainingUnlocks,
} from "../../development/training-units.ts";
import { attributeLabel, growthPolyline, growthSeries } from "../player-profile.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  playerCa,
  seasonCaDelta,
} from "../../player/ca-tracking.ts";
import {
  MAX_FOCUS_SLOTS,
  SLOT_COUNT,
  validateWeeklyPlan,
  type SessionGroup,
} from "../../development/weekly-plan.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import { RetrainPreviewPanel } from "../components/RetrainPreviewPanel.tsx";
import { TrainingPlanPresetsBar } from "../components/TrainingPlanPresetsBar.tsx";
import type { TrainingPlanPresetSlot } from "../../development/training-plan-presets.ts";
import { ScreenEmptyState } from "../components/ScreenEmptyState.tsx";
import {
  assignIndividualProgram,
  cancelIndividualProgram,
  canAssignIndividualProgram,
  eligibleRetrainPositions,
  eligibleTrainStamps,
  MAX_INDIVIDUAL_PROGRAMS,
  MAX_PROGRAM_WEEKS,
  MIN_PROGRAM_WEEKS,
  programForPlayer,
  programKindLabel,
  programLabel,
  playerFatigueWarning,
  type IndividualProgram,
  type IndividualProgramKind,
} from "../../development/individual-training.ts";
import { stampDefinition } from "../../development/ability-stamps.ts";
import {
  fatigueAmpelClassName,
  squadTrainingLoad,
  snapTrainingIntensityToPreset,
  TRAINING_INTENSITY_PRESETS,
  type TrainingLoadSummary,
} from "../../development/training-load.ts";
import type { PositionPrimary } from "../../types/player.ts";
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { AttributeTrainingHeatmap } from "../components/AttributeTrainingHeatmap.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";
import { squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type {
  AssistantDelegation,
  AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import { ChartNoAxesColumn, Target } from "lucide-react";
import {
  formatTrainingDelta,
  trainingSlotOutcomeAt,
  type TrainingHighlightMetric,
  type TrainingSlotOutcome,
} from "../../development/training-unit-result.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";

type TrainingTab = "team" | "individual";

const GROUP_LABELS: Record<SessionGroup, string> = {
  technical: "Technik",
  physical: "Athletik",
  mental: "Mental",
};

function trainingHighlightLabel(metric: TrainingHighlightMetric): string {
  if (metric === "fitness") return "Fitness";
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
  cash,
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
  trainingPlanPresets,
  onTrainingPlanPresetsChange,
  onTrainingPresetNotice,
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
  cash: number;
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
  trainingPlanPresets: TrainingPlanPresetSlot[];
  onTrainingPlanPresetsChange: (presets: TrainingPlanPresetSlot[]) => void;
  onTrainingPresetNotice: (text: string, tone?: "ok" | "warn") => void;
  trainingAutoNext?: boolean;
  onStopTrainingAutoNext?: () => void;
}) {
  const tr = useT();
  const [tab, setTab] = useState<TrainingTab>("team");
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
      <div className="fm-tab-bar" role="tablist" aria-label={t("training.tabs.aria")}>
        {trainingTabs.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

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
          <IndividualPlan
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
      />

      <div className="training-timetable-scroll">
      <div className="training-timetable" aria-label={t("training.timetable.aria")}>
        {TRAINING_DAYS.map((day, dayIndex) => {
          const dayPast = isTrainingDayFullyPastForSession(
            dayIndex,
            weekday,
            trainingUnitsCompleted,
            useTrainingUnitProgress,
          );
          return (
          <div key={day} className={dayPast ? "training-day-column is-past" : "training-day-column"}>
            <p className="training-day-header">{day}</p>
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
                <SlotCard
                  key={index}
                  slotIndex={index}
                  periodLabel={slotPeriodLabel(index)}
                  slot={slot}
                  past={slotPast}
                  current={slotCurrent}
                  active={pickSlot === index}
                  outcome={trainingSlotOutcomeAt(trainingUnitOutcomes, index)}
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

function SlotCard({
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
      <button type="button" className="training-slot-main" disabled={past} onClick={onOpenPicker}>
        <span className="training-period">{periodLabel}</span>
        {empty ? (
          <>
            <strong className="training-unit-name training-unit-name--empty">{t("training.slot.empty")}</strong>
            <span className="training-group training-group--muted">{t("training.slot.emptyHint")}</span>
          </>
        ) : (
          <>
            <strong className="training-unit-name">{unit!.label}</strong>
            <span className="training-group">{GROUP_LABELS[unit!.group]}</span>
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
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-modal-head">
          <div>
            <p className="eyebrow">{day}</p>
            <h2>Trainingseinheit wählen</h2>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label={t("shell.modal.close")}>
            ✕
          </button>
        </header>

        <div className="training-modal-columns">
          {SESSION_GROUPS.map((group) => (
            <section key={group} className="training-modal-col" aria-label={GROUP_LABELS[group]}>
              <h3>{GROUP_LABELS[group]}</h3>
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
                        <strong>{unit.label}</strong>
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

function IndividualPlan({
  players,
  programs,
  season,
  week,
  onProgramsChange,
  openPlayerId = null,
  onDismissOpenPlayer,
}: {
  players: Player[];
  programs: IndividualProgram[];
  season: number;
  week: number;
  onProgramsChange: (programs: IndividualProgram[]) => void;
  openPlayerId?: string | null;
  onDismissOpenPlayer?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roster = players.filter((player) => player.squad_status !== "loaned_out");
  const selected = roster.find((player) => player.id === selectedId) ?? null;

  useEffect(() => {
    if (!openPlayerId) return;
    setSelectedId(openPlayerId);
  }, [openPlayerId]);

  function closeModal() {
    setSelectedId(null);
    onDismissOpenPlayer?.();
  }

  return (
    <section className="training-individual">
      <Hint
        text="Extra-Programme wirken zusätzlich zum Team-Plan. Max. 3 gleichzeitig · ab kommender Woche."
        block
      >
        <p className="training-rules">
          {programs.length}/{MAX_INDIVIDUAL_PROGRAMS} Programme aktiv · Klick auf Spieler zum Planen
        </p>
      </Hint>
      <ul className="training-roster">
        {roster.map((player) => {
          const program = programForPlayer(programs, player.id);
          const growth = growthSeries(player, season);
          const ca = playerCa(player);
          const seasonDelta = seasonCaDelta(player, season);
          const sparkStroke =
            seasonDelta === null || seasonDelta === 0
              ? "#94a3b8"
              : seasonDelta > 0
                ? "#059669"
                : "#dc2626";
          return (
            <li key={player.id}>
              <button type="button" className="training-roster-row" onClick={() => setSelectedId(player.id)}>
                <span className="training-roster-name">{formatPlayerName(player)}</span>
                <span className="training-roster-spark" aria-hidden="true">
                  <svg viewBox="0 0 64 24" role="presentation">
                    <polyline
                      points={growthPolyline(growth, 64, 24)}
                      fill="none"
                      stroke={sparkStroke}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="training-roster-meta">
                  <span>{formatPlayerPositionLabel(player)} · {ca}</span>
                  <span
                    className={caDeltaClassName(seasonDelta)}
                    title="CA Δ diese Saison"
                  >
                    {formatCaDelta(seasonDelta)}
                  </span>
                </span>
                <span className={program ? "training-roster-program is-active" : "training-roster-program"}>
                  {program ? programLabel(program) : "Kein Programm"}
                </span>
                {playerFatigueWarning(player) ? (
                  <span className="training-roster-fatigue" title="Erhöhte Ermüdung — Extra-Training riskant">
                    ⚡
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {selected ? (
        <IndividualProgramModal
          player={selected}
          programs={programs}
          season={season}
          week={week}
          onClose={closeModal}
          onProgramsChange={onProgramsChange}
        />
      ) : null}
    </section>
  );
}

function IndividualProgramModal({
  player,
  programs,
  season,
  week,
  onClose,
  onProgramsChange,
}: {
  player: Player;
  programs: IndividualProgram[];
  season: number;
  week: number;
  onClose: () => void;
  onProgramsChange: (programs: IndividualProgram[]) => void;
}) {
  const active = programForPlayer(programs, player.id);
  const trainStamps = eligibleTrainStamps(player);
  const [kind, setKind] = useState<IndividualProgramKind>(active?.kind ?? "weak_foot");
  const [stampId, setStampId] = useState<string>(
    active?.stampId ?? trainStamps[0]?.id ?? "",
  );
  const [weeks, setWeeks] = useState(active?.weeksRemaining ?? 8);
  const retrainTargets = useMemo(() => eligibleRetrainPositions(player), [player]);
  const [targetPosition, setTargetPosition] = useState<PositionPrimary>(
    active?.targetPosition ?? retrainTargets[0] ?? "AM",
  );
  useEffect(() => {
    if (retrainTargets.length > 0 && !retrainTargets.includes(targetPosition)) {
      setTargetPosition(retrainTargets[0]!);
    }
  }, [retrainTargets, targetPosition]);
  const tired = playerFatigueWarning(player);
  const check = canAssignIndividualProgram(player, kind, programs, targetPosition, stampId);
  const stampWeeks = kind === "stamp" ? (stampDefinition(stampId)?.weeks ?? weeks) : weeks;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleAssign() {
    if (!check.ok) return;
    try {
      const next = assignIndividualProgram(
        programs,
        player,
        kind,
        stampWeeks,
        season,
        week,
        targetPosition,
        kind === "stamp" ? stampId : undefined,
      );
      onProgramsChange(next);
      onClose();
    } catch {
      // validation surfaced in UI
    }
  }

  function handleCancel() {
    onProgramsChange(cancelIndividualProgram(programs, player.id));
    onClose();
  }

  return (
    <div className="training-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="training-modal training-modal-individual"
        role="dialog"
        aria-modal="true"
        aria-label={t("training.individual.dialogAria", { name: formatPlayerName(player) })}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-modal-head">
          <div className="training-modal-identity">
            <PlayerPortrait
              seed={player.portrait_seed}
              size="lg"
              className="training-modal-portrait"
            />
            <div>
              <p className="eyebrow">{formatPlayerPositionLabel(player)} · {player.age} J.</p>
              <h2>{formatPlayerName(player)}</h2>
            </div>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label={t("shell.modal.close")}>
            ✕
          </button>
        </header>

        <div className="training-individual-body">
          <p className="training-individual-stats">
            Schwaches Bein {Math.round(player.attributes.weak_foot)}/100
            {kind !== "position_retrain" && player.flexibility.length > 0
              ? ` · Flex ${player.flexibility.map((slot) => `${slot.trained_as} ${Math.round(slot.proficiency * 100)}%`).join(", ")}`
              : ""}
          </p>

          {tired ? (
            <p className="training-individual-warn" role="status">
              ⚡ Erhöhte Ermüdung — Extra-Einheit erhöht Belastung
            </p>
          ) : null}

          <label className="training-individual-field">
            <span>Programm</span>
            <select
              value={kind}
              onChange={(event) => {
                const nextKind = event.target.value as IndividualProgramKind;
                setKind(nextKind);
                if (nextKind === "stamp" && !stampId && trainStamps[0]) {
                  setStampId(trainStamps[0].id);
                }
              }}
            >
              <option value="weak_foot">{programKindLabel("weak_foot")}</option>
              <option value="position_retrain">{programKindLabel("position_retrain")}</option>
              <option value="stamp" disabled={trainStamps.length === 0}>
                {programKindLabel("stamp")}
                {trainStamps.length === 0 ? " (keine freigeschaltet)" : ""}
              </option>
            </select>
          </label>

          {kind === "position_retrain" && retrainTargets.length === 0 ? (
            <ScreenEmptyState
              icon={MapPinOff}
              title="Keine Umbau-Ziele mehr"
              hint="Das hatten wir doch schon versucht — für manche Positionen passt es offenbar nicht."
            />
          ) : null}

          {kind === "position_retrain" && retrainTargets.length > 0 ? (
            <>
              <label className="training-individual-field">
                <span>Zielposition</span>
                <select
                  value={targetPosition}
                  onChange={(event) => setTargetPosition(event.target.value as PositionPrimary)}
                >
                  {retrainTargets.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>
              <RetrainPreviewPanel player={player} targetPosition={targetPosition} weeks={weeks} />
            </>
          ) : null}

          {kind === "stamp" ? (
            <label className="training-individual-field">
              <span>Stempel</span>
              <select value={stampId} onChange={(event) => setStampId(event.target.value)}>
                {trainStamps.map((stamp) => (
                  <option key={stamp.id} value={stamp.id}>
                    {stamp.icon} {stamp.label}
                    {stamp.path === "hybrid" ? " · Hybrid" : ""} · {stamp.weeks ?? "?"} Wo.
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "stamp" ? (
            <p className="training-individual-stats">Dauer fix {stampWeeks} Wochen (Katalog)</p>
          ) : (
            <label className="training-individual-field">
              <span>Dauer {weeks} Wochen</span>
              <input
                type="range"
                min={MIN_PROGRAM_WEEKS}
                max={MAX_PROGRAM_WEEKS}
                step={1}
                value={weeks}
                onChange={(event) => setWeeks(Number(event.target.value))}
              />
            </label>
          )}

          {!check.ok ? <p className="training-individual-error">{check.reason}</p> : null}

          <div className="training-individual-actions">
            {active ? (
              <button type="button" className="training-individual-cancel" onClick={handleCancel}>
                Programm beenden
              </button>
            ) : null}
            <button type="button" className="training-individual-confirm" onClick={handleAssign} disabled={!check.ok}>
              {active ? "Programm aktualisieren" : "Ab nächster Woche starten"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

