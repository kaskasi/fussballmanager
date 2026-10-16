/** WIREFRAME: design.md §9.9 — Desk: Scouting + Transfer-Angebote (Liste) */
import { useMemo } from "react";
import { ArrowDownLeft, MapPin, Radar, Users } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { buildHubScoutingDigest } from "../../hub/hub-scouting-digest.ts";
import { listPendingInboundOffers } from "../../transfers/inbound-offers.ts";
import { listClubTransferListings } from "../../transfers/player-listings.ts";
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

function clubShortLabel(clubs: readonly WorldClub[] | undefined, clubId: string): string {
  return clubs?.find((entry) => entry.id === clubId)?.short_name ?? clubId;
}

export function HubScoutingTransferDeskPanel({
  players,
  clubId,
  season,
  scoutBoard,
  transferState,
  matchSetup,
  worldClubs,
  onSelectPlayer,
  onOpenScouting,
  onOpenTransfers,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  scoutBoard: ScoutBoard;
  transferState: TransferState;
  matchSetup: CareerMatchSetup | null;
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  onOpenScouting: () => void;
  onOpenTransfers: () => void;
}) {
  useT();
  const digest = useMemo(
    () => buildHubScoutingDigest(scoutBoard, season, matchSetup),
    [scoutBoard, season, matchSetup],
  );

  const listings = useMemo(
    () => listClubTransferListings(transferState, clubId, players),
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
              const player = players.find((row) => row.id === offer.player_id);
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
                          club: clubShortLabel(worldClubs, offer.buyer_club_id),
                          fee: formatClubCash(offer.fee),
                        })}
                      </small>
                      {listing ? (
                        <small className="hub-market-desk__ask">
                          {t("hub.market.listAsk", { fee: formatClubCash(listing.asking_fee) })}
                        </small>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
            {listedWaiting.map((listing) => {
              const player = players.find((row) => row.id === listing.player_id);
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
                        {t("hub.market.listAsk", { fee: formatClubCash(listing.asking_fee) })}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
            {activeNegotiations.map((neg) => {
              const player = players.find((row) => row.id === neg.player_id);
              return (
                <li key={neg.id}>
                  <button
                    type="button"
                    className="hub-market-desk__row"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPlayer(neg.player_id);
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
