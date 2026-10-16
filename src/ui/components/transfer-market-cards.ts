import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";
import type { Player } from "../../types/player.ts";
import type { InboundTransferOffer } from "../../transfers/inbound-offers.ts";
import type { TransferNegotiation } from "../../transfers/negotiations.ts";
import { listedPlayerCa } from "../../transfers/transfer-listings.ts";
import { loanClubName } from "../../transfers/loan-roster.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import type { TransferMarketCardKind } from "./TransferMarketGridCard.tsx";

export type TransferMarketCardModel = {
  id: string;
  playerId: string;
  player: Player | undefined;
  kind: TransferMarketCardKind;
  clubLabel: string;
  priceLabel: string;
  detailLine?: string;
  ca?: number;
  scoutAssigned?: boolean;
  showScoutAction?: boolean;
};

export function buildTransferMarketCards(input: {
  flow: "incoming" | "outgoing";
  clubId: string;
  everyone: readonly Player[];
  listingRows: Array<{ listing: { player_id: string; club_id: string; asking_price: number }; player: Player }>;
  purchaseTalks: readonly TransferNegotiation[];
  saleTalks: readonly TransferNegotiation[];
  inboundOffers: readonly InboundTransferOffer[];
  worldClubs?: readonly WorldClub[];
  scoutAssignedByPlayer: ReadonlyMap<string, boolean>;
}): TransferMarketCardModel[] {
  const findPlayer = (id: string) => input.everyone.find((row) => row.id === id);
  const purchaseIds = new Set(input.purchaseTalks.map((row) => row.player_id));
  const saleIds = new Set(input.saleTalks.map((row) => row.player_id));
  const inboundIds = new Set(input.inboundOffers.map((row) => row.player_id));
  const cards: TransferMarketCardModel[] = [];

  if (input.flow === "incoming") {
    for (const talk of input.purchaseTalks) {
      const player = findPlayer(talk.player_id);
      cards.push({
        id: talk.id,
        playerId: talk.player_id,
        player,
        kind: "purchase_talk",
        clubLabel: loanClubName(talk.seller_club_id, input.worldClubs),
        priceLabel: formatClubCash(talk.counter_offer ?? talk.current_offer),
        detailLine: t("transfers.market.roundDetail", { round: talk.round }),
        ca: player ? listedPlayerCa(player) : undefined,
        scoutAssigned: input.scoutAssignedByPlayer.get(talk.player_id),
        showScoutAction: Boolean(player),
      });
    }
    for (const { listing, player } of input.listingRows) {
      if (listing.club_id === input.clubId) continue;
      if (purchaseIds.has(listing.player_id)) continue;
      cards.push({
        id: `list_${listing.player_id}`,
        playerId: listing.player_id,
        player,
        kind: "rival_listing",
        clubLabel: loanClubName(listing.club_id, input.worldClubs),
        priceLabel: formatClubCash(listing.asking_price),
        ca: listedPlayerCa(player),
        scoutAssigned: input.scoutAssignedByPlayer.get(player.id),
        showScoutAction: true,
      });
    }
  } else {
    for (const offer of input.inboundOffers) {
      const player = findPlayer(offer.player_id);
      cards.push({
        id: offer.id,
        playerId: offer.player_id,
        player,
        kind: "inbound_offer",
        clubLabel: loanClubName(offer.buyer_club_id, input.worldClubs),
        priceLabel: formatClubCash(offer.fee),
        detailLine: t("transfers.market.inboundDetail"),
        ca: player ? listedPlayerCa(player) : undefined,
      });
    }
    for (const talk of input.saleTalks) {
      const player = findPlayer(talk.player_id);
      cards.push({
        id: talk.id,
        playerId: talk.player_id,
        player,
        kind: "sale_talk",
        clubLabel: talk.buyer_club_id
          ? loanClubName(talk.buyer_club_id, input.worldClubs)
          : t("transfers.market.buyerUnknown"),
        priceLabel: formatClubCash(talk.counter_offer ?? talk.current_offer),
        detailLine: t("transfers.saleNegotiationsHeading"),
        ca: player ? listedPlayerCa(player) : undefined,
      });
    }
    for (const { listing, player } of input.listingRows) {
      if (listing.club_id !== input.clubId) continue;
      if (saleIds.has(listing.player_id) || inboundIds.has(listing.player_id)) continue;
      cards.push({
        id: `own_${listing.player_id}`,
        playerId: listing.player_id,
        player,
        kind: "own_listing",
        clubLabel: t("transfers.market.ownListing"),
        priceLabel: formatClubCash(listing.asking_price),
        ca: listedPlayerCa(player),
      });
    }
  }

  return cards;
}
