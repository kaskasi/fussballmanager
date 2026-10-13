/** WIREFRAME: design.md §9.9 — Hub duty column: opponent prep + scouting digest */
import { useMemo } from "react";
import { MapPin, Radar, Users } from "lucide-react";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import { buildHubScoutingDigest } from "../../hub/hub-scouting-digest.ts";
import { OpponentScoutMatchAction } from "./OpponentScoutMatchAction.tsx";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { COACH_TARGET } from "../../tutorial/index.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function HubOpponentScoutDeskPanel({
  season,
  matchSetup,
  scoutBoard,
  scoutNetwork,
  onStartOpponentScout,
  onViewOpponentScoutReport,
  onOpenScouting,
}: {
  season: number;
  matchSetup: CareerMatchSetup | null;
  scoutBoard: ScoutBoard;
  scoutNetwork?: ScoutNetworkState;
  onStartOpponentScout?: () => void;
  onViewOpponentScoutReport?: (postfachItemId: string) => void;
  onOpenScouting?: () => void;
}) {
  useT();
  const digest = useMemo(
    () => buildHubScoutingDigest(scoutBoard, season, matchSetup),
    [scoutBoard, season, matchSetup],
  );

  const opponentClubId = matchSetup
    ? matchSetup.isHome
      ? matchSetup.awayTeamId
      : matchSetup.homeTeamId
    : null;
  const opponentLabel = matchSetup?.opponentShortName ?? "";

  return (
    <section
      className="hub-opponent-scout-desk"
      aria-label={t("scouting.opponent.panelAria")}
      data-coach-target={COACH_TARGET.hubOpponentScout}
    >
      <div className="hub-opponent-scout-desk__cta game-panel">
        {matchSetup && scoutNetwork && onStartOpponentScout ? (
          <>
            <div className="hub-opponent-scout-desk__fixture">
              {opponentClubId ? (
                <ClubCrest
                  initials={opponentLabel.slice(0, 2).toUpperCase()}
                  logoSrc={clubLogoUrlForId(opponentClubId)}
                  size={48}
                  alt={opponentLabel}
                />
              ) : null}
              <div className="hub-opponent-scout-desk__fixture-copy">
                <p className="hub-opponent-scout-desk__fixture-label">{t("scouting.opponent.fixture")}</p>
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
          <p className="hub-opponent-scout-desk__idle">{t("hub.scout.noMatchWeek")}</p>
        )}
      </div>

      <dl className="hub-opponent-scout-desk__digest">
        {digest.opponentPrep ? (
          <div className="hub-opponent-scout-desk__stat">
            <dt>
              <Radar size={20} strokeWidth={2} aria-hidden />
              {t("hub.scout.opponentPrep")}
            </dt>
            <dd>
              {t("scouting.opponent.progress", {
                done: digest.opponentPrep.done,
                total: digest.opponentPrep.total,
              })}
            </dd>
          </div>
        ) : null}
        <div className="hub-opponent-scout-desk__stat">
          <dt>
            <MapPin size={20} strokeWidth={2} aria-hidden />
            {t("hub.scout.mapTrips")}
          </dt>
          <dd>{digest.activeMapTrips}</dd>
        </div>
        <div className="hub-opponent-scout-desk__stat">
          <dt>
            <Users size={20} strokeWidth={2} aria-hidden />
            {t("hub.scout.poolHits")}
          </dt>
          <dd>
            {t("hub.scout.poolBreakdown", {
              known: digest.poolKnown,
              unclear: digest.poolUnclear,
              unknown: digest.poolUnknown,
            })}
          </dd>
        </div>
      </dl>

      {onOpenScouting ? (
        <button type="button" className="link-btn hub-opponent-scout-desk__link" onClick={onOpenScouting}>
          {t("shell.nav.scouting")}
        </button>
      ) : null}
    </section>
  );
}
