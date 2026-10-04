import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import {
  caDeltaClassName,
  formatCaDelta,
  formatRecentGrowth,
  squadStatusLabel,
} from "../../player/ca-tracking.ts";

/**
 * WIREFRAME: PRD 09.2 — Hub Entwicklung (Top-Mover, horizontal)
 */
export function DevelopmentHubPanel({
  movers,
  onSelectPlayer,
}: {
  movers: readonly DevelopmentMover[];
  onSelectPlayer: (playerId: string) => void;
}) {
  useT();
  if (movers.length === 0) return null;

  return (
    <section className="dev-hub" aria-label={t("hub.dev.aria")}>
      <div className="dev-hub-head">
        <h3>{t("hub.dev.title")}</h3>
        <p className="dev-hub-sub">{t("hub.dev.sub")}</p>
      </div>
      <ul className="dev-hub-list dev-hub-list-horizontal">
        {movers.map((mover, index) => (
          <li key={mover.playerId}>
            <button type="button" className="dev-hub-card" onClick={() => onSelectPlayer(mover.playerId)}>
              <div className="dev-hub-card-top">
                <span className="dev-hub-rank" aria-hidden="true">{index + 1}</span>
                <strong className="dev-hub-name">{mover.displayName}</strong>
              </div>
              <div className="dev-hub-card-bottom">
                <span className="dev-hub-meta">
                  {mover.position} · CA {mover.ca}
                  {mover.caDelta !== null ? (
                    <span className={caDeltaClassName(mover.caDelta)}> · Δ {formatCaDelta(mover.caDelta)}</span>
                  ) : null}
                  <span className="dev-hub-status">{squadStatusLabel(mover.squadStatus)}</span>
                </span>
                <span className="dev-hub-growth" title="Attributzuwachs (26 Wochen)">
                  ▲ {formatRecentGrowth(mover.recentGrowth)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
