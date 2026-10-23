import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { pendingInboxItems } from "../youth/decision-inbox.ts";
import { acceptJobOffer } from "./accept-job-offer.ts";
import { listJobOffers } from "./job-offers.ts";

describe("acceptJobOffer (F9.2, extracted from App)", () => {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"));
  const dismissed = { ...session, board: { ...session.board, job_status: "dismissed" as const } };
  const offer = listJobOffers(dismissed.board.employer_club_id, dismissed.season, dismissed.league)[0]!;

  it("switches club, pays the signing bonus and resets the board", () => {
    const next = acceptJobOffer(dismissed, offer.clubId);
    expect(next.league.player_club_id).toBe(offer.clubId);
    expect(next.board.employer_club_id).toBe(offer.clubId);
    expect(next.board.job_status).toBe("employed");
    expect(next.board.pressure).toBe(0);
    expect(next.clubEvents.length).toBeGreaterThan(dismissed.clubEvents.length);
  });

  it("queues the companion pick by default and skips it on request", () => {
    const withInbox = acceptJobOffer(dismissed, offer.clubId);
    expect(pendingInboxItems(withInbox.youthInbox, withInbox.players).some((item) => item.id.includes("manager_companion_pick"))).toBe(true);
    const without = acceptJobOffer(dismissed, offer.clubId, { companions: "none" });
    expect(pendingInboxItems(without.youthInbox, without.players).some((item) => item.id.includes("manager_companion_pick"))).toBe(false);
  });
});
