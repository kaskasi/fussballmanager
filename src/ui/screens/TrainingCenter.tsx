import { useEffect, useMemo, useState } from "react";
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
import {
  assignIndividualProgram,
  cancelIndividualProgram,
  canAssignIndividualProgram,
  eligibleRetrainPositions,
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
import {
  clampTrainingIntensity,
  fatigueAmpelClassName,
  squadTrainingLoad,
  TRAINING_INTENSITY_MAX,
  TRAINING_INTENSITY_MIN,
} from "../../development/training-load.ts";
import type { PositionPrimary } from "../../types/player.ts";
import { AssistantDelegationPanel } from "../components/AssistantDelegationPanel.tsx";
import { CoachingStaffPanel } from "../components/CoachingStaffPanel.tsx";
import { MentoringPanel } from "../components/MentoringPanel.tsx";
import { FitnessManagementPanel } from "../components/FitnessManagementPanel.tsx";
import { Hint } from "../components/Hint.tsx";
import { GrowthHeatmap } from "../components/GrowthHeatmap.tsx";
import { squadGrowthHeatmap } from "../../player/growth-heatmap.ts";
import type { Coach, CoachingStaff } from "../../staff/coaching-staff.ts";
import type {
  AssistantDelegation,
  AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";

type TrainingTab = "overview" | "team" | "individual" | "mentoring" | "coaches" | "fitness";

const GROUP_LABELS: Record<SessionGroup, string> = {
  technical: "Technik",
  physical: "Athletik",
  mental: "Mental",
};

/**
 * WIREFRAME: PRD 09.2 Screen 1 + 1a — Training
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
  onBack,
  focusIndividualPlayerId = null,
  hasTrainingHall = false,
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
  onBack?: () => void;
  /** Öffnet Tab „Individuell“ und Programm-Modal für diesen Spieler (z. B. aus Spielerakte). */
  focusIndividualPlayerId?: string | null;
  hasTrainingHall?: boolean;
}) {
  const [tab, setTab] = useState<TrainingTab>("overview");
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

  return (
    <main className="training">
      <header className="training-head">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
            ←
          </button>
        ) : null}
        <div>
          <p className="eyebrow">Woche {week}</p>
          <h1>🏋️ Training</h1>
        </div>
      </header>

      <nav className="training-tabs" aria-label="Trainingsarten">
        <button type="button" className={tab === "overview" ? "training-tab is-active" : "training-tab"} onClick={() => setTab("overview")}>
          Übersicht · Heatmap
        </button>
        <button type="button" className={tab === "team" ? "training-tab is-active" : "training-tab"} onClick={() => setTab("team")}>
          Team · Stundenplan
        </button>
        <button
          type="button"
          className={tab === "individual" ? "training-tab is-active" : "training-tab"}
          onClick={() => setTab("individual")}
        >
          Individuell · Extra
        </button>
        <button
          type="button"
          className={tab === "mentoring" ? "training-tab is-active" : "training-tab"}
          onClick={() => setTab("mentoring")}
        >
          Mentoring
        </button>
        <button
          type="button"
          className={tab === "coaches" ? "training-tab is-active" : "training-tab"}
          onClick={() => setTab("coaches")}
        >
          Trainer · Stab
        </button>
        <button
          type="button"
          className={tab === "fitness" ? "training-tab is-active" : "training-tab"}
          onClick={() => setTab("fitness")}
        >
          Fitness · Belastung
        </button>
      </nav>

      {tab === "overview" ? (
        <TrainingOverview
          focusCount={focusCount}
          load={load}
          players={players}
          clubId={clubId}
          onOpenPlan={() => setTab("team")}
          onSelectPlayer={onSelectPlayer}
        />
      ) : tab === "team" ? (
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
      ) : tab === "individual" ? (
        <IndividualPlan
          players={players}
          programs={individualPrograms}
          season={season}
          week={week}
          onProgramsChange={onProgramsChange}
          openPlayerId={focusIndividualPlayerId}
        />
      ) : tab === "mentoring" ? (
        <MentoringPanel
          players={players}
          clubId={clubId}
          season={season}
          week={week}
          onAssignMentor={onAssignMentor}
          onClearMentor={onClearMentor}
        />
      ) : tab === "coaches" ? (
        <>
          <AssistantDelegationPanel
            assistantName={assistantName}
            staff={coachingStaff}
            delegation={assistantDelegation}
            onChange={onAssistantDelegationChange}
          />
          <CoachingStaffPanel
            staff={coachingStaff}
            season={season}
            week={week}
            masterSeed={masterSeed}
            cash={cash}
            onHire={onHireCoach}
          />
        </>
      ) : (
        <FitnessManagementPanel players={players} clubId={clubId} intensity={intensity} />
      )}
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
  const heatCells = useMemo(() => squadGrowthHeatmap(players, clubId), [players, clubId]);
  const focusOpen = focusCount < MAX_FOCUS_SLOTS;

  return (
    <section className="training-overview">
      <div className="training-overview-strip">
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
        <p className="training-overview-focus">
          🎯 {focusCount}/{MAX_FOCUS_SLOTS} Fokus
        </p>
        <button type="button" className="training-overview-go" onClick={onOpenPlan}>
          {focusOpen ? `Fokus setzen · ${focusCount}/${MAX_FOCUS_SLOTS}` : "Stundenplan öffnen"}
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
        {slot.focus ? <span className="training-focus-badge" aria-hidden="true">🎯</span> : null}
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
}: {
  players: Player[];
  programs: IndividualProgram[];
  season: number;
  week: number;
  onProgramsChange: (programs: IndividualProgram[]) => void;
  openPlayerId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roster = players.filter((player) => player.squad_status !== "loaned_out");
  const selected = roster.find((player) => player.id === selectedId) ?? null;

  useEffect(() => {
    if (!openPlayerId) return;
    const exists = roster.some((player) => player.id === openPlayerId);
    if (exists) setSelectedId(openPlayerId);
  }, [openPlayerId, roster]);

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
          onClose={() => setSelectedId(null)}
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
  const [kind, setKind] = useState<IndividualProgramKind>(active?.kind ?? "weak_foot");
  const [weeks, setWeeks] = useState(active?.weeksRemaining ?? 8);
  const [targetPosition, setTargetPosition] = useState<PositionPrimary>(
    active?.targetPosition ?? eligibleRetrainPositions(player)[0] ?? "AM",
  );
  const tired = playerFatigueWarning(player);
  const check = canAssignIndividualProgram(player, kind, programs, targetPosition);

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
      const next = assignIndividualProgram(programs, player, kind, weeks, season, week, targetPosition);
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
          <div>
            <p className="eyebrow">{player.position} · {player.age} J.</p>
            <h2>{formatPlayerName(player)}</h2>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </header>

        <div className="training-individual-body">
          <p className="training-individual-stats">
            Schwaches Bein {player.attributes.weak_foot}/100
            {player.flexibility.length > 0
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
            <select value={kind} onChange={(event) => setKind(event.target.value as IndividualProgramKind)}>
              <option value="weak_foot">{programKindLabel("weak_foot")}</option>
              <option value="position_retrain">{programKindLabel("position_retrain")}</option>
            </select>
          </label>

          {kind === "position_retrain" ? (
            <label className="training-individual-field">
              <span>Zielposition</span>
              <select
                value={targetPosition}
                onChange={(event) => setTargetPosition(event.target.value as PositionPrimary)}
              >
                {eligibleRetrainPositions(player).map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </label>
          ) : null}

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

