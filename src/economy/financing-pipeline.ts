import type { GameSession } from "../persistence/game-session.ts";
import { leagueTablePlace } from "./club-finances.ts";
import { financingInboxPayload } from "../narrative/financing-render.ts";
import {
  enqueueFinancingInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import {
  inboxHasFinancingOffer,
  markFinancingOfferQueued,
  pickFinancingStoryOffer,
} from "./financing-offers.ts";
import type { FinancingCareerState } from "./financing.ts";

export interface FinancingPipelineWeekResult {
  youthInbox: YouthInboxState;
  financing: FinancingCareerState;
}

export function advanceFinancingStoryOffersWeek(session: GameSession): FinancingPipelineWeekResult {
  let inbox = session.youthInbox;
  let financing = session.financing;
  if (inboxHasFinancingOffer(inbox)) {
    return { youthInbox: inbox, financing };
  }
  const channel = pickFinancingStoryOffer({
    finances: session.finances,
    stadium: session.stadium,
    board: session.board,
    financing,
    leaguePlace: leagueTablePlace(session.league),
    season: session.season,
    week: session.week,
    masterSeed: session.masterSeed,
  });
  if (!channel) {
    return { youthInbox: inbox, financing };
  }
  const payload = financingInboxPayload(channel, session.storyState.cast);
  inbox = enqueueFinancingInboxItem(inbox, session.week, payload);
  financing = markFinancingOfferQueued(financing, channel);
  return { youthInbox: inbox, financing };
}
