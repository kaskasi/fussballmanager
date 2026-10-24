/**
 * WIREFRAME: PRD 09.2 — F1.1 Drag&Drop-Aufstellung
 * Tabs: eigene Elf (DnD) · Gegner-Scout (read-only, volles Feld)
 */
import type { DragEvent } from "react";
import { useState } from "react";
import {
  getFormation,
  type FormationId,
  type FormationSlotId,
} from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { LineupAssignments } from "./lineup-board.ts";
import type { OpponentLineupEntry, OpponentLineupPreview } from "./opponent-lineup-preview.ts";
import {
  LineupPlayerStatusStrip,
  lineupStatusFromPlayer,
  type LineupStatusView,
} from "./LineupPlayerStatusStrip.tsx";
import { useT } from "../i18n/react.ts";

type LineupPitchView = "own" | "opponent";

type LineupPitchProps = {
  formation: FormationId;
  assignments: LineupAssignments;
  playersById: Map<string, Player>;
  dragPlayerId: string | null;
  playerTeamLabel: string;
  opponent?: OpponentLineupPreview | null;
  onAssign: (slotId: FormationSlotId, playerId: string | null) => void;
  onDragPlayer: (playerId: string | null) => void;
  onOpenPlayer?: (playerId: string) => void;
  /** "vertical": goalkeeper at the bottom, strikers at the top. */
  orientation?: "horizontal" | "vertical";
};

type PitchPoint = { x: number; y: number };

/** Formation coordinates attack to the right; vertical turns the pitch a quarter turn so attack points up. */
function slotStyle(position: PitchPoint, orientation: "horizontal" | "vertical") {
  return orientation === "vertical"
    ? { left: `${position.y}%`, top: `${100 - position.x}%` }
    : { left: `${position.x}%`, top: `${position.y}%` };
}

export function LineupPitch({
  formation,
  assignments,
  playersById,
  dragPlayerId,
  playerTeamLabel,
  opponent,
  onAssign,
  onDragPlayer,
  onOpenPlayer,
  orientation = "horizontal",
}: LineupPitchProps) {
  const t = useT();
  const [view, setView] = useState<LineupPitchView>("own");
  const slots = getFormation(formation);
  const opponentEntries = opponent ? opponentFullPitchEntries(opponent) : [];

  const handleDrop = (slotId: FormationSlotId, event: DragEvent) => {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/player-id");
    if (!playerId) return;
    onAssign(slotId, playerId);
    onDragPlayer(null);
  };

  return (
    <div className="lineup-pitch-panel">
      <div className="lineup-pitch-tabs" role="tablist" aria-label={t("match.lineup.pitchViewAria")}>
        <button
          type="button"
          role="tab"
          id="lineup-tab-own"
          aria-selected={view === "own"}
          aria-controls="lineup-pitch-own"
          className={view === "own" ? "lineup-pitch-tab is-active" : "lineup-pitch-tab"}
          onClick={() => setView("own")}
        >
          {playerTeamLabel}
        </button>
        {opponent ? (
          <button
            type="button"
            role="tab"
            id="lineup-tab-opponent"
            aria-selected={view === "opponent"}
            aria-controls="lineup-pitch-opponent"
            className={view === "opponent" ? "lineup-pitch-tab is-active is-opponent" : "lineup-pitch-tab is-opponent"}
            onClick={() => setView("opponent")}
          >
            {opponent.teamShortName} · {opponent.formation}
          </button>
        ) : null}
      </div>

      <div
        className={`lineup-pitch-wrap${orientation === "vertical" ? " lineup-pitch-wrap--vertical" : ""}`}
        aria-label="Aufstellungsfeld"
      >
        <PitchSvg orientation={orientation} />

        {view === "own" ? (
          <div className="lineup-pitch-slots" id="lineup-pitch-own" role="tabpanel" aria-labelledby="lineup-tab-own">
            {slots.map((slot) => {
              const playerId = assignments[slot.id];
              const player = playerId ? playersById.get(playerId) : undefined;
              const isTarget = dragPlayerId !== null;
              return (
                <div
                  key={slot.id}
                  className={`lineup-slot${player ? " has-player" : ""}${isTarget ? " is-target" : ""}`}
                  style={slotStyle(slot.homePosition, orientation)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(slot.id, event)}
                >
                  <span className="lineup-slot-label">{slot.id}</span>
                  {player ? (
                    <button
                      type="button"
                      className="lineup-slot-card"
                      draggable
                      title={t("match.lineup.openPlayerProfile", { name: formatPlayerName(player) })}
                      onClick={() => onOpenPlayer?.(player.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/player-id", player.id);
                        event.dataTransfer.effectAllowed = "move";
                        onDragPlayer(player.id);
                      }}
                      onDragEnd={() => onDragPlayer(null)}
                    >
                      <PlayerSlotStatus player={player} />
                      <span className="lineup-slot-name">{formatPlayerName(player)}</span>
                    </button>
                  ) : (
                    <div className="lineup-slot-empty" aria-label={t("match.lineup.slotEmpty", { slot: slot.id })}>
                      +
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="lineup-pitch-slots"
            id="lineup-pitch-opponent"
            role="tabpanel"
            aria-labelledby="lineup-tab-opponent"
          >
            {opponentEntries.map((entry) => (
              <div
                key={`opp-${entry.slotId}`}
                className="lineup-slot lineup-slot-opponent has-player"
                style={slotStyle(entry.position, orientation)}
              >
                <span className="lineup-slot-label">{entry.slotId}</span>
                <button
                  type="button"
                  className="lineup-slot-card lineup-slot-card-opponent"
                  title={t("match.lineup.openPlayerProfile", { name: entry.name })}
                  onClick={() => onOpenPlayer?.(entry.playerId)}
                >
                  <LineupPlayerStatusStrip
                    status={opponentStatusFromEntry(entry)}
                    variant="pitch"
                  />
                  <span className="lineup-slot-name">{entry.name}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PitchSvg({ orientation }: { orientation: "horizontal" | "vertical" }) {
  if (orientation === "vertical") {
    return (
      <svg className="lineup-pitch-svg" viewBox="0 0 68 105" role="img" aria-hidden="true">
        <rect x="0" y="0" width="68" height="105" className="lineup-pitch-grass" />
        <rect x="0.8" y="0.8" width="66.4" height="103.4" className="lineup-pitch-line" fill="none" />
        <line x1="0" y1="52.5" x2="68" y2="52.5" className="lineup-pitch-line" />
        <circle cx="34" cy="52.5" r="9" className="lineup-pitch-line" fill="none" />
        <rect x="17" y="0" width="34" height="16" className="lineup-pitch-line" fill="none" />
        <rect x="17" y="89" width="34" height="16" className="lineup-pitch-line" fill="none" />
      </svg>
    );
  }
  return (
    <svg className="lineup-pitch-svg" viewBox="0 0 105 68" role="img" aria-hidden="true">
      <rect x="0" y="0" width="105" height="68" className="lineup-pitch-grass" />
      <rect x="0.8" y="0.8" width="103.4" height="66.4" className="lineup-pitch-line" fill="none" />
      <line x1="52.5" y1="0" x2="52.5" y2="68" className="lineup-pitch-line" />
      <circle cx="52.5" cy="34" r="9" className="lineup-pitch-line" fill="none" />
      <rect x="0" y="17" width="16" height="34" className="lineup-pitch-line" fill="none" />
      <rect x="89" y="17" width="16" height="34" className="lineup-pitch-line" fill="none" />
    </svg>
  );
}

function opponentFullPitchEntries(preview: OpponentLineupPreview): OpponentLineupEntry[] {
  const slots = getFormation(preview.formation);
  const bySlot = new Map(preview.starters.map((entry) => [entry.slotId, entry]));
  return slots
    .map((slot) => {
      const entry = bySlot.get(slot.id);
      if (!entry) return null;
      return { ...entry, position: slot.homePosition };
    })
    .filter((entry): entry is OpponentLineupEntry => entry !== null);
}

function PlayerSlotStatus({ player }: { player: Player }) {
  return (
    <LineupPlayerStatusStrip status={lineupStatusFromPlayer(player)} variant="pitch" />
  );
}

function opponentStatusFromEntry(entry: OpponentLineupEntry): LineupStatusView {
  return {
    careerForm: entry.careerForm,
    fitness: entry.fitness,
    ca: entry.ca,
  };
}
