import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import type { DevelopmentMover } from "../../player/ca-tracking.ts";
import {
  developmentMoverPeriodDelta,
  type DevelopmentMoverPeriod,
} from "../../player/ca-tracking.ts";
import type { Player } from "../../types/player.ts";
import { DevelopmentDeskCard } from "./DevelopmentDeskCard.tsx";
import { DevelopmentMoverGridCard } from "./DevelopmentMoverGridCard.tsx";

/**
 * WIREFRAME: PRD 09.2 — Hub Entwicklung (Scout-style cards, context column)
 */
export function DevelopmentHubPanel({
  movers,
  onSelectPlayer,
  variant = "pipeline",
  period = "week",
  players = [],
  season = 1,
}: {
  movers: readonly DevelopmentMover[];
  onSelectPlayer: (playerId: string) => void;
  /** Manager Desk: horizontal compact cards. */
  variant?: "pipeline" | "desk";
  period?: DevelopmentMoverPeriod;
  players?: readonly Player[];
  season?: number;
}) {
  useT();
  if (movers.length === 0) return null;

  const playerById = new Map(players.map((player) => [player.id, player]));

  return (
    <section
      className={variant === "desk" ? "dev-hub dev-hub--desk" : "dev-hub"}
      aria-label={t("hub.dev.aria")}
    >
      <div className="dev-hub-head">
        <h3>{t("hub.dev.title")}</h3>
        {variant === "pipeline" ? <p className="dev-hub-sub">{t("hub.dev.sub")}</p> : null}
      </div>
      <ul className={variant === "desk" ? "dev-hub-desk-row" : "dev-hub-scout-grid"}>
        {movers.map((mover, index) => {
          const player = playerById.get(mover.playerId);
          const periodDelta = player
            ? developmentMoverPeriodDelta(player, period, season)
            : null;
          return variant === "desk" ? (
            <li key={mover.playerId}>
              <DevelopmentDeskCard
                mover={mover}
                rank={index + 1}
                periodDelta={periodDelta}
                onSelectPlayer={() => onSelectPlayer(mover.playerId)}
              />
            </li>
          ) : (
            <li key={mover.playerId} className="scouting-hits-grid-cell">
              <DevelopmentMoverGridCard
                mover={mover}
                rank={index + 1}
                onOpenProfile={() => onSelectPlayer(mover.playerId)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
