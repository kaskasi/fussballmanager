/**
 * WIREFRAME: PRD 09.2 — F1.1 Drag&Drop-Aufstellung
 * ┌──────────────────────────────────────────────┐
 * │  [2D Pitch — 11 Slots mit Spieler-Cards]     │
 * │  GK · DEF · MF · ST — Form ●/▲/◆ + WA      │
 * └──────────────────────────────────────────────┘
 */
import type { DragEvent } from "react";
import { getFormation, type FormationId, type FormationSlotId } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { LineupAssignments } from "./lineup-board.ts";
import { matchPlayerIcons } from "./player-match-icons.ts";

type LineupPitchProps = {
  formation: FormationId;
  assignments: LineupAssignments;
  playersById: Map<string, Player>;
  dragPlayerId: string | null;
  onAssign: (slotId: FormationSlotId, playerId: string | null) => void;
  onDragPlayer: (playerId: string | null) => void;
};

export function LineupPitch({
  formation,
  assignments,
  playersById,
  dragPlayerId,
  onAssign,
  onDragPlayer,
}: LineupPitchProps) {
  const slots = getFormation(formation);

  const handleDrop = (slotId: FormationSlotId, event: DragEvent) => {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/player-id");
    if (!playerId) return;
    onAssign(slotId, playerId);
    onDragPlayer(null);
  };

  return (
    <div className="lineup-pitch-wrap" aria-label="Aufstellungsfeld">
      <svg className="lineup-pitch-svg" viewBox="0 0 105 68" role="img" aria-hidden="true">
        <rect x="0" y="0" width="105" height="68" className="lineup-pitch-grass" />
        <rect x="0.8" y="0.8" width="103.4" height="66.4" className="lineup-pitch-line" fill="none" />
        <line x1="52.5" y1="0" x2="52.5" y2="68" className="lineup-pitch-line" />
        <circle cx="52.5" cy="34" r="9" className="lineup-pitch-line" fill="none" />
        <rect x="0" y="17" width="16" height="34" className="lineup-pitch-line" fill="none" />
        <rect x="89" y="17" width="16" height="34" className="lineup-pitch-line" fill="none" />
      </svg>

      <div className="lineup-pitch-slots">
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
                  <SlotIcons player={player} />
                  <span className="lineup-slot-name">{shortName(player)}</span>
                </button>
              ) : (
                <div className="lineup-slot-empty" aria-label={`Slot ${slot.id} leer`}>+</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotIcons({ player }: { player: Player }) {
  const icons = matchPlayerIcons(player);
  return (
    <span className="lineup-slot-icons">
      <span className={`lineup-icon is-${icons.form.tone}`} title={icons.form.title}>
        {icons.form.mark}
      </span>
      <span className={`lineup-icon is-${icons.fitness.tone}`} title={icons.fitness.title}>
        {icons.fitness.mark}
      </span>
      {icons.weakFoot.show ? (
        <span className="lineup-icon lineup-icon-wa" title={icons.weakFoot.title}>WA</span>
      ) : null}
    </span>
  );
}

function shortName(player: Player): string {
  const full = formatPlayerName(player);
  const parts = full.split(" ");
  if (parts.length <= 1) return full.slice(0, 10);
  return parts[parts.length - 1] ?? full;
}
