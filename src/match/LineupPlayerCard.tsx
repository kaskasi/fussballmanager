import type { Player } from "../types/player.ts";
import { formatPlayerName, roundStat } from "../types/player-display.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { matchPlayerWeakFoot } from "./player-match-icons.ts";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import { LineupFormValue } from "./LineupFormValue.tsx";

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
  const weakFoot = matchPlayerWeakFoot(player);
  const ca = roundStat(estimateCa(player.attributes, player.position));

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
      <span className="lineup-player-pos">{player.position}</span>
      <button
        type="button"
        className="lineup-player-name lineup-player-open"
        onClick={() => onOpenPlayer?.(player.id)}
      >
        {formatPlayerName(player)}
      </button>
      {!compact ? <span className="lineup-player-ca">{ca}</span> : null}
      <span className="lineup-player-icons">
        <LineupFormValue careerForm={player.state.form} compact />
        <LineupFatigueBars fitness={player.state.fitness} compact />
        {weakFoot.show ? (
          <span className="lineup-icon lineup-icon-wa" title={weakFoot.title}>
            {weakFoot.label}
          </span>
        ) : null}
      </span>
    </div>
  );
}
