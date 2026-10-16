/** WIREFRAME: design.md §9 — Hub Top-Entwicklung (Scout-Treffer-Kartenlayout) */
import { Activity, TrendingUp, User } from "lucide-react";
import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  formatRecentGrowth,
  squadStatusLabel,
} from "../../player/ca-tracking.ts";
import { useT } from "../../i18n/react.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

function filledSegments(value: number, max: number, count: number): number {
  if (value <= 0) return 0;
  return Math.min(count, Math.max(1, Math.ceil((value / max) * count)));
}

function SegmentGlyphs({
  count,
  filled,
}: {
  count: number;
  filled: number;
}) {
  return (
    <span className="scout-segment-glyphs is-exact" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={index < filled ? "scout-segment is-on" : "scout-segment"} />
      ))}
    </span>
  );
}

function DevelopmentMoverGlyphs({ mover }: { mover: DevelopmentMover }) {
  const caFilled = filledSegments(mover.ca, 199, 5);
  const growthFilled = filledSegments(mover.recentGrowth, 14, 5);
  const caHint = `CA ${mover.ca}`;
  const growthHint = `26W +${formatRecentGrowth(mover.recentGrowth)}`;

  return (
    <div
      className="scouting-hits-grid-glyphs scout-stat-rect-grid"
      aria-label={`${caHint} · ${growthHint}`}
    >
      <div className="scout-stat-rect-row" title={caHint}>
        <Activity size={11} strokeWidth={2.5} aria-hidden />
        <SegmentGlyphs count={5} filled={caFilled} />
        {mover.caDelta !== null ? (
          <span className={`dev-mover-delta ${caDeltaClassName(mover.caDelta)}`}>
            {formatCaDelta(mover.caDelta)}
          </span>
        ) : null}
      </div>
      <div className="scout-stat-rect-row" title={growthHint}>
        <TrendingUp size={11} strokeWidth={2.5} aria-hidden />
        <SegmentGlyphs count={5} filled={growthFilled} />
        <span className="dev-mover-growth-label">+{formatRecentGrowth(mover.recentGrowth)}</span>
      </div>
    </div>
  );
}

export function DevelopmentMoverGridCard({
  mover,
  rank,
  onOpenProfile,
}: {
  mover: DevelopmentMover;
  rank: number;
  onOpenProfile: () => void;
}) {
  const t = useT();

  return (
    <article className="scout-hit-card dev-mover-card">
      <button type="button" className="scout-hit-card-main" onClick={onOpenProfile}>
        <div className="scout-hit-card-top">
          <PlayerPortrait
            seed={mover.portraitSeed}
            clubId={mover.clubId}
            size="sm"
            variant="known"
            className="scout-hit-card-portrait"
          />
          <div className="scout-hit-card-head">
            <span className="scout-hit-card-name">{mover.displayName}</span>
            <span className="scout-hit-card-meta">
              {mover.age} · {mover.position}
            </span>
            <span className="scout-hit-card-club">
              #{rank} · {squadStatusLabel(mover.squadStatus)}
            </span>
          </div>
        </div>
        <div className="scout-hit-card-bottom">
          <DevelopmentMoverGlyphs mover={mover} />
        </div>
      </button>
      <div className="scout-hit-card-ctas dev-mover-card-ctas">
        <button
          type="button"
          className="scout-hit-cta"
          aria-label={t("scouting.hits.profileCta")}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile();
          }}
        >
          <User size={15} strokeWidth={2.25} />
        </button>
      </div>
    </article>
  );
}
