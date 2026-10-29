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

type ListingRow = { listing: { player_id: string; club_id: string; asking_price: number }; player: Player };

/** Own transfer list (max 5 slots): each listed player shows its open bid or sale talk, if any. */
export function buildOwnListingCards(input: {
  clubId: string;
  everyone: readonly Player[];
  listingRows: readonly ListingRow[];
  saleTalks: readonly TransferNegotiation[];
  inboundOffers: readonly InboundTransferOffer[];
  worldClubs?: readonly WorldClub[];
}): TransferMarketCardModel[] {
  const findPlayer = (id: string) => input.everyone.find((row) => row.id === id);
  const offerFor = (id: string) => input.inboundOffers.find((row) => row.player_id === id);
  const talkFor = (id: string) => input.saleTalks.find((row) => row.player_id === id);

  const offerCard = (offer: InboundTransferOffer): TransferMarketCardModel => {
    const player = findPlayer(offer.player_id);
    return {
      id: offer.id,
      playerId: offer.player_id,
      player,
      kind: "inbound_offer",
      clubLabel: loanClubName(offer.buyer_club_id, input.worldClubs),
      priceLabel: formatClubCash(offer.fee),
      detailLine: t("transfers.market.inboundDetail"),
      ca: player ? listedPlayerCa(player) : undefined,
    };
  };
  const talkCard = (talk: TransferNegotiation): TransferMarketCardModel => {
    const player = findPlayer(talk.player_id);
    return {
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
    };
  };

  const cards: TransferMarketCardModel[] = [];
  const shown = new Set<string>();
  for (const { listing, player } of input.listingRows) {
    if (listing.club_id !== input.clubId) continue;
    shown.add(listing.player_id);
    const offer = offerFor(listing.player_id);
    const talk = talkFor(listing.player_id);
    if (offer) {
      cards.push(offerCard(offer));
    } else if (talk) {
      cards.push(talkCard(talk));
    } else {
      cards.push({
        id: `own_${listing.player_id}`,
        playerId: listing.player_id,
        player,
        kind: "own_listing",
        clubLabel: t("transfers.market.saleAwaitBidShort"),
        priceLabel: formatClubCash(listing.asking_price),
        ca: listedPlayerCa(player),
      });
    }
  }
  // Unsolicited bids and talks on players who are not listed still belong to the sales side.
  for (const offer of input.inboundOffers) {
    if (shown.has(offer.player_id)) continue;
    shown.add(offer.player_id);
    cards.push(offerCard(offer));
  }
  for (const talk of input.saleTalks) {
    if (shown.has(talk.player_id)) continue;
    shown.add(talk.player_id);
    cards.push(talkCard(talk));
  }
  return cards;
}

/** Possible transfer targets: running purchase talks first, then rival listings. */
export function buildTransferTargetCards(input: {
  clubId: string;
  everyone: readonly Player[];
  listingRows: readonly ListingRow[];
  purchaseTalks: readonly TransferNegotiation[];
  worldClubs?: readonly WorldClub[];
  scoutAssignedByPlayer: ReadonlyMap<string, boolean>;
}): TransferMarketCardModel[] {
  const findPlayer = (id: string) => input.everyone.find((row) => row.id === id);
  const purchaseIds = new Set(input.purchaseTalks.map((row) => row.player_id));
  const cards: TransferMarketCardModel[] = [];
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
  return cards;
}
