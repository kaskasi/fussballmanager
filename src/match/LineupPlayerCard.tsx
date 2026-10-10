import type { Player } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../types/player-display.ts";
import {
  LineupPlayerStatusStrip,
  lineupStatusFromPlayer,
} from "./LineupPlayerStatusStrip.tsx";

export function LineupPlayerCard({
  player,
  compact = false,
  onDragStart,
  onDragEnd,
  onOpenPlayer,
}: {
  player: Player;
  compact?: boolean;
  onDragStart?: (playerId: string) => void;
  onDragEnd?: () => void;
  onOpenPlayer?: (playerId: string) => void;
}) {
  const status = lineupStatusFromPlayer(player);

  return (
    <div
      className={`lineup-player-card${compact ? " lineup-player-card--compact" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/player-id", player.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(player.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <span className="lineup-player-pos">{formatPlayerPositionLabel(player)}</span>
      <button
        type="button"
        className="lineup-player-name lineup-player-open"
        onClick={() => onOpenPlayer?.(player.id)}
      >
        {formatPlayerName(player)}
      </button>
      <LineupPlayerStatusStrip status={status} variant="bench" />
    </div>
  );
}
