/** WIREFRAME: design.md §9.9 — Desk: Scouting + Transfer-Angebote (Liste) */
import { useMemo } from "react";
import { ArrowDownLeft, MapPin, Radar, Users } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { buildHubScoutingDigest } from "../../hub/hub-scouting-digest.ts";
import { listPendingInboundOffers } from "../../transfers/inbound-offers.ts";
import { loanClubName } from "../../transfers/loan-roster.ts";
import { clubListingsForPlayers } from "../../transfers/transfer-listings.ts";
import type { TransferState } from "../../transfers/negotiations.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { Player } from "../../types/player.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { COACH_TARGET } from "../../tutorial/index.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

function findRosterPlayer(
  playerId: string,
  players: readonly Player[],
  rivalPlayers: readonly Player[],
): Player | undefined {
  return players.find((row) => row.id === playerId) ?? rivalPlayers.find((row) => row.id === playerId);
}

export function HubScoutingTransferDeskPanel({
  players,
  rivalPlayers = [],
  clubId,
  season,
  scoutBoard,
  transferState,
  matchSetup,
  worldClubs,
  onSelectPlayer,
  onOpenNegotiation,
  onOpenScouting,
  onOpenTransfers,
}: {
  players: readonly Player[];
  rivalPlayers?: readonly Player[];
  clubId: string;
  season: number;
  scoutBoard: ScoutBoard;
  transferState: TransferState;
  matchSetup: CareerMatchSetup | null;
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  onOpenNegotiation?: (playerId: string) => void;
  onOpenScouting: () => void;
  onOpenTransfers: () => void;
}) {
  useT();
  const digest = useMemo(
    () => buildHubScoutingDigest(scoutBoard, season, matchSetup),
    [scoutBoard, season, matchSetup],
  );

  const listings = useMemo(
    () => clubListingsForPlayers(transferState, clubId, players),
    [transferState, clubId, players],
  );
  const inbound = useMemo(
    () => listPendingInboundOffers(transferState, clubId, players),
    [transferState, clubId, players],
  );
  const offerByPlayer = useMemo(
    () => new Map(inbound.map((row) => [row.player_id, row])),
    [inbound],
  );
  const listedWaiting = useMemo(
    () => listings.filter((row) => !offerByPlayer.has(row.player_id)),
    [listings, offerByPlayer],
  );

  const activeNegotiations = useMemo(
    () =>
      (transferState.negotiations ?? []).filter(
        (row) => row.status === "active" && row.seller_club_id !== clubId,
      ),
    [transferState.negotiations, clubId],
  );

  const hasTransferRows =
    inbound.length > 0 || listedWaiting.length > 0 || activeNegotiations.length > 0;

  return (
    <section
      className="hub-market-desk manager-desk__market-panel"
      aria-label={t("hub.market.aria")}
      data-coach-target={COACH_TARGET.hubScoutingTransfer}
    >
      <div
        className="hub-market-desk__zone hub-market-desk__zone--transfer"
        role="region"
        aria-label={t("hub.market.openTransfers")}
        onClick={onOpenTransfers}
      >
        <header className="hub-market-desk__head">
          <h2 className="hub-market-desk__title">{t("hub.market.title")}</h2>
          <p className="hub-market-desk__sub">{t("hub.market.sub")}</p>
        </header>

        <div className="hub-market-desk__scroll">
          {!hasTransferRows ? (
            <p className="hub-market-desk__empty">{t("hub.market.listEmpty")}</p>
          ) : (
            <ul className="hub-market-desk__list">
              {inbound.map((offer) => {
              const player = findRosterPlayer(offer.player_id, players, rivalPlayers);
              const listing = listings.find((row) => row.player_id === offer.player_id);
              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    className="hub-market-desk__row hub-market-desk__row--offer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPlayer(offer.player_id);
                    }}
                  >
                    {player ? (
                      <PlayerPortrait
                        seed={player.portrait_seed}
                        clubId={player.club_id}
                        size="sm"
                        variant="known"
                      />
                    ) : null}
                    <span className="hub-market-desk__copy">
                      <strong>{player ? formatPlayerName(player) : offer.player_id}</strong>
                      <small>
                        <ArrowDownLeft size={12} strokeWidth={2.5} aria-hidden />
                        {t("hub.market.inboundFrom", {
                          club: loanClubName(offer.buyer_club_id, worldClubs),
                          fee: formatClubCash(offer.fee),
                        })}
                      </small>
                      {listing ? (
                        <small className="hub-market-desk__ask">
                          {t("hub.market.listAsk", { fee: formatClubCash(listing.asking_price) })}
                        </small>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
            {listedWaiting.map((listing) => {
              const player = findRosterPlayer(listing.player_id, players, rivalPlayers);
              return (
                <li key={listing.player_id}>
                  <button
                    type="button"
                    className="hub-market-desk__row"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPlayer(listing.player_id);
                    }}
                  >
                    {player ? (
                      <PlayerPortrait
                        seed={player.portrait_seed}
                        clubId={player.club_id}
                        size="sm"
                        variant="known"
                      />
                    ) : null}
                    <span className="hub-market-desk__copy">
                      <strong>{player ? formatPlayerName(player) : listing.player_id}</strong>
                      <small>{t("hub.market.listedWaiting")}</small>
                      <small className="hub-market-desk__ask">
                        {t("hub.market.listAsk", { fee: formatClubCash(listing.asking_price) })}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
            {activeNegotiations.map((neg) => {
              const player = findRosterPlayer(neg.player_id, players, rivalPlayers);
              return (
                <li key={neg.id}>
                  <button
                    type="button"
                    className="hub-market-desk__row"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (onOpenNegotiation) {
                        onOpenNegotiation(neg.player_id);
                      } else {
                        onSelectPlayer(neg.player_id);
                      }
                    }}
                  >
                    {player ? (
                      <PlayerPortrait
                        seed={player.portrait_seed}
                        clubId={player.club_id}
                        size="sm"
                        variant="known"
                      />
                    ) : null}
                    <span className="hub-market-desk__copy">
                      <strong>{player ? formatPlayerName(player) : neg.player_id}</strong>
                      <small>
                        {t("hub.market.negotiation", {
                          offer: formatClubCash(neg.current_offer),
                          round: neg.round,
                        })}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
          )}
        </div>
      </div>

      <button
        type="button"
        className="hub-market-desk__zone hub-market-desk__zone--scout"
        aria-label={t("hub.market.openScouting")}
        onClick={onOpenScouting}
      >
        <span className="hub-market-desk__zone-label">{t("shell.nav.scouting")}</span>
        <dl className="hub-market-desk__digest">
          {digest.opponentPrep ? (
            <div className="hub-market-desk__stat">
              <dt>
                <Radar size={16} strokeWidth={2} aria-hidden />
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
          <div className="hub-market-desk__stat">
            <dt>
              <MapPin size={16} strokeWidth={2} aria-hidden />
              {t("hub.scout.mapTrips")}
            </dt>
            <dd>{digest.activeMapTrips}</dd>
          </div>
          <div className="hub-market-desk__stat">
            <dt>
              <Users size={16} strokeWidth={2} aria-hidden />
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
      </button>
    </section>
  );
}
