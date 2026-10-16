/** WIREFRAME: design.md §9.9 — Gegner-Scout unter Top-Entwicklung (Desk) */
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import { OpponentScoutMatchAction } from "./OpponentScoutMatchAction.tsx";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { COACH_TARGET } from "../../tutorial/index.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function HubOpponentScoutCompact({
  season,
  matchSetup,
  scoutBoard,
  scoutNetwork,
  onStartOpponentScout,
  onViewOpponentScoutReport,
}: {
  season: number;
  matchSetup: CareerMatchSetup | null;
  scoutBoard: ScoutBoard;
  scoutNetwork?: ScoutNetworkState;
  onStartOpponentScout?: () => void;
  onViewOpponentScoutReport?: (postfachItemId: string) => void;
}) {
  useT();
  const opponentClubId = matchSetup
    ? matchSetup.isHome
      ? matchSetup.awayTeamId
      : matchSetup.homeTeamId
    : null;
  const opponentLabel = matchSetup?.opponentShortName ?? "";

  return (
    <section
      className="hub-opponent-scout-compact game-panel"
      aria-label={t("scouting.opponent.panelAria")}
      data-coach-target={COACH_TARGET.hubOpponentScout}
    >
      {matchSetup && scoutNetwork && onStartOpponentScout ? (
        <>
          <div className="hub-opponent-scout-compact__fixture">
            {opponentClubId ? (
              <ClubCrest
                initials={opponentLabel.slice(0, 2).toUpperCase()}
                logoSrc={clubLogoUrlForId(opponentClubId)}
                size={36}
                alt={opponentLabel}
              />
            ) : null}
            <div className="hub-opponent-scout-compact__copy">
              <p className="hub-opponent-scout-compact__label">{t("scouting.opponent.fixture")}</p>
              <strong>{opponentLabel}</strong>
            </div>
          </div>
          <OpponentScoutMatchAction
            mode="hub"
            setup={matchSetup}
            season={season}
            scoutBoard={scoutBoard}
            scoutNetwork={scoutNetwork}
            onStart={onStartOpponentScout}
            onViewReport={onViewOpponentScoutReport}
          />
        </>
      ) : (
        <p className="hub-opponent-scout-compact__idle">{t("hub.scout.noMatchWeek")}</p>
      )}
    </section>
  );
}
