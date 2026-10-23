import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { simulateGameWeek } from "../sim/week-pipeline.ts";
import { leadershipCandidates } from "./captain.ts";
import { careerClubChoices, startCareerAtClub } from "./career-club-pick.ts";
import { completeOpening } from "./opening.ts";
import { SURVIVAL_TARGET_PLACE } from "./season-objectives.ts";

const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 4242 });
const choices = careerClubChoices(session);
const regionalliga = choices.filter((choice) => choice.divisionId === "regionalliga-nord");
const strongest = regionalliga.find((choice) => choice.strengthRank === 1)!;
const oberliga = choices.find((choice) => choice.divisionId === "oberliga-nord")!;
const bottom = regionalliga.find(
  (choice) => choice.arc === "relegation_battle" && choice.teamId !== NORDSTERN_ID,
)!;

describe("careerClubChoices (PRD 24 club pick)", () => {
  it("lists all 36 clubs ranked by squad strength per division", () => {
    expect(choices).toHaveLength(36);
    expect(regionalliga.map((choice) => choice.strengthRank)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(regionalliga[0]!.avgCa).toBeGreaterThanOrEqual(regionalliga[17]!.avgCa);
    expect(choices.every((choice) => choice.name && !choice.name.startsWith("world-"))).toBe(true);
  });

  it("keeps Kieler FC as an underdog with the relegation story", () => {
    const kfc = choices.find((choice) => choice.teamId === NORDSTERN_ID)!;
    expect(kfc.arc).toBe("relegation_battle");
    expect(kfc.strengthRank).toBeGreaterThan(9);
  });
});

describe("startCareerAtClub", () => {
  it("keeps Kieler FC untouched", () => {
    expect(startCareerAtClub(session, NORDSTERN_ID)).toBe(session);
  });

  it("a top Regionalliga club gets ambition goals instead of the survival story", () => {
    const next = startCareerAtClub(session, strongest.teamId);
    expect(next.league.player_club_id).toBe(strongest.teamId);
    expect(next.board.employer_club_id).toBe(strongest.teamId);
    expect(next.storyState.active_arc).toBe("club_ambition");
    const place = next.board.objectives.find((objective) => objective.id === "league_place");
    expect(place?.target).toBeLessThanOrEqual(4);
    const opened = completeOpening(
      next,
      "raffle",
      leadershipCandidates(next.players, next.clubId)[0]!.player.id,
      "Kim",
    );
    expect(opened.board.objectives).toEqual(next.board.objectives);
    expect(opened.youthInbox.items.some((item) => item.reason === "board_survival_intro")).toBe(false);
  });

  it("an Oberliga club plays for promotion", () => {
    const next = startCareerAtClub(session, oberliga.teamId);
    expect(next.league.division_id).toBe("oberliga-nord");
    expect(next.storyState.active_arc).toBe("promotion_push");
  });

  it("a bottom Regionalliga club keeps the survival goal", () => {
    const next = startCareerAtClub(session, bottom.teamId);
    expect(next.storyState.active_arc).toBe("relegation_battle");
    const place = next.board.objectives.find((objective) => objective.id === "league_place");
    expect(place?.target).toBe(SURVIVAL_TARGET_PLACE);
  });

  it("never lists the manager's own new players on the market and can play a week", async () => {
    const next = startCareerAtClub(session, strongest.teamId);
    const own = new Set(next.players.map((player) => player.id));
    expect((next.transferState.listings ?? []).some((listing) => own.has(listing.player_id))).toBe(false);
    expect(next.players.some((player) => player.club_id === next.clubId && player.squad_status === "pro")).toBe(true);
    const week = await simulateGameWeek(next);
    expect(week.session.league.player_club_id).toBe(strongest.teamId);
  });
});
