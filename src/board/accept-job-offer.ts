import type { TeamId } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";
import { withClubEvent } from "../inbox/club-events.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { enqueueCompanionPickInbox, pickCompanionCandidates } from "./companion-pick.ts";
import { listJobOffers, type JobOffer } from "./job-offers.ts";
import { switchManagerClub } from "./manager-club-switch.ts";
import { startBoardSeason } from "./season-objectives.ts";

export interface AcceptJobOfferOptions {
  /** "inbox" queues the companion pick (dismissal flow); "none" leaves followers to the caller. */
  companions?: "inbox" | "none";
  /** Offer card already resolved by the caller (Story Mode frozen offers). */
  offer?: JobOffer;
}

/** Take a job: new board season, club switch, signing bonus, club event. */
export function acceptJobOffer(
  current: GameSession,
  clubId: TeamId,
  options: AcceptJobOfferOptions = {},
): GameSession {
  const offer =
    options.offer ??
    listJobOffers(current.board.employer_club_id, current.season, current.league).find(
      (entry) => entry.clubId === clubId,
    );
  const bonus = offer?.signingBonus ?? 0;
  const oldTeamId = current.league.player_club_id;
  const oldCareerId = current.clubId;
  const companions =
    options.companions === "none"
      ? []
      : pickCompanionCandidates(
          current.players.filter(
            (player) => player.squad_status === "pro" && player.club_id === oldCareerId,
          ),
          current.masterSeed,
          oldTeamId,
          current.season,
        );
  const nextBoard = startBoardSeason(
    { ...current.board, job_status: "employed", pressure: 0 },
    clubId,
    current.season,
    current.league,
    current,
  );
  const switched = switchManagerClub({ ...current, board: nextBoard }, clubId);
  return {
    ...switched,
    finances: { ...switched.finances, cash: switched.finances.cash + bonus },
    youthInbox: enqueueCompanionPickInbox(switched.youthInbox, switched.week, companions, oldTeamId),
    clubEvents: withClubEvent(
      switched.clubEvents,
      switched.season,
      switched.week,
      "info",
      t("clubEvent.newJob", { club: offer?.clubName ?? clubId }),
    ),
  };
}
