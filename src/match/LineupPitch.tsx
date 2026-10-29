/**
 * WIREFRAME: PRD 09.2 — F1.1 Drag&Drop-Aufstellung
 * Tabs: eigene Elf (DnD) · Gegner-Scout (read-only, volles Feld)
 */
import type { DragEvent } from "react";
import { useState } from "react";
import {
  effectiveFormation,
  getFormation,
  getPitchZone,
  PITCH_ZONE_IDS,
  slotZoneId,
  type FormationId,
  type FormationSlotId,
  type PitchZoneId,
  type SlotZones,
} from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import type { LineupAssignments } from "./lineup-board.ts";
import type { OpponentLineupEntry, OpponentLineupPreview } from "./opponent-lineup-preview.ts";
import {
  LineupPlayerStatusStrip,
  lineupStatusFromPlayer,
  type LineupStatusView,
} from "./LineupPlayerStatusStrip.tsx";
import { LineupJersey } from "./LineupJersey.tsx";
import { useT } from "../i18n/react.ts";

type LineupPitchView = "own" | "opponent";

/** What is being dragged: a bench player (no slot) or the player of a pitch slot. */
export type LineupDrag = { playerId: string; fromSlot: FormationSlotId | null };

type LineupPitchProps = {
  formation: FormationId;
  /** Slots moved to another zone (F1.6). */
  slotZones?: SlotZones;
  assignments: LineupAssignments;
  playersById: Map<string, Player>;
  drag: LineupDrag | null;
  playerTeamLabel: string;
  /** Career club id: empty slots are shirts in this club's home kit. */
  kitClubId?: string;
  opponent?: OpponentLineupPreview | null;
  onDropOnSlot: (slotId: FormationSlotId, playerId: string, fromSlot: FormationSlotId | null) => void;
  /** A pitch player dropped on a free zone: that slot moves there (IV → Libero, ZM → DM, …). */
  onMoveSlot?: (slotId: FormationSlotId, zoneId: PitchZoneId) => void;
  onDrag: (drag: LineupDrag | null) => void;
  onOpenPlayer?: (playerId: string) => void;
  /** "vertical": goalkeeper at the bottom, strikers at the top. */
  orientation?: "horizontal" | "vertical";
};

type PitchPoint = { x: number; y: number };

/** A free zone inside this ellipse (board %, across × along) around a placed card would sit under it. */
const ZONE_CLEARANCE = { across: 16, along: 9 };

/**
 * Kickoff shapes sit in the own half (keeper 6 … strikers 74). The board spreads the lines evenly
 * over the whole pitch (keeper, libero, back line, DM, midfield, AM, strikers) so the portrait
 * cards of neighbouring lines do not overlap.
 */
const BOARD_DEPTHS: ReadonlyArray<readonly [number, number]> = [
  [0, 3],
  [6, 7],
  [12, 19],
  [18, 30],
  [33, 46],
  [42, 60],
  [58, 74],
  [70, 88],
  [100, 97],
];

function boardDepth(x: number): number {
  for (let index = 1; index < BOARD_DEPTHS.length; index += 1) {
    const [x1, d1] = BOARD_DEPTHS[index]!;
    const [x0, d0] = BOARD_DEPTHS[index - 1]!;
    if (x <= x1) return d0 + ((x - x0) / (x1 - x0)) * (d1 - d0);
  }
  return 97;
}

/** Formation coordinates attack to the right; vertical turns the pitch a quarter turn so attack points up. */
function slotStyle(position: PitchPoint, orientation: "horizontal" | "vertical") {
  const depth = boardDepth(position.x);
  return orientation === "vertical"
    ? { left: `${position.y}%`, top: `${100 - depth}%` }
    : { left: `${depth}%`, top: `${position.y}%` };
}

/** Short pitch label of a zone ("LIB" for the libero in German, else the position code). */
export function useZoneLabel() {
  const t = useT();
  return (zoneId: PitchZoneId) => (zoneId === "SW" ? t("match.lineup.zoneShort.SW") : zoneId);
}

function readDrag(event: DragEvent): LineupDrag | null {
  const playerId = event.dataTransfer.getData("text/player-id");
  if (!playerId) return null;
  const fromSlot = event.dataTransfer.getData("text/from-slot");
  return { playerId, fromSlot: fromSlot ? (fromSlot as FormationSlotId) : null };
}

export function LineupPitch({
  formation,
  slotZones,
  assignments,
  playersById,
  drag,
  playerTeamLabel,
  kitClubId,
  opponent,
  onDropOnSlot,
  onMoveSlot,
  onDrag,
  onOpenPlayer,
  orientation = "horizontal",
}: LineupPitchProps) {
  const t = useT();
  const zoneLabel = useZoneLabel();
  const [view, setView] = useState<LineupPitchView>("own");
  const [overTarget, setOverTarget] = useState<string | null>(null);
  const slots = effectiveFormation(formation, slotZones);
  const opponentEntries = opponent ? opponentFullPitchEntries(opponent) : [];
  const movingSlot = drag?.fromSlot && drag.fromSlot !== "GK" && onMoveSlot ? drag.fromSlot : null;
  const occupied = new Set(slots.map((slot) => slotZoneId(slot.id, slotZones)));
  const freeZones = movingSlot
    ? PITCH_ZONE_IDS.filter((zoneId) => {
        if (zoneId === "GK" || occupied.has(zoneId)) return false;
        const at = getPitchZone(zoneId).homePosition;
        return slots.every((slot) => {
          if (slot.id === movingSlot) return true;
          const along = (boardDepth(slot.homePosition.x) - boardDepth(at.x)) / ZONE_CLEARANCE.along;
          const across = (slot.homePosition.y - at.y) / ZONE_CLEARANCE.across;
          return along * along + across * across >= 1;
        });
      })
    : [];

  const handleSlotDrop = (slotId: FormationSlotId, event: DragEvent) => {
    event.preventDefault();
    setOverTarget(null);
    const dropped = readDrag(event);
    if (!dropped) return;
    onDropOnSlot(slotId, dropped.playerId, dropped.fromSlot);
    onDrag(null);
  };

  const handleZoneDrop = (zoneId: PitchZoneId, event: DragEvent) => {
    event.preventDefault();
    setOverTarget(null);
    const dropped = readDrag(event);
    if (dropped?.fromSlot && dropped.fromSlot !== "GK") onMoveSlot?.(dropped.fromSlot, zoneId);
    onDrag(null);
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
        className={`lineup-pitch-wrap${orientation === "vertical" ? " lineup-pitch-wrap--vertical" : ""}${drag ? " is-dragging" : ""}`}
        aria-label="Aufstellungsfeld"
      >
        <PitchSvg orientation={orientation} />

        {view === "own" ? (
          <div className="lineup-pitch-slots" id="lineup-pitch-own" role="tabpanel" aria-labelledby="lineup-tab-own">
            {freeZones.map((zoneId) => (
              <div
                key={`zone-${zoneId}`}
                className={`lineup-zone${overTarget === `zone-${zoneId}` ? " is-over" : ""}`}
                style={slotStyle(getPitchZone(zoneId).homePosition, orientation)}
                title={t("match.lineup.zoneDrop", { zone: t(`match.lineup.zone.${zoneId}`) })}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverTarget(`zone-${zoneId}`);
                }}
                onDragLeave={() => setOverTarget(null)}
                onDrop={(event) => handleZoneDrop(zoneId, event)}
              >
                {zoneLabel(zoneId)}
              </div>
            ))}
            {slots.map((slot) => {
              const playerId = assignments[slot.id];
              const player = playerId ? playersById.get(playerId) : undefined;
              const zoneId = slotZoneId(slot.id, slotZones);
              const moved = Boolean(slotZones?.[slot.id]);
              const label = zoneLabel(zoneId);
              const isTarget = drag !== null && drag.fromSlot !== slot.id;
              return (
                <div
                  key={slot.id}
                  className={[
                    "lineup-slot",
                    player ? "has-player" : "",
                    isTarget ? "is-target" : "",
                    overTarget === slot.id ? "is-over" : "",
                    moved ? "is-moved" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={slotStyle(slot.homePosition, orientation)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOverTarget(slot.id);
                  }}
                  onDragLeave={() => setOverTarget(null)}
                  onDrop={(event) => handleSlotDrop(slot.id, event)}
                >
                  {player ? (
                    <>
                      <span className="lineup-slot-label" title={t(`match.lineup.zone.${zoneId}`)}>
                        {label}
                      </span>
                      <button
                        type="button"
                        className="lineup-slot-card"
                        draggable
                        title={t("match.lineup.openPlayerProfile", { name: formatPlayerName(player) })}
                        onClick={() => onOpenPlayer?.(player.id)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/player-id", player.id);
                          event.dataTransfer.setData("text/from-slot", slot.id);
                          event.dataTransfer.effectAllowed = "move";
                          onDrag({ playerId: player.id, fromSlot: slot.id });
                        }}
                        onDragEnd={() => {
                          setOverTarget(null);
                          onDrag(null);
                        }}
                      >
                        <PlayerPortrait
                          seed={player.portrait_seed}
                          nationality={player.nationality}
                          clubId={player.club_id}
                          size="sm"
                          className="lineup-slot-face"
                        />
                        <span className="lineup-slot-name">{formatPlayerName(player)}</span>
                        <PlayerSlotStatus player={player} />
                      </button>
                    </>
                  ) : (
                    <div
                      className="lineup-slot-empty"
                      role="img"
                      aria-label={t("match.lineup.slotEmpty", { slot: label })}
                      title={t("match.lineup.slotEmpty", { slot: t(`match.lineup.zone.${zoneId}`) })}
                    >
                      <LineupJersey clubId={kitClubId} label={label} />
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
                  <span className="lineup-slot-name">{entry.name}</span>
                  <LineupPlayerStatusStrip
                    status={opponentStatusFromEntry(entry)}
                    variant="pitch"
                  />
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
