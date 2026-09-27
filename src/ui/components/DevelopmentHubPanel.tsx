import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  formatRecentGrowth,
  squadStatusLabel,
} from "../../player/ca-tracking.ts";

/**
 * WIREFRAME: PRD 09.2 — Hub Entwicklung (Top-Mover)
 */
export function DevelopmentHubPanel({
  movers,
  onSelectPlayer,
}: {
  movers: readonly DevelopmentMover[];
  onSelectPlayer: (playerId: string) => void;
}) {
  if (movers.length === 0) return null;

  return (
    <section className="dev-hub" aria-label="Entwicklung diese Saison">
      <div className="dev-hub-head">
        <h3>📈 Top-Entwicklung</h3>
        <p className="dev-hub-sub">26-Wochen-Momentum · Klick öffnet Profil</p>
      </div>
      <ul className="dev-hub-list">
        {movers.map((mover, index) => (
          <li key={mover.playerId}>
            <button type="button" className="dev-hub-row" onClick={() => onSelectPlayer(mover.playerId)}>
              <span className="dev-hub-rank" aria-hidden="true">{index + 1}</span>
              <span className="dev-hub-body">
                <strong>{mover.displayName}</strong>
                <span className="dev-hub-meta">
                  {squadStatusLabel(mover.squadStatus)} · {mover.position} · CA {mover.ca}
                  {mover.caDelta !== null ? (
                    <span className={caDeltaClassName(mover.caDelta)}> · Δ {formatCaDelta(mover.caDelta)}</span>
                  ) : null}
                </span>
              </span>
              <span className="dev-hub-growth" title="Attributzuwachs (26 Wochen)">
                ▲ {formatRecentGrowth(mover.recentGrowth)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
