/** WIREFRAME: design.md §9.6 B — Transfermarkt (Karten + Filter) */
import { useEffect, useMemo, useState } from "react";
import { useT } from "../../i18n/react.ts";
import type { Player, PositionPrimary } from "../../types/player.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import { getBoardTarget } from "../../scouting/scout-board.ts";
import type { TransferNegotiation, TransferState } from "../../transfers/negotiations.ts";
import { listPendingInboundOffers } from "../../transfers/inbound-offers.ts";
import { searchListings } from "../../transfers/transfer-listings.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { FilterChip, FilterToolbar } from "./primitives/index.ts";
import { TransferMarketGridCard } from "./TransferMarketGridCard.tsx";
import { buildTransferMarketCards } from "./transfer-market-cards.ts";

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

const MARKET_PAGE_SIZE = 8;

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
  const [flow, setFlow] = useState<"incoming" | "outgoing">("incoming");
  const [position, setPosition] = useState<PositionPrimary | "all">("all");
  const [page, setPage] = useState(0);

  const everyone = useMemo(() => [...players, ...rivalPlayers], [players, rivalPlayers]);
  const listingRows = useMemo(
    () =>
      searchListings(transferState.listings ?? [], everyone, {
        position: position === "all" ? undefined : position,
      }),
    [transferState.listings, everyone, position],
  );

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

  const allCards = useMemo(
    () =>
      buildTransferMarketCards({
        flow,
        clubId,
        everyone,
        listingRows,
        purchaseTalks,
        saleTalks,
        inboundOffers,
        worldClubs,
        scoutAssignedByPlayer,
      }),
    [
      flow,
      clubId,
      everyone,
      listingRows,
      purchaseTalks,
      saleTalks,
      inboundOffers,
      worldClubs,
      scoutAssignedByPlayer,
    ],
  );

  const filteredCards = useMemo(() => {
    if (position === "all") return allCards;
    return allCards.filter((card) => card.player?.position === position);
  }, [allCards, position]);

  const pageCount = Math.max(1, Math.ceil(filteredCards.length / MARKET_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [flow, position, filteredCards.length]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  const pageCards = filteredCards.slice(
    page * MARKET_PAGE_SIZE,
    page * MARKET_PAGE_SIZE + MARKET_PAGE_SIZE,
  );

  return (
    <section className="game-panel transfers-market-panel" aria-label={t("transfers.market.title")}>
      <header className="transfers-market-head">
        <h2>{t("transfers.market.title")}</h2>
        <p className="settings-section-lead">{t("transfers.market.lead")}</p>
      </header>

      <FilterToolbar ariaLabel={t("transfers.market.flowFilter")} className="transfers-market-flow-toolbar">
        <FilterChip active={flow === "incoming"} onClick={() => setFlow("incoming")}>
          {t("transfers.market.flowIncoming")}
        </FilterChip>
        <FilterChip active={flow === "outgoing"} onClick={() => setFlow("outgoing")}>
          {t("transfers.market.flowOutgoing")}
        </FilterChip>
      </FilterToolbar>

      <FilterToolbar ariaLabel={t("transfers.market.positionFilter")} className="transfers-position-toolbar">
        <FilterChip active={position === "all"} onClick={() => setPosition("all")}>
          {t("scouting.filter.all")}
        </FilterChip>
        {MARKET_POSITIONS.map((slot) => (
          <FilterChip
            key={slot}
            active={position === slot}
            onClick={() => setPosition(position === slot ? "all" : slot)}
          >
            {slot}
          </FilterChip>
        ))}
      </FilterToolbar>

      {filteredCards.length === 0 ? (
        <p className="transfers-market-empty">{t("transfers.market.empty")}</p>
      ) : (
        <>
          <div className="scouting-hits-grid-wrap transfers-market-grid-wrap">
            <ul className="scouting-hits-grid transfers-market-grid">
              {pageCards.map((card) => (
                <li key={card.id} className="scouting-hits-grid-cell">
                  <TransferMarketGridCard
                    player={card.player}
                    playerId={card.playerId}
                    kind={card.kind}
                    clubLabel={card.clubLabel}
                    priceLabel={card.priceLabel}
                    detailLine={card.detailLine}
                    ca={card.ca}
                    scoutAssigned={card.scoutAssigned}
                    showScoutAction={card.showScoutAction && flow === "incoming"}
                    shortlisted={shortlistIds.includes(card.playerId)}
                    onOpen={() => onOpenNegotiation(card.playerId)}
                    onScout={() => onScoutPlayer(card.playerId)}
                    onOpenProfile={
                      card.player ? () => onOpenProfile(card.playerId) : undefined
                    }
                    onToggleShortlist={() => onToggleShortlist(card.playerId)}
                  />
                </li>
              ))}
            </ul>
          </div>
          {pageCount > 1 ? (
            <nav className="transfers-market-pagination" aria-label={t("transfers.market.pagination")}>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={
                    index === page ? "transfers-market-page is-active" : "transfers-market-page"
                  }
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
  );
}
