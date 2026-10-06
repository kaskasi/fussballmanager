import { useEffect, useMemo, useState } from "react";
import { MapPinOff } from "lucide-react";
import {
  planToSessions,
  slotLabel,
  TRAINING_DAYS,
  TRAINING_UNITS,
  trainingUnit,
  trainingUnitUnlocked,
  type TrainingSlot,
} from "../../development/training-units.ts";
import { attributeLabel, growthPolyline, growthSeries } from "../player-profile.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  playerCa,
  seasonCaDelta,
} from "../../player/ca-tracking.ts";
import {
  MAX_FOCUS_PER_GROUP,
  MAX_FOCUS_SLOTS,
  SLOT_COUNT,
  validateWeeklyPlan,
  type SessionGroup,
} from "../../development/weekly-plan.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { RetrainPreviewPanel } from "../components/RetrainPreviewPanel.tsx";
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
  clampTrainingIntensity,
  fatigueAmpelClassName,
  squadTrainingLoad,
  TRAINING_INTENSITY_MAX,
  TRAINING_INTENSITY_MIN,
} from "../../development/training-load.ts";
import type { PositionPrimary } from "../../types/player.ts";
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";
import { squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type {
  AssistantDelegation,
  AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import { Target } from "lucide-react";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

type TrainingTab = "status" | "team" | "individual";

const GROUP_LABELS: Record<SessionGroup, string> = {
  technical: "Technik",
  physical: "Athletik",
  mental: "Mental",
};

/**
 * WIREFRAME: docs/prd/design.md §9.10 — Training
 *
 * Übersicht: Ampel · 🎯 Fokus · Heatmap Wochenzuwachs (02.1)
 * Team: Stundenplan (Mo–Fr, 5 Slots). Fokus-Modus per Checkbox.
 * Individuell: Extra-Programme pro Spieler (F2.3).
 */

export function TrainingCenter({
  week,
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
  hasTrainingHall = false,
  injuryRiskFactor = 1,
}: {
  week: number;
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
  hasTrainingHall?: boolean;
  injuryRiskFactor?: number;
}) {
  useT();
  const [tab, setTab] = useState<TrainingTab>("status");
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
    { id: "status", labelKey: "training.tab.overview" },
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

      {tab === "status" ? (
        <div className="fm-tab-panel">
          <TrainingOverview
            focusCount={focusCount}
            load={load}
            players={players}
            clubId={clubId}
            onOpenPlan={() => setTab("team")}
            onSelectPlayer={onSelectPlayer}
          />
        </div>
      ) : null}
      {tab === "team" ? (
        <div className="fm-tab-panel">
          <TeamPlan
            plan={plan}
            pickSlot={pickSlot}
            focusCount={focusCount}
            check={check}
            intensity={intensity}
            load={load}
            hasTrainingHall={hasTrainingHall}
            onPickSlot={setPickSlot}
            onPlanChange={onPlanChange}
            onIntensityChange={onIntensityChange}
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

function TrainingOverview({
  focusCount,
  load,
  players,
  clubId,
  onOpenPlan,
  onSelectPlayer,
}: {
  focusCount: number;
  load: ReturnType<typeof squadTrainingLoad>;
  players: Player[];
  clubId: string;
  onOpenPlan: () => void;
  onSelectPlayer?: (playerId: string) => void;
}) {
  useT();
  const heatCells = useMemo(() => squadGrowthHeatmap(players, clubId), [players, clubId]);
  const focusOpen = focusCount < MAX_FOCUS_SLOTS;

  return (
    <section className="training-overview">
      <div className="training-overview-strip">
        <p
          className={`training-fatigue is-${load.ampel}`}
          title={load.label}
          aria-label={t("training.overview.fatigueAria", { label: load.label })}
        >
          <span className={`pipeline-light ${fatigueAmpelClassName(load.ampel)}`} aria-hidden="true">
            {load.icon}
          </span>
          <span>{load.label}</span>
        </p>
        <p className="training-overview-focus">
          {t("training.overview.focus", { count: focusCount, max: MAX_FOCUS_SLOTS })}
        </p>
        <button type="button" className="training-overview-go" onClick={onOpenPlan}>
          {focusOpen
            ? t("training.overview.setFocus", { count: focusCount, max: MAX_FOCUS_SLOTS })
            : t("training.overview.openPlan")}
        </button>
      </div>
      <GrowthHeatmap
        cells={heatCells}
        onSelectPlayer={(playerId) => onSelectPlayer?.(playerId)}
      />
    </section>
  );
}

function TeamPlan({
  plan,
  pickSlot,
  focusCount,
  check,
  intensity,
  load,
  hasTrainingHall,
  onPickSlot,
  onPlanChange,
  onIntensityChange,
}: {
  plan: TrainingSlot[];
  pickSlot: number | null;
  focusCount: number;
  check: ReturnType<typeof validateWeeklyPlan>;
  intensity: number;
  load: ReturnType<typeof squadTrainingLoad>;
  hasTrainingHall: boolean;
  onPickSlot: (slot: number | null) => void;
  onPlanChange: (plan: TrainingSlot[]) => void;
  onIntensityChange: (intensity: number) => void;
}) {
  const [focusMode, setFocusMode] = useState(false);

  function handleSlotClick(index: number) {
    if (focusMode) {
      onPlanChange(toggleFocus(plan, index));
      return;
    }
    onPickSlot(index);
  }

  return (
    <section className="training-team">
      <Hint
        text="Klick auf eine Einheit öffnet den Katalog. Fokus-Modus aktivieren, dann Einheiten anklicken — max. 3 Fokus/Woche (PRD 02.4)."
        block
      >
        <p className="training-rules">
          {SLOT_COUNT} Trainingsslots (Mo–Fr) · {focusCount}/{MAX_FOCUS_SLOTS} Fokus · max. {MAX_FOCUS_PER_GROUP} Fokus pro Bereich
          {!check.valid ? <span className="training-warn"> · Plan ungültig</span> : null}
        </p>
      </Hint>

      <div className="training-controls">
        <label className="training-intensity">
          <span>Intensität {intensity}</span>
          <input
            type="range"
            min={TRAINING_INTENSITY_MIN}
            max={TRAINING_INTENSITY_MAX}
            step={5}
            value={intensity}
            onChange={(event) => onIntensityChange(clampTrainingIntensity(Number(event.target.value)))}
          />
        </label>
        <p
          className={`training-fatigue is-${load.ampel}`}
          title={load.label}
          aria-label={`Fatigue-Ampel: ${load.label}`}
        >
          <span className={`pipeline-light ${fatigueAmpelClassName(load.ampel)}`} aria-hidden="true">
            {load.icon}
          </span>
          <span>{load.label}</span>
        </p>
      </div>

      <label className="training-focus-mode">
        <input
          type="checkbox"
          checked={focusMode}
          onChange={(event) => {
            const next = event.target.checked;
            setFocusMode(next);
            if (next) onPickSlot(null);
          }}
        />
        <span>Fokus setzen</span>
      </label>
      {focusMode ? <p className="training-focus-hint">Einheit anklicken, um Fokus zu setzen oder zu entfernen.</p> : null}

      <div
        className={focusMode ? "training-week is-focus-mode" : "training-week"}
        aria-label="Wochenplan"
      >
        {plan.map((slot, index) => (
          <SlotCard
            key={index}
            period={TRAINING_DAYS[index] ?? slotLabel(index)}
            slot={slot}
            focusMode={focusMode}
            active={!focusMode && pickSlot === index}
            onSelect={() => handleSlotClick(index)}
          />
        ))}
      </div>

      {pickSlot !== null && !focusMode ? (
        <UnitPickerModal
          day={slotLabel(pickSlot)}
          hasTrainingHall={hasTrainingHall}
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
  if (!slot || slot.focus) return true;
  const trial = plan.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, focus: true } : entry,
  );
  return validateWeeklyPlan(planToSessions(trial)).valid;
}

function toggleFocus(plan: TrainingSlot[], index: number): TrainingSlot[] {
  const slot = plan[index];
  if (!slot) return plan;
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
  period,
  slot,
  focusMode,
  active,
  onSelect,
}: {
  period: string;
  slot: TrainingSlot;
  focusMode: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const unit = trainingUnit(slot.unitId);
  const className = [
    "training-slot",
    slot.focus ? "is-focus" : "",
    active ? "is-active" : "",
    focusMode ? "is-focus-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <button
        type="button"
        className="training-slot-main"
        onClick={onSelect}
        aria-pressed={focusMode ? slot.focus : undefined}
      >
        {slot.focus ? (
          <span className="training-focus-badge" aria-hidden="true">
            <Target size={14} strokeWidth={2.5} />
          </span>
        ) : null}
        <span className="training-day">{period}</span>
        <strong className="training-unit-name">{unit.label}</strong>
        <span className="training-group">{GROUP_LABELS[unit.group]}</span>
        <span className="training-skills">
          {unit.skills.map((skill) => attributeLabel(skill)).join(" · ")}
        </span>
      </button>
    </article>
  );
}

const SESSION_GROUPS: SessionGroup[] = ["technical", "physical", "mental"];

function UnitPickerModal({
  day,
  hasTrainingHall,
  onClose,
  onPick,
}: {
  day: string;
  hasTrainingHall: boolean;
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
        aria-label={`Trainingseinheit für ${day}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="training-modal-head">
          <div>
            <p className="eyebrow">{day}</p>
            <h2>Trainingseinheit wählen</h2>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </header>

        <div className="training-modal-columns">
          {SESSION_GROUPS.map((group) => (
            <section key={group} className="training-modal-col" aria-label={GROUP_LABELS[group]}>
              <h3>{GROUP_LABELS[group]}</h3>
              <ul>
                {TRAINING_UNITS.filter((unit) => unit.group === group).map((unit) => {
                  const unlocked = trainingUnitUnlocked(unit, { hasTrainingHall });
                  return (
                    <li key={unit.id}>
                      <button
                        type="button"
                        className={unlocked ? "training-modal-unit" : "training-modal-unit is-locked"}
                        disabled={!unlocked}
                        title={unlocked ? undefined : "Braucht Trainings-Halle"}
                        onClick={() => onPick(unit.id)}
                      >
                        <strong>{unit.label}</strong>
                        <span>
                          {unlocked
                            ? unit.skills.map((skill) => attributeLabel(skill)).join(" · ")
                            : "Braucht Trainings-Halle"}
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
                  <span>{player.position} · {ca}</span>
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
        aria-label={`Individuelles Training für ${formatPlayerName(player)}`}
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
              <p className="eyebrow">{player.position} · {player.age} J.</p>
              <h2>{formatPlayerName(player)}</h2>
            </div>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label="Schließen">
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

