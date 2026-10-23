/**
 * WIREFRAME: PRD 09.2 Screen 1a — Individual training as a slot grid (ADR 0002).
 * Header: slots used and where they come from. Grid: one card per slot (taken, free, locked).
 * Results: finished programs, newest first. The full squad only appears in the picker.
 */
import { useEffect, useMemo, useState } from "react";
import { Lock, MapPinOff, Plus, Zap } from "lucide-react";
import { stampDefinition } from "../../../development/ability-stamps.ts";
import {
  assignIndividualProgram,
  cancelIndividualProgram,
  canAssignIndividualProgram,
  eligibleIndividualAttributes,
  eligibleRetrainPositions,
  eligibleTrainStamps,
  MAX_PROGRAM_WEEKS,
  MIN_PROGRAM_WEEKS,
  playerFatigueWarning,
  programForPlayer,
  programKindLabel,
  type IndividualProgram,
  type IndividualProgramKind,
  type IndividualProgramResult,
} from "../../../development/individual-training.ts";
import {
  INDIVIDUAL_SLOTS_CAP,
  individualTrainingSlots,
  type IndividualSlots,
  type SlotPart,
  type SlotUnlock,
} from "../../../development/individual-training-capacity.ts";
import { previewSuccessPercent } from "../../../development/position-retrain-roll.ts";
import { t } from "../../../i18n/index.ts";
import { formatDecimal } from "../../../i18n/number-display.ts";
import { useT } from "../../../i18n/react.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  playerCa,
  seasonCaDelta,
} from "../../../player/ca-tracking.ts";
import type { Attributes, Player, PositionPrimary } from "../../../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../../types/player-display.ts";
import { Hint } from "../../components/Hint.tsx";
import { PlayerPortrait } from "../../components/PlayerPortrait.tsx";
import { RetrainPreviewPanel } from "../../components/RetrainPreviewPanel.tsx";
import { ScreenEmptyState } from "../../components/ScreenEmptyState.tsx";
import { ModalShell } from "../../components/primitives/ModalShell.tsx";
import { attributeLabel, growthPolyline, growthSeries } from "../../player-profile.ts";
import { useGameSession } from "../../session/GameSessionContext.tsx";

const RESULTS_SHOWN = 8;

export function IndividualTrainingTab({
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
  const tr = useT();
  const { session } = useGameSession();
  const slots = useMemo(
    () => individualTrainingSlots(session.stadium.precinct, session.coachingStaff),
    [session.stadium.precinct, session.coachingStaff],
  );
  const history = session.individualHistory ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const roster = players.filter((player) => player.squad_status !== "loaned_out");
  const selected = roster.find((player) => player.id === selectedId) ?? null;
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  useEffect(() => {
    if (!openPlayerId) return;
    setSelectedId(openPlayerId);
  }, [openPlayerId]);

  function closeModal() {
    setSelectedId(null);
    onDismissOpenPlayer?.();
  }

  const free = Math.max(0, slots.total - programs.length);
  const locked = slotsToShowLocked(slots);

  return (
    <section className="training-solo">
      <header className="tc-panel training-solo__head">
        <div className="training-solo__count">
          <span className="tc-label">{tr("training.individual.title")}</span>
          <Hint text={tr("training.individual.rulesHint")}>
            <span className="training-solo__used">
              {tr("training.individual.slotsUsed", { used: programs.length, total: slots.total })}
            </span>
          </Hint>
        </div>
        <SlotBreakdown slots={slots} />
      </header>

      {programs.length > slots.total ? (
        <p className="tc-callout tc-callout--warn" role="status">
          {tr("training.individual.overCapacity")}
        </p>
      ) : null}

      <ul className="training-solo__grid" aria-label={tr("training.individual.title")}>
        {programs.map((program) => {
          const player = byId.get(program.playerId);
          if (!player) return null;
          return (
            <li key={program.playerId}>
              <TakenSlot player={player} program={program} onOpen={() => setSelectedId(player.id)} />
            </li>
          );
        })}
        {Array.from({ length: free }, (_, index) => (
          <li key={`free_${index}`}>
            <button type="button" className="training-solo__slot training-solo__slot--free" onClick={() => setPicking(true)}>
              <Plus className="tc-icon" aria-hidden />
              <span className="training-solo__free-title">{tr("training.individual.assign")}</span>
              <span className="tc-caption">{tr("training.individual.freeSlot")}</span>
            </button>
          </li>
        ))}
        {locked.map((unlock, index) => (
          <li key={`locked_${index}`}>
            <div className="training-solo__slot training-solo__slot--locked">
              <Lock className="tc-icon" aria-hidden />
              <span className="training-solo__free-title">{tr("training.individual.lockedSlot")}</span>
              <span className="tc-caption">{unlockLabel(unlock)}</span>
            </div>
          </li>
        ))}
      </ul>

      <section className="tc-panel training-solo__results">
        <h3 className="tc-panel__title">{tr("training.individual.results")}</h3>
        {history.length === 0 ? (
          <p className="tc-caption">{tr("training.individual.resultsEmpty")}</p>
        ) : (
          <ul className="training-solo__result-list">
            {history.slice(0, RESULTS_SHOWN).map((result, index) => (
              <ResultRow key={`${result.playerId}_${result.season}_${result.endedWeek}_${index}`} result={result} player={byId.get(result.playerId)} />
            ))}
          </ul>
        )}
      </section>

      {picking ? (
        <PlayerPicker
          roster={roster.filter((player) => !programForPlayer(programs, player.id))}
          season={season}
          onClose={() => setPicking(false)}
          onPick={(playerId) => {
            setPicking(false);
            setSelectedId(playerId);
          }}
        />
      ) : null}

      {selected ? (
        <IndividualProgramModal
          player={selected}
          programs={programs}
          maxSlots={slots.total}
          season={season}
          week={week}
          onClose={closeModal}
          onProgramsChange={onProgramsChange}
        />
      ) : null}
    </section>
  );
}

/** Locked cards show what unlocks the next slots, never beyond the cap. */
function slotsToShowLocked(slots: IndividualSlots): SlotUnlock[] {
  const room = Math.max(0, INDIVIDUAL_SLOTS_CAP - slots.total);
  return slots.next.slice(0, room);
}

function partLabel(part: SlotPart): string {
  if (part.source === "base") return t("training.individual.part.base");
  if (part.source === "training_centre") return t("training.individual.part.trainingCentre", { level: part.level ?? 1 });
  if (part.source === "training_pitch") return t("training.individual.part.trainingPitch", { level: part.level ?? 1 });
  return t("training.individual.part.coaches");
}

function unlockLabel(unlock: SlotUnlock): string {
  if (unlock.source === "training_centre") return t("training.individual.unlock.trainingCentre", { level: unlock.level ?? 1 });
  if (unlock.source === "training_pitch") return t("training.individual.unlock.trainingPitch", { level: unlock.level ?? 2 });
  return t("training.individual.unlock.coaches");
}

function SlotBreakdown({ slots }: { slots: IndividualSlots }) {
  const tr = useT();
  return (
    <div className="training-solo__sources">
      <ul className="tc-chips" aria-label={tr("training.individual.slotsHow")}>
        {slots.parts.map((part) => (
          <li key={part.source} className="tc-chip tc-chip--dense training-solo__source">
            {partLabel(part)} <strong>+{part.slots}</strong>
          </li>
        ))}
      </ul>
      {slots.next.length > 0 && slots.total < INDIVIDUAL_SLOTS_CAP ? (
        <p className="tc-caption">
          {tr("training.individual.more")} {slots.next.map(unlockLabel).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function programTitle(program: IndividualProgram): string {
  if (program.kind === "attribute_focus" && program.targetAttribute) {
    return `${programKindLabel(program.kind)} · ${attributeLabel(program.targetAttribute)}`;
  }
  if (program.kind === "stamp" && program.stampId) {
    const def = stampDefinition(program.stampId);
    return def ? `${def.icon} ${def.label}` : programKindLabel(program.kind);
  }
  if (program.kind === "position_retrain" && program.targetPosition) {
    return `${programKindLabel(program.kind)} · ${program.targetPosition}`;
  }
  return programKindLabel(program.kind);
}

function programEffect(player: Player, program: IndividualProgram): string {
  const gained = program.gained ?? 0;
  if (program.kind === "position_retrain" && program.targetPosition) {
    const slot = player.flexibility.find((entry) => entry.trained_as === program.targetPosition);
    const pct = previewSuccessPercent({
      plannedWeeks: program.plannedWeeks ?? program.weeksRemaining,
      from: player.position,
      to: program.targetPosition,
      attrs: player.attributes,
      currentProficiency: slot?.proficiency ?? 0,
      flexibility: player.flexibility,
    });
    return t("training.individual.effect.retrain", { from: player.position, to: program.targetPosition, pct });
  }
  if (gained <= 0.05) return t("training.individual.effect.none");
  if (program.kind === "stamp") {
    return t("training.individual.effect.stamp", { value: formatDecimal(gained, 1) });
  }
  const attribute = program.targetAttribute ?? "weak_foot";
  return t("training.individual.effect.gain", {
    value: formatDecimal(gained, 1),
    attribute: attributeLabel(attribute),
  });
}

function TakenSlot({
  player,
  program,
  onOpen,
}: {
  player: Player;
  program: IndividualProgram;
  onOpen: () => void;
}) {
  const tr = useT();
  const planned = Math.max(1, program.plannedWeeks ?? program.weeksRemaining);
  const done = Math.max(0, planned - program.weeksRemaining);
  const tired = playerFatigueWarning(player);
  return (
    <button type="button" className="training-solo__slot training-solo__slot--taken" onClick={onOpen}>
      <span className="training-solo__who">
        <PlayerPortrait
          seed={player.portrait_seed}
          nationality={player.nationality}
          clubId={player.club_id}
          size="sm"
        />
        <span className="training-solo__id">
          <span className="training-solo__name">{formatPlayerName(player)}</span>
          <span className="tc-caption">
            {formatPlayerPositionLabel(player)} · {playerCa(player)}
          </span>
        </span>
        {tired ? (
          <span className="training-solo__tired" title={tr("training.individual.fatigue")}>
            <Zap className="tc-icon" aria-label={tr("training.individual.fatigue")} />
          </span>
        ) : null}
      </span>
      <span className="training-solo__program">{programTitle(program)}</span>
      <span className="training-solo__progress">
        <span className="tc-bar" aria-hidden>
          <span className="tc-bar__fill" style={{ width: `${Math.round((done / planned) * 100)}%` }} />
        </span>
        <span className="tc-caption">
          {done === 0
            ? tr("training.individual.startsNextWeek")
            : tr("training.individual.weekProgress", { done, total: planned })}
        </span>
      </span>
      <span
        className={
          program.kind !== "position_retrain" && (program.gained ?? 0) <= 0.05
            ? "training-solo__effect is-empty"
            : "training-solo__effect"
        }
      >
        {programEffect(player, program)}
      </span>
    </button>
  );
}

function resultText(result: IndividualProgramResult): string {
  const stamp = result.stampId ? stampDefinition(result.stampId) : undefined;
  const stampName = stamp ? `${stamp.icon} ${stamp.label}` : result.stampId ?? "";
  const attribute = attributeLabel(result.targetAttribute ?? "weak_foot");
  switch (result.outcome) {
    case "retrained":
      return t("training.individual.result.retrained", { position: result.targetPosition ?? "?" });
    case "failed":
      return result.kind === "stamp"
        ? t("training.individual.result.stampFailed", { stamp: stampName })
        : t("training.individual.result.retrainFailed", { position: result.targetPosition ?? "?" });
    case "stamp":
      return t("training.individual.result.stamp", { stamp: stampName });
    case "gain":
      return t("training.individual.result.gain", {
        value: formatDecimal(result.gained, 1),
        attribute,
        weeks: result.weeks,
      });
    default:
      return t("training.individual.result.noGain", { attribute, weeks: result.weeks });
  }
}

function ResultRow({ result, player }: { result: IndividualProgramResult; player?: Player }) {
  const good = result.outcome === "gain" || result.outcome === "retrained" || result.outcome === "stamp";
  return (
    <li className="training-solo__result">
      <span className={good ? "training-solo__mark is-good" : "training-solo__mark is-bad"} aria-hidden>
        {good ? "✓" : "–"}
      </span>
      <span className="training-solo__result-main">
        <span className="training-solo__name">
          {player ? formatPlayerName(player) : t("training.individual.formerPlayer")}
        </span>
        <span>{resultText(result)}</span>
      </span>
      <span className="tc-caption">
        {t("training.individual.result.when", { season: result.season, week: result.endedWeek })}
      </span>
    </li>
  );
}

function PlayerPicker({
  roster,
  season,
  onClose,
  onPick,
}: {
  roster: Player[];
  season: number;
  onClose: () => void;
  onPick: (playerId: string) => void;
}) {
  const tr = useT();
  return (
    <ModalShell
      variant="tc"
      ariaLabel={tr("training.individual.pickTitle")}
      title={
        <>
          <h2 className="tc-modal__title">{tr("training.individual.pickTitle")}</h2>
          <p className="tc-modal__sub">{tr("training.individual.pickHint")}</p>
        </>
      }
      onClose={onClose}
    >
      <ul className="training-solo__pick-list">
        {roster.map((player) => {
          const delta = seasonCaDelta(player, season);
          const stroke =
            delta === null || delta === 0 ? "var(--text-muted)" : delta > 0 ? "var(--positive)" : "var(--negative)";
          return (
            <li key={player.id}>
              <button type="button" className="training-solo__pick" onClick={() => onPick(player.id)}>
                <span className="training-solo__name">{formatPlayerName(player)}</span>
                <svg className="training-solo__spark" viewBox="0 0 64 24" aria-hidden>
                  <polyline
                    points={growthPolyline(growthSeries(player, season), 64, 24)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="tc-caption">
                  {formatPlayerPositionLabel(player)} · {playerCa(player)}
                </span>
                <span className={caDeltaClassName(delta)}>{formatCaDelta(delta)}</span>
                {playerFatigueWarning(player) ? (
                  <Zap className="tc-icon training-solo__tired" aria-label={tr("training.individual.fatigue")} />
                ) : (
                  <span />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}

function IndividualProgramModal({
  player,
  programs,
  maxSlots,
  season,
  week,
  onClose,
  onProgramsChange,
}: {
  player: Player;
  programs: IndividualProgram[];
  maxSlots: number;
  season: number;
  week: number;
  onClose: () => void;
  onProgramsChange: (programs: IndividualProgram[]) => void;
}) {
  const tr = useT();
  const active = programForPlayer(programs, player.id);
  const trainStamps = eligibleTrainStamps(player);
  const attributeOptions = useMemo(() => eligibleIndividualAttributes(player), [player]);
  const [kind, setKind] = useState<IndividualProgramKind>(active?.kind ?? "attribute_focus");
  const [targetAttribute, setTargetAttribute] = useState<keyof Attributes>(
    active?.targetAttribute ??
      (active?.kind === "weak_foot" ? "weak_foot" : attributeOptions[0] ?? "shooting"),
  );
  const [stampId, setStampId] = useState<string>(active?.stampId ?? trainStamps[0]?.id ?? "");
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
  useEffect(() => {
    if (!attributeOptions.includes(targetAttribute)) {
      setTargetAttribute(attributeOptions[0] ?? "shooting");
    }
  }, [attributeOptions, targetAttribute]);
  const tired = playerFatigueWarning(player);
  const check = canAssignIndividualProgram(
    player,
    kind,
    programs,
    targetPosition,
    stampId,
    kind === "attribute_focus" ? targetAttribute : undefined,
    maxSlots,
  );
  const stampWeeks = kind === "stamp" ? (stampDefinition(stampId)?.weeks ?? weeks) : weeks;

  function handleAssign() {
    if (!check.ok) return;
    try {
      onProgramsChange(
        assignIndividualProgram(
          programs,
          player,
          kind,
          stampWeeks,
          season,
          week,
          targetPosition,
          kind === "stamp" ? stampId : undefined,
          kind === "attribute_focus" ? targetAttribute : undefined,
          maxSlots,
        ),
      );
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
    <ModalShell
      variant="tc"
      ariaLabel={tr("training.individual.dialogAria", { name: formatPlayerName(player) })}
      title={
        <div className="training-solo__modal-id">
          <PlayerPortrait seed={player.portrait_seed} nationality={player.nationality} clubId={player.club_id} size="md" />
          <div>
            <p className="tc-label">
              {formatPlayerPositionLabel(player)} · {tr("training.individual.age", { age: player.age })}
            </p>
            <h2 className="tc-modal__title">{formatPlayerName(player)}</h2>
          </div>
        </div>
      }
      onClose={onClose}
      footer={
        <>
          {!check.ok ? <p className="training-solo__error">{check.reason}</p> : null}
          {active ? (
            <button type="button" className="tc-btn tc-btn--ghost" onClick={handleCancel}>
              {tr("training.individual.stop")}
            </button>
          ) : null}
          <button type="button" className="tc-btn tc-btn--primary" onClick={handleAssign} disabled={!check.ok}>
            {active ? tr("training.individual.update") : tr("training.individual.start")}
          </button>
        </>
      }
    >
      <div className="training-solo__form">
        <p className="tc-caption">
          {tr("training.individual.weakFootStat", { value: Math.round(player.attributes.weak_foot) })}
          {kind !== "position_retrain" && player.flexibility.length > 0
            ? ` · Flex ${player.flexibility
                .map((slot) => `${slot.trained_as} ${Math.round(slot.proficiency * 100)}%`)
                .join(", ")}`
            : ""}
        </p>

        {tired ? (
          <p className="tc-callout tc-callout--warn" role="status">
            {tr("training.individual.fatigue")}
          </p>
        ) : null}

        <label className="training-solo__field">
          <span className="tc-label">{tr("training.individual.field.program")}</span>
          <select
            className="tc-select"
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as IndividualProgramKind;
              setKind(nextKind);
              if (nextKind === "stamp" && !stampId && trainStamps[0]) setStampId(trainStamps[0].id);
            }}
          >
            <option value="attribute_focus">{programKindLabel("attribute_focus")}</option>
            <option value="weak_foot">{programKindLabel("weak_foot")}</option>
            <option value="position_retrain">{programKindLabel("position_retrain")}</option>
            <option value="stamp" disabled={trainStamps.length === 0}>
              {programKindLabel("stamp")}
              {trainStamps.length === 0 ? ` ${tr("training.individual.noStamps")}` : ""}
            </option>
          </select>
        </label>

        {kind === "attribute_focus" ? (
          <label className="training-solo__field">
            <span className="tc-label">{tr("training.individual.field.attribute")}</span>
            <select
              className="tc-select"
              value={targetAttribute}
              onChange={(event) => setTargetAttribute(event.target.value as keyof Attributes)}
            >
              {attributeOptions.map((key) => (
                <option key={key} value={key}>
                  {attributeLabel(key)} ({Math.round(player.attributes[key])})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {kind === "position_retrain" && retrainTargets.length === 0 ? (
          <ScreenEmptyState
            icon={MapPinOff}
            title={tr("training.individual.noRetrainTitle")}
            hint={tr("training.individual.noRetrainHint")}
          />
        ) : null}

        {kind === "position_retrain" && retrainTargets.length > 0 ? (
          <>
            <label className="training-solo__field">
              <span className="tc-label">{tr("training.individual.field.target")}</span>
              <select
                className="tc-select"
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
          <label className="training-solo__field">
            <span className="tc-label">{tr("training.individual.field.stamp")}</span>
            <select className="tc-select" value={stampId} onChange={(event) => setStampId(event.target.value)}>
              {trainStamps.map((stamp) => (
                <option key={stamp.id} value={stamp.id}>
                  {stamp.icon} {stamp.label}
                  {stamp.path === "hybrid" ? " · Hybrid" : ""} · {stamp.weeks ?? "?"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {kind === "stamp" ? (
          <p className="tc-caption">{tr("training.individual.stampFixed", { weeks: stampWeeks })}</p>
        ) : (
          <label className="tc-range">
            <span className="tc-range__head">
              <span className="tc-label">{tr("training.individual.field.durationLabel")}</span>
              <strong>{tr("training.individual.field.duration", { weeks })}</strong>
            </span>
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
      </div>
    </ModalShell>
  );
}
