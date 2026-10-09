import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import { DevelopmentMoverGridCard } from "./DevelopmentMoverGridCard.tsx";

/**
 * WIREFRAME: PRD 09.2 — Hub Entwicklung (Scout-style cards, context column)
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
      <ul className="dev-hub-scout-grid">
        {movers.map((mover, index) => (
          <li key={mover.playerId} className="scouting-hits-grid-cell">
            <DevelopmentMoverGridCard
              mover={mover}
              rank={index + 1}
              onOpenProfile={() => onSelectPlayer(mover.playerId)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
