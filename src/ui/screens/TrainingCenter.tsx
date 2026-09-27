import { useEffect, useMemo, useState } from "react";
import {
  planToSessions,
  slotLabel,
  TRAINING_DAYS,
  TRAINING_UNITS,
  trainingUnit,
  type TrainingSlot,
} from "../../development/training-units.ts";
import { attributeLabel } from "../player-profile.ts";
import {
  MAX_FOCUS_PER_GROUP,
  MAX_FOCUS_SLOTS,
  SLOT_COUNT,
  validateWeeklyPlan,
  type SessionGroup,
} from "../../development/weekly-plan.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { Hint } from "../components/Hint.tsx";

type TrainingTab = "team" | "individual";

const GROUP_LABELS: Record<SessionGroup, string> = {
  technical: "Technik",
  physical: "Athletik",
  mental: "Mental",
};

/**
 * WIREFRAME: PRD 09.2 Screen 1 + 1a — Training
 *
 * Team: Wochenplan (Mo–Fr, 5 Slots). Fokus-Modus per Checkbox, Klick markiert Einheit.
 * Individuell: Extra-Programme pro Spieler (F2.3 Stub bis M2).
 */

export function TrainingCenter({
  week,
  plan,
  onPlanChange,
  players,
  onBack,
}: {
  week: number;
  plan: TrainingSlot[];
  onPlanChange: (plan: TrainingSlot[]) => void;
  players: Player[];
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<TrainingTab>("team");
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const check = useMemo(() => validateWeeklyPlan(planToSessions(plan)), [plan]);
  const focusCount = plan.filter((slot) => slot.focus).length;

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
      </nav>

      {tab === "team" ? (
        <TeamPlan
          plan={plan}
          pickSlot={pickSlot}
          focusCount={focusCount}
          check={check}
          onPickSlot={setPickSlot}
          onPlanChange={onPlanChange}
        />
      ) : (
        <IndividualPlan players={players} />
      )}
    </main>
  );
}

function TeamPlan({
  plan,
  pickSlot,
  focusCount,
  check,
  onPickSlot,
  onPlanChange,
}: {
  plan: TrainingSlot[];
  pickSlot: number | null;
  focusCount: number;
  check: ReturnType<typeof validateWeeklyPlan>;
  onPickSlot: (slot: number | null) => void;
  onPlanChange: (plan: TrainingSlot[]) => void;
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
  onClose,
  onPick,
}: {
  day: string;
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
                {TRAINING_UNITS.filter((unit) => unit.group === group).map((unit) => (
                  <li key={unit.id}>
                    <button type="button" className="training-modal-unit" onClick={() => onPick(unit.id)}>
                      <strong>{unit.label}</strong>
                      <span>{unit.skills.map((skill) => attributeLabel(skill)).join(" · ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndividualPlan({ players }: { players: Player[] }) {
  const roster = players.filter((player) => player.squad_status !== "loaned_out");
  return (
    <section className="training-individual">
      <Hint
        text="Individuelle Extra-Einheiten (schwaches Bein, Position umbauen) kommen mit F2.3 in M2. Hier siehst du schon, wer ein Programm hätte."
        block
      >
        <p className="training-rules">Extra-Programme pro Spieler · wirken zusätzlich zum Team-Stundenplan</p>
      </Hint>
      <ul className="training-roster">
        {roster.map((player) => (
          <li key={player.id}>
            <span className="training-roster-name">{formatPlayerName(player)}</span>
            <span className="training-roster-meta">{player.position} · {player.age} J.</span>
            <span className="training-roster-program">Kein Programm · Stub (F2.3)</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

