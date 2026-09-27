import type { Player } from "../types/player.ts";
import { formatPlayerName, roundStat } from "../types/player-display.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { matchPlayerIcons } from "./player-match-icons.ts";

export function LineupPlayerCard({
  player,
  compact = false,
  onDragStart,
  onDragEnd,
}: {
  player: Player;
  compact?: boolean;
  onDragStart?: (playerId: string) => void;
  onDragEnd?: () => void;
}) {
  const icons = matchPlayerIcons(player);
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
      <span className="lineup-player-name">{formatPlayerName(player)}</span>
      {!compact ? <span className="lineup-player-ca">{ca}</span> : null}
      <span className="lineup-player-icons" aria-label="Form und Fitness">
        <span className={`lineup-icon is-${icons.form.tone}`} title={icons.form.title}>
          {icons.form.mark}
        </span>
        <span className={`lineup-icon is-${icons.fitness.tone}`} title={icons.fitness.title}>
          {icons.fitness.mark}
        </span>
        {icons.weakFoot.show ? (
          <span className="lineup-icon lineup-icon-wa" title={icons.weakFoot.title}>
            {icons.weakFoot.label}
          </span>
        ) : null}
      </span>
    </div>
  );
}
