/** Manager Desk CC — compact horizontal mover card (no scout bars / profile CTA). */
import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import { formatDevelopmentPeriodDelta, squadStatusLabel } from "../../player/ca-tracking.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export function DevelopmentDeskCard({
  mover,
  rank,
  periodDelta,
  onSelectPlayer,
}: {
  mover: DevelopmentMover;
  rank: number;
  periodDelta: number | null;
  onSelectPlayer: () => void;
}) {
  const deltaLabel = formatDevelopmentPeriodDelta(periodDelta);
  const deltaClass =
    periodDelta === null
      ? "squad-col-delta"
      : periodDelta > 0
        ? "squad-col-delta is-up"
        : periodDelta < 0
          ? "squad-col-delta is-down"
          : "squad-col-delta";

  return (
    <button type="button" className="dev-desk-card" onClick={onSelectPlayer}>
      <span className="dev-desk-card__rank" aria-hidden>
        {rank}
      </span>
      <PlayerPortrait
        seed={mover.portraitSeed}
        size="sm"
        variant="known"
        className="dev-desk-card__portrait"
      />
      <span className="dev-desk-card__body">
        <span className="dev-desk-card__name">{mover.displayName}</span>
        <span className="dev-desk-card__meta">
          {mover.age} · {mover.position} · {squadStatusLabel(mover.squadStatus)}
        </span>
      </span>
      <span className={`dev-desk-card__delta ${deltaClass}`}>{deltaLabel}</span>
    </button>
  );
}
