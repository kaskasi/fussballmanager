/** WIREFRAME: design.md §9.6 B — Transfermarkt: eigene Liste (5 Plätze) + Transferziele (Tabelle) */
import { useEffect, useMemo, useState } from "react";
import { Eye, Star, User } from "lucide-react";
import { useT } from "../../i18n/react.ts";
import type { Player, PositionPrimary } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { getBoardTarget } from "../../scouting/scout-board.ts";
import type { TransferNegotiation, TransferState } from "../../transfers/negotiations.ts";
import { listPendingInboundOffers } from "../../transfers/inbound-offers.ts";
import { MAX_OWN_LISTINGS, ownListingCount, searchListings } from "../../transfers/transfer-listings.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { ratingBand } from "../design/rating-band.ts";
import { FilterChip, FilterToolbar } from "./primitives/index.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { TransferMarketGridCard } from "./TransferMarketGridCard.tsx";
import {
  buildOwnListingCards,
  buildTransferTargetCards,
  type TransferMarketCardModel,
} from "./transfer-market-cards.ts";

const MARKET_POSITIONS: PositionPrimary[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];

const TARGET_PAGE_SIZE = 12;

export function TransferMarketPanel({
  players,
  rivalPlayers,
  clubId,
  transferState,
  worldClubs,
  scoutBoard,
  onOpenNegotiation,
  onScoutPlayer,
  onOpenProfile,
  onToggleShortlist,
}: {
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  clubId: string;
  transferState: TransferState;
  worldClubs?: readonly WorldClub[];
  scoutBoard: ScoutBoard;
  onOpenNegotiation: (playerId: string) => void;
  onScoutPlayer: (playerId: string) => void;
  onOpenProfile: (playerId: string) => void;
  onToggleShortlist: (playerId: string) => void;
}) {
  const t = useT();
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const [page, setPage] = useState(0);

  const everyone = useMemo(() => [...players, ...rivalPlayers], [players, rivalPlayers]);
  const listingRows = useMemo(() => {
    // A signed, agreed or contract-pending player leaves the board at once, not on the next week tick.
    const dealtIds = new Set([
      ...(transferState.pending_purchases ?? []).map((row) => row.player_id),
      ...(transferState.scheduled_transfers ?? []).map((row) => row.player_id),
    ]);
    return searchListings(transferState.listings ?? [], everyone, {}).filter(
      ({ listing, player }) => player.club_id === listing.club_id && !dealtIds.has(listing.player_id),
    );
  }, [transferState.listings, transferState.pending_purchases, transferState.scheduled_transfers, everyone]);

  const saleTalks = useMemo(
    () =>
      (transferState.negotiations ?? []).filter(
        (entry): entry is TransferNegotiation => entry.side === "sell" && entry.status === "active",
      ),
    [transferState.negotiations],
  );
  const purchaseTalks = useMemo(
    () =>
      (transferState.negotiations ?? []).filter(
        (entry): entry is TransferNegotiation =>
          entry.status === "active" && entry.seller_club_id !== clubId,
      ),
    [transferState.negotiations, clubId],
  );
  const inboundOffers = useMemo(
    () => listPendingInboundOffers(transferState, clubId, players),
    [transferState, clubId, players],
  );

  const shortlistIds = transferState.shortlist ?? [];

  const scoutAssignedByPlayer = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const player of rivalPlayers) {
      map.set(player.id, Boolean(getBoardTarget(scoutBoard, player.id, rivalPlayers)?.assigned));
    }
    return map;
  }, [scoutBoard, rivalPlayers]);

  const ownCards = useMemo(
    () =>
      buildOwnListingCards({ clubId, everyone, listingRows, saleTalks, inboundOffers, worldClubs }),
    [clubId, everyone, listingRows, saleTalks, inboundOffers, worldClubs],
  );
  const ownCount = ownListingCount(transferState, clubId);
  const freeSlots = Math.max(0, MAX_OWN_LISTINGS - ownCount);

  const targetCards = useMemo(
    () =>
      buildTransferTargetCards({
        clubId,
        everyone,
        listingRows,
        purchaseTalks,
        worldClubs,
        scoutAssignedByPlayer,
      }),
    [clubId, everyone, listingRows, purchaseTalks, worldClubs, scoutAssignedByPlayer],
  );

  const filteredTargets = useMemo(() => {
    if (position === "all") return targetCards;
    return targetCards.filter((card) => card.player?.position === position);
  }, [targetCards, position]);

  const pageCount = Math.max(1, Math.ceil(filteredTargets.length / TARGET_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [position, filteredTargets.length]);

  const pageTargets = filteredTargets.slice(
    page * TARGET_PAGE_SIZE,
    page * TARGET_PAGE_SIZE + TARGET_PAGE_SIZE,
  );

  return (
    <section className="tc-panel" aria-labelledby="transfers-market-title">
      <div className="tc-panel__head">
        <div>
          <h2 className="tc-panel__title" id="transfers-market-title">
            {t("transfers.market.title")}
          </h2>
          <p className="tc-caption tc-transfers__lead">{t("transfers.market.lead")}</p>
        </div>
      </div>

      <section className="tc-section" aria-labelledby="transfers-own-list-title">
        <h3 className="tc-label tc-section__title" id="transfers-own-list-title">
          {t("transfers.market.ownListTitle", { count: ownCount, max: MAX_OWN_LISTINGS })}
        </h3>
        <ul className="tc-deals tc-deals--slots">
          {ownCards.map((card) => (
            <li key={card.id}>
              <TransferMarketGridCard
                player={card.player}
                playerId={card.playerId}
                kind={card.kind}
                clubLabel={card.clubLabel}
                priceLabel={card.priceLabel}
                detailLine={card.detailLine}
                ca={card.ca}
                onOpen={() => onOpenNegotiation(card.playerId)}
                onOpenProfile={card.player ? () => onOpenProfile(card.playerId) : undefined}
              />
            </li>
          ))}
          {Array.from({ length: freeSlots }, (_, index) => (
            <li key={`free_${index}`}>
              <div className="tc-deal tc-deal--empty">
                <span className="tc-deal__name">{t("transfers.market.freeSlot")}</span>
                <span className="tc-deal__meta">{t("transfers.market.freeSlotHint")}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tc-section" aria-labelledby="transfers-targets-title">
        <h3 className="tc-label tc-section__title" id="transfers-targets-title">
          {t("transfers.market.targetsTitle", { count: targetCards.length })}
        </h3>
        <FilterToolbar ariaLabel={t("transfers.market.positionFilter")}>
          <FilterChip size="dense" active={position === "all"} onClick={() => setPosition("all")}>
            {t("scouting.filter.all")}
          </FilterChip>
          {MARKET_POSITIONS.map((slot) => (
            <FilterChip
              key={slot}
              size="dense"
              active={position === slot}
              onClick={() => setPosition(position === slot ? "all" : slot)}
            >
              {slot}
            </FilterChip>
          ))}
        </FilterToolbar>

        {filteredTargets.length === 0 ? (
          <p className="tc-empty">{t("transfers.market.empty")}</p>
        ) : (
          <>
            <div className="tc-table-wrap">
              <table className="tc-table tc-table--compact">
                <caption className="tc-sr">{t("transfers.market.targetsCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("squad.col.name")}</th>
                    <th scope="col" className="tc-num">{t("squad.col.pos")}</th>
                    <th scope="col" className="tc-num">{t("squad.col.age")}</th>
                    <th scope="col" className="tc-num">{t("squad.col.caShort")}</th>
                    <th scope="col">{t("transfers.market.col.club")}</th>
                    <th scope="col" className="tc-num">{t("transfers.market.col.price")}</th>
                    <th scope="col">{t("transfers.market.col.status")}</th>
                    <th scope="col">
                      <span className="tc-sr">{t("transfers.market.col.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageTargets.map((card) => (
                    <TransferTargetRow
                      key={card.id}
                      card={card}
                      shortlisted={shortlistIds.includes(card.playerId)}
                      onOpen={() => onOpenNegotiation(card.playerId)}
                      onScout={() => onScoutPlayer(card.playerId)}
                      onOpenProfile={card.player ? () => onOpenProfile(card.playerId) : undefined}
                      onToggleShortlist={() => onToggleShortlist(card.playerId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <nav className="tc-chips tc-transfers__pages" aria-label={t("transfers.market.pagination")}>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className="tc-chip tc-chip--dense"
                    aria-pressed={index === page}
                    aria-current={index === page ? "page" : undefined}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}

function TransferTargetRow({
  card,
  shortlisted,
  onOpen,
  onScout,
  onOpenProfile,
  onToggleShortlist,
}: {
  card: TransferMarketCardModel;
  shortlisted: boolean;
  onOpen: () => void;
  onScout: () => void;
  onOpenProfile?: () => void;
  onToggleShortlist: () => void;
}) {
  const t = useT();
  const { player } = card;
  const name = player ? formatPlayerName(player) : card.playerId;
  const talk = card.kind === "purchase_talk";
  return (
    <tr
      className="tc-row--link"
      tabIndex={0}
      role="button"
      aria-label={t("transfers.market.openTarget", { name })}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <td>
        <span className="tc-namecell">
          <PlayerPortrait
            seed={player?.portrait_seed ?? 0}
            nationality={player?.nationality}
            clubId={player?.club_id}
            size="sm"
            variant={player ? "known" : "silhouette"}
          />
          {name}
        </span>
      </td>
      <td className="tc-num">{player?.position ?? "–"}</td>
      <td className="tc-num">{player?.age ?? "–"}</td>
      <td className="tc-num">
        {card.ca != null ? (
          <span className={`tc-rating tc-rating--${ratingBand(card.ca)}`}>{card.ca}</span>
        ) : (
          "?"
        )}
      </td>
      <td>{card.clubLabel}</td>
      <td className="tc-num">
        <strong>{card.priceLabel}</strong>
      </td>
      <td>
        <span className={`tc-deal__badge${talk ? " tc-deal__badge--talk" : ""}`}>
          {t(talk ? "transfers.market.badgeNegotiation" : "transfers.market.badgeListed")}
        </span>
        {card.detailLine ? <span className="tc-caption"> {card.detailLine}</span> : null}
      </td>
      <td>
        <span className="tc-transfers__actions">
          <button
            type="button"
            className="tc-iconbtn"
            aria-pressed={shortlisted}
            aria-label={shortlisted ? t("scouting.watchlist.remove") : t("scouting.watchlist.add")}
            onClick={(event) => {
              event.stopPropagation();
              onToggleShortlist();
            }}
          >
            <Star className="tc-icon" aria-hidden fill={shortlisted ? "currentColor" : "none"} />
          </button>
          {card.showScoutAction ? (
            <button
              type="button"
              className="tc-iconbtn"
              aria-pressed={card.scoutAssigned}
              disabled={card.scoutAssigned}
              aria-label={card.scoutAssigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")}
              onClick={(event) => {
                event.stopPropagation();
                onScout();
              }}
            >
              <Eye className="tc-icon" aria-hidden />
            </button>
          ) : null}
          {onOpenProfile ? (
            <button
              type="button"
              className="tc-iconbtn"
              aria-label={t("scouting.hits.profileCta")}
              onClick={(event) => {
                event.stopPropagation();
                onOpenProfile();
              }}
            >
              <User className="tc-icon" aria-hidden />
            </button>
          ) : null}
        </span>
      </td>
    </tr>
  );
}
