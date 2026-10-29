import { describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.ts";
import { localizeStoryInbox } from "../i18n/story-display.ts";
import { applyStoryChoice, MORALE_CRISIS_TRIP_COST } from "../narrative/apply.ts";
import { advanceNarrativeWeek } from "../narrative/pipeline-week.ts";
import { storyInboxPayload } from "../narrative/render.ts";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import { pendingInboxItems } from "../youth/decision-inbox.ts";
import { normalizePressState } from "./press-state.ts";
import {
  advancePressWeek,
  averageProMorale,
  MORALE_CRISIS_DEEP_WEEKS,
  PRESS_BOYCOTT_WEEKS,
  seasonBeatId,
} from "./press-week.ts";

function storyReady(session: GameSession): GameSession {
  return { ...session, storyState: { ...session.storyState, opening_complete: true } };
}

function withRelationship(session: GameSession, relationship: number, extra = {}): GameSession {
  const press = normalizePressState(session.storyState.press);
  return {
    ...session,
    storyState: { ...session.storyState, press: { ...press, known_topic_ids: [], relationship, ...extra } },
  };
}

function withSquadMorale(session: GameSession, morale: number): GameSession {
  return {
    ...session,
    players: session.players.map((player) =>
      player.club_id === session.clubId && player.squad_status === "pro"
        ? { ...player, state: { ...player.state, morale } }
        : player,
    ),
  };
}

function tick(session: GameSession) {
  return advancePressWeek({
    story: session.storyState,
    players: session.players,
    board: session.board,
    stadium: session.stadium,
    clubId: session.clubId,
    season: session.season,
    week: session.week,
    topicSession: session,
  });
}

function openBeatIds(inbox: GameSession["youthInbox"], players: GameSession["players"]): string[] {
  return [...pendingInboxItems(inbox, players), ...inbox.queue]
    .map((item) => item.narrative?.beatId ?? "")
    .filter(Boolean);
}

describe("press week tick", () => {
  it("seeds the covered-topic list on the first tick", () => {
    const session = newGameSession();
    expect(normalizePressState(session.storyState.press).known_topic_ids).toBeUndefined();
    expect(normalizePressState(tick(session).story.press).known_topic_ids).toBeDefined();
  });

  it("drifts back towards neutral when no campaign runs", () => {
    expect(normalizePressState(tick(withRelationship(newGameSession(), 70)).story.press).relationship).toBe(69);
    expect(normalizePressState(tick(withRelationship(newGameSession(), 40)).story.press).relationship).toBe(41);
  });

  it("starts a hostile campaign below 30 that leans on board and fans until 35", () => {
    const session = withRelationship(newGameSession(), 28);
    const result = tick(session);
    expect(normalizePressState(result.story.press).campaign_since).toBe(careerWeekIndex(session.season, session.week));
    expect(result.board.pressure).toBe(session.board.pressure + 1);
    expect(result.stadium.fanbase ?? 0).toBeLessThan(session.stadium.fanbase ?? 0);

    const recovered = withRelationship(newGameSession(), 36, { campaign_since: 1 });
    expect(normalizePressState(tick(recovered).story.press).campaign_since).toBeNull();
  });

  it("lets the squad read the papers below 25", () => {
    const session = withRelationship(newGameSession(), 22);
    expect(averageProMorale(tick(session).players, session.clubId)).toBeLessThan(
      averageProMorale(session.players, session.clubId),
    );
  });

  it("boycotts below 12 for four weeks, once a season", () => {
    const session = withRelationship(newGameSession(), 10);
    const now = careerWeekIndex(session.season, session.week);
    expect(normalizePressState(tick(session).story.press).boycott_until).toBe(now + PRESS_BOYCOTT_WEEKS - 1);

    const fired = {
      ...session,
      storyState: {
        ...session.storyState,
        beats_fired: [seasonBeatId("press_crisis_boycott", session.season)],
      },
    };
    expect(normalizePressState(tick(fired).story.press).boycott_until).toBeUndefined();
  });

  it("counts crisis weeks and, at four, leaks and hands in transfer requests", () => {
    const session = withSquadMorale(newGameSession(), 20);
    const deep = {
      ...session,
      storyState: { ...session.storyState, morale_low_weeks: MORALE_CRISIS_DEEP_WEEKS - 1 },
    };
    const result = tick(deep);
    expect(result.story.morale_low_weeks).toBe(MORALE_CRISIS_DEEP_WEEKS);
    expect(normalizePressState(result.story.press).leak_pending).toBe(true);
    const leaving = result.players.filter(
      (player) => player.club_id === session.clubId && player.state.desire_to_leave,
    );
    expect(leaving.length).toBeGreaterThan(0);
    expect(tick(withSquadMorale(newGameSession(), 70)).story.morale_low_weeks).toBe(0);
  });
});

describe("crisis story beats", () => {
  it("convenes the players' council and the assistant after two bad weeks", () => {
    const base = withSquadMorale(storyReady(newGameSession()), 20);
    const session = { ...base, storyState: { ...base.storyState, morale_low_weeks: 1 } };
    const result = advanceNarrativeWeek(session, null);
    const ids = openBeatIds(result.youthInbox, result.players);
    expect(ids).toContain(seasonBeatId("morale_crisis_council", session.season));
    expect(ids).toContain(seasonBeatId("morale_crisis_assistant", session.season));
  });

  it("walks the press ladder: campaign, papers, ultimatum", () => {
    const session = withRelationship(storyReady(newGameSession()), 15, {
      campaign_since: careerWeekIndex(1, 1) - 5,
    });
    const result = advanceNarrativeWeek({ ...session, week: 2 }, null);
    const ids = openBeatIds(result.youthInbox, result.players);
    expect(ids).toContain(seasonBeatId("press_crisis_campaign", session.season));
    expect(ids).toContain(seasonBeatId("press_crisis_papers", session.season));
    expect(ids).toContain(seasonBeatId("press_crisis_ultimatum", session.season));
  });

  it("fires each crisis beat only once a season", () => {
    const session = withRelationship(storyReady(newGameSession()), 15, { campaign_since: 1 });
    const first = advanceNarrativeWeek(session, null);
    const second = advanceNarrativeWeek(
      { ...session, storyState: first.storyState, youthInbox: first.youthInbox, players: first.players },
      null,
    );
    const campaign = seasonBeatId("press_crisis_campaign", session.season);
    const count = [...second.youthInbox.items, ...second.youthInbox.queue].filter(
      (item) => item.narrative?.beatId === campaign,
    ).length;
    expect(count).toBe(1);
  });
});

describe("crisis choices", () => {
  const context = (session: GameSession, assistantQuality = 55) => ({
    board: session.board,
    stadium: session.stadium,
    players: session.players,
    finances: session.finances,
    clubId: session.clubId,
    season: session.season,
    week: session.week,
    assistantQuality,
  });

  it("a scapegoat closes ranks but breaks the one player", () => {
    const session = withSquadMorale(newGameSession(), 30);
    const beatId = seasonBeatId("morale_crisis_council", 1);
    const result = applyStoryChoice(session.storyState, beatId, "scapegoat", context(session));
    const pros = result.players!.filter((player) => player.club_id === session.clubId && player.squad_status === "pro");
    const broken = pros.filter((player) => player.state.morale < 30);
    expect(broken).toHaveLength(1);
    expect(broken[0]!.state.desire_to_leave).toBe(true);
    expect(pros.filter((player) => player.state.morale > 30).length).toBe(pros.length - 1);
  });

  it("a sharper assistant's team trip lifts morale more, and it costs money", () => {
    const session = withSquadMorale(newGameSession(), 30);
    const beatId = seasonBeatId("morale_crisis_assistant", 1);
    const sharp = applyStoryChoice(session.storyState, beatId, "bonding_trip", context(session, 85));
    const unsure = applyStoryChoice(session.storyState, beatId, "bonding_trip", context(session, 40));
    const morale = (players: GameSession["players"]) => averageProMorale(players, session.clubId);
    expect(morale(sharp.players!)).toBeGreaterThan(morale(unsure.players!));
    expect(sharp.finances!.cash).toBe(session.finances.cash - MORALE_CRISIS_TRIP_COST);
  });

  it("an apology mends the press relationship", () => {
    const session = withRelationship(newGameSession(), 15);
    const result = applyStoryChoice(
      session.storyState,
      seasonBeatId("press_crisis_ultimatum", 1),
      "apology",
      context(session),
    );
    expect(normalizePressState(result.story.press).relationship).toBe(30);
  });
});

describe("crisis beat text", () => {
  it("renders the assistant proposal at the assistant's skill tier", () => {
    setLocale("en");
    const session = newGameSession();
    const beatId = seasonBeatId("morale_crisis_assistant", 1);
    const payload = {
      ...storyInboxPayload(beatId, session.storyState.cast, { tier: "sharp" }),
      context: { tier: "sharp" },
    };
    const sharp = localizeStoryInbox(payload, session.storyState.cast);
    const unsure = localizeStoryInbox({ ...payload, context: { tier: "unsure" } }, session.storyState.cast);
    expect(sharp.body).toContain("has a plan");
    expect(unsure.body).toContain("out of ideas");
    expect(sharp.choices.map((choice) => choice.label)).toEqual(["Team trip (€60,000)", "Day off"]);
    setLocale("de");
  });
});
