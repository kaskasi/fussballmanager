import { isPlayerMatchEligible } from "../development/injury-roll.ts";
import { LEAGUE_COMPETITION, type CompetitionId } from "../discipline/suspensions.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../types/player-display.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import {
  LineupPlayerStatusStrip,
  lineupStatusFromPlayer,
} from "./LineupPlayerStatusStrip.tsx";

/**
 * Bench card in the shared player-card look (scout hits, development movers): faces.js portrait
 * in the club kit, name and position/age, then the lineup status strip. Drag it onto the pitch.
 */
export function LineupPlayerCard({
  player,
  selected = false,
  onDragStart,
  onDragEnd,
  onOpenPlayer,
  competition = LEAGUE_COMPETITION,
}: {
  player: Player;
  /** PRD 36: eligibility of the match being prepared (league or a cup). */
  competition?: CompetitionId;
  selected?: boolean;
  onDragStart?: (playerId: string) => void;
  onDragEnd?: () => void;
  onOpenPlayer?: (playerId: string) => void;
}) {
  const status = lineupStatusFromPlayer(player, competition);
  // PRD 34: suspended or injured players stay on the bench.
  const available = isPlayerMatchEligible(player, competition);

  return (
    <div
      className={`lineup-pcard${selected ? " is-selected" : ""}${available ? "" : " is-unavailable"}`}
      draggable={available}
      onDragStart={(event) => {
        if (!available) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/player-id", player.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(player.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="lineup-pcard__top">
        <PlayerPortrait
          seed={player.portrait_seed}
          nationality={player.nationality}
          clubId={player.club_id}
          size="sm"
        />
        <div className="lineup-pcard__id">
          <button
            type="button"
            className="lineup-pcard__name"
            onClick={() => onOpenPlayer?.(player.id)}
          >
            {formatPlayerName(player)}
          </button>
          <span className="lineup-pcard__meta">
            {formatPlayerPositionLabel(player)} · {player.age}
          </span>
        </div>
      </div>
      <div className="lineup-pcard__strip">
        <LineupPlayerStatusStrip status={status} variant="pitch" />
      </div>
    </div>
  );
}
