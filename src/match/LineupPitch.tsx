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
import { estimateCa } from "../transfers/market-value.ts";
import { formatPlayerName, roundStat } from "../types/player-display.ts";
import type { LineupAssignments } from "./lineup-board.ts";
import type { OpponentLineupEntry, OpponentLineupPreview } from "./opponent-lineup-preview.ts";
import { matchPlayerIcons } from "./player-match-icons.ts";

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
};

export function LineupPitch({
  formation,
  assignments,
  playersById,
  dragPlayerId,
  playerTeamLabel,
  opponent,
  onAssign,
  onDragPlayer,
}: LineupPitchProps) {
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
      <div className="lineup-pitch-tabs" role="tablist" aria-label="Aufstellungsansicht">
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

      <div className="lineup-pitch-wrap" aria-label="Aufstellungsfeld">
        <PitchSvg />

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
                  style={{
                    left: `${slot.homePosition.x}%`,
                    top: `${slot.homePosition.y}%`,
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(slot.id, event)}
                >
                  <span className="lineup-slot-label">{slot.id}</span>
                  {player ? (
                    <button
                      type="button"
                      className="lineup-slot-card"
                      draggable
                      title={`${formatPlayerName(player)} — Klick zum Entfernen`}
                      onClick={() => onAssign(slot.id, null)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/player-id", player.id);
                        event.dataTransfer.effectAllowed = "move";
                        onDragPlayer(player.id);
                      }}
                      onDragEnd={() => onDragPlayer(null)}
                    >
                      <PlayerSlotIcons player={player} />
                      <span className="lineup-slot-name">{formatPlayerName(player)}</span>
                    </button>
                  ) : (
                    <div className="lineup-slot-empty" aria-label={`Slot ${slot.id} leer`}>+</div>
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
                style={{
                  left: `${entry.position.x}%`,
                  top: `${entry.position.y}%`,
                }}
              >
                <span className="lineup-slot-label">{entry.slotId}</span>
                <div className="lineup-slot-card lineup-slot-card-opponent" title={`${entry.name} · CA ${entry.ca}`}>
                  <span className="lineup-slot-icons">
                    <span className={`lineup-icon is-${entry.formTone}`} title={entry.formTitle}>
                      {entry.formMark}
                    </span>
                    <span className="lineup-slot-ca" title="Current Ability">{entry.ca}</span>
                  </span>
                  <span className="lineup-slot-name">{entry.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PitchSvg() {
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

function PlayerSlotIcons({ player }: { player: Player }) {
  const icons = matchPlayerIcons(player);
  const ca = roundStat(estimateCa(player.attributes, player.position));
  return (
    <span className="lineup-slot-icons">
      <span className={`lineup-icon is-${icons.form.tone}`} title={icons.form.title}>
        {icons.form.mark}
      </span>
      <span className="lineup-slot-ca" title="Current Ability">{ca}</span>
    </span>
  );
}

