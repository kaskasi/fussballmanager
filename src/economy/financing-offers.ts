import type { BoardState } from "../board/board-state.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { dockedOccupiedCells, precinctBuildingLevel } from "../stadium/precinct.ts";
import { fanshopMerchLevel, isMerchOverCapacity } from "./merchandising-capacity.ts";
import { normalizeClubMerchandising } from "./merchandising.ts";
import { MERCH_SKU_IDS } from "./merchandising-skus.ts";
import { RELEGATION_ZONE_PLACE } from "../narrative/season-objectives.ts";
import {
  canEnqueueStoryFinancingOffer,
  financingChannelClosed,
  type FinancingCareerState,
} from "./financing.ts";
import {
  FINANCING_STORY_CHANNELS,
  isFinancingStoryChannel,
  type FinancingStoryChannelId,
} from "./financing-channels.ts";
import type { ClubFinances } from "./club-finances.ts";
import type { YouthInboxState } from "../youth/decision-inbox.ts";
import { pendingInboxItems } from "../youth/decision-inbox.ts";

function financingOfferRoll(masterSeed: number, season: number, week: number, channel: string): number {
  let hash = masterSeed ^ season ^ week;
  for (const ch of channel) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return (hash >>> 0) % 10_000;
}

export function inboxHasFinancingOffer(inbox: YouthInboxState): boolean {
  return pendingInboxItems(inbox).some(
    (item) => item.kind === "financing_offer" || isFinancingStoryChannel(item.narrative?.beatId ?? ""),
  );
}

export interface FinancingOfferContext {
  finances: ClubFinances;
  stadium: ClubStadium;
  board: BoardState;
  financing: FinancingCareerState;
  leaguePlace: number;
  season: number;
  week: number;
  masterSeed: number;
}

function merchAnySkuOverCapacity(stadium: ClubStadium): boolean {
  const merch = normalizeClubMerchandising(stadium.merchandising);
  const level = fanshopMerchLevel(stadium.precinct);
  return MERCH_SKU_IDS.some((sku) =>
    isMerchOverCapacity(merch.skus[sku]?.stock ?? 0, level, sku),
  );
}

function channelEligible(id: FinancingStoryChannelId, ctx: FinancingOfferContext): boolean {
  if (financingChannelClosed(ctx.financing, id)) return false;
  switch (id) {
    case "loan_shark_instant":
      return (
        ctx.finances.cash < 0 &&
        ctx.leaguePlace >= RELEGATION_ZONE_PLACE &&
        ctx.board.pressure >= 55
      );
    case "fan_stadium_coop": {
      const precinct = ctx.stadium.precinct;
      const shopLevel =
        precinct && dockedOccupiedCells(precinct, "fanshop") > 0
          ? precinctBuildingLevel(precinct, "fanshop")
          : 0;
      return shopLevel >= 2 && (ctx.stadium.fanbase ?? 50) >= 54 && ctx.season >= 1;
    }
    case "naming_rights_sale":
      return ctx.season >= 2 && !ctx.stadium.naming_rights_sponsor;
    case "merch_digi_drop":
      return merchAnySkuOverCapacity(ctx.stadium);
    default:
      return false;
  }
}

/** Pick at most one story financing channel to offer this week (PRD 11.12.5). */
export function pickFinancingStoryOffer(ctx: FinancingOfferContext): FinancingStoryChannelId | null {
  if (!canEnqueueStoryFinancingOffer(ctx.financing)) return null;
  const eligible = FINANCING_STORY_CHANNELS.filter((id) => channelEligible(id, ctx));
  if (eligible.length === 0) return null;
  eligible.sort(
    (a, b) => financingOfferRoll(ctx.masterSeed, ctx.season, ctx.week, a) - financingOfferRoll(ctx.masterSeed, ctx.season, ctx.week, b),
  );
  return eligible[0] ?? null;
}

export function markFinancingOfferQueued(
  financing: FinancingCareerState,
  channelId: FinancingStoryChannelId,
): FinancingCareerState {
  const status = financing.channel_status[channelId];
  if (status === "offered" || status === "accepted" || status === "declined") {
    return financing;
  }
  return {
    ...financing,
    story_offers_shown: financing.story_offers_shown + 1,
    channel_status: { ...financing.channel_status, [channelId]: "offered" },
  };
}

export function closeFinancingChannel(
  financing: FinancingCareerState,
  channelId: string,
  outcome: "accepted" | "declined",
): FinancingCareerState {
  return {
    ...financing,
    channel_status: { ...financing.channel_status, [channelId]: outcome },
  };
}
