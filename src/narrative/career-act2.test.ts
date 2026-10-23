import { describe, expect, it } from "vitest";
import { localizeStoryInbox } from "../i18n/story-display.ts";
import { setLocale } from "../i18n/index.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { ACT2_ANALYSIS_MODULE_COST, ACT2_UNLOCK_BEATS } from "./career-act2-schedule.ts";
import {
  act2Week,
  applyCareerActChoice,
  detectCareerActBeats,
  grantStoryUnlock,
  resolveDuePayoffs,
} from "./career-act2.ts";
import { applyStoryChoice } from "./apply.ts";
import { fullFeatureCurtain, resolveFeatureCurtain } from "./career-presentation.ts";
import { markBeatFired, type StoryState } from "./story-state.ts";

const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { mode: "story_mode" });
const START = { season: 2, week: 1 };
const act2: StoryState = {
  ...session.storyState,
  career_phase: "act2_regional",
  act_started: { phase: "act2_regional", ...START },
  curtain_unlocks: ["tactics_sliders"],
  cast: { ...session.storyState.cast, chairman_name: "Gerd Petersen" },
};
const ctx = (week: number) => ({
  board: session.board,
  stadium: session.stadium,
  players: session.players,
  finances: session.finances,
  clubId: session.clubId,
  season: START.season,
  week,
});

/** Play the schedule: fire due beats week by week and resolve each with its first choice. */
function playAct2(weeks: number) {
  let story = act2;
  const fired: Array<{ beatId: string; actWeek: number }> = [];
  for (let week = START.week; week < START.week + weeks; week++) {
    story = resolveDuePayoffs(story, START.season, week);
    for (const payload of detectCareerActBeats(story, START.season, week)) {
      story = markBeatFired(story, payload.beatId);
      fired.push({ beatId: payload.beatId, actWeek: act2Week(story, START.season, week)! });
      story = applyCareerActChoice(story, payload.beatId, payload.choices[0]!.id, ctx(week)).story;
    }
  }
  return { story, fired };
}

describe("Act 2 unlock schedule (PRD 19)", () => {
  it("fires every beat once, at its act week, in order", () => {
    const { fired } = playAct2(34);
    expect(fired.map((entry) => entry.beatId)).toEqual(ACT2_UNLOCK_BEATS.map((beat) => beat.beatId));
    expect(fired.map((entry) => entry.actWeek)).toEqual(ACT2_UNLOCK_BEATS.map((beat) => beat.actWeek));
  });

  it("opens the full curtain by the end of the first Act 2 season", () => {
    const { story } = playAct2(34);
    expect(resolveFeatureCurtain(story)).toEqual(fullFeatureCurtain());
  });

  it("keeps youth camps hidden until the season-2 chairman beat", () => {
    expect(playAct2(22).story.curtain_unlocks).not.toContain("youth_camps");
    const { story, fired } = playAct2(34);
    expect(fired.find((entry) => entry.beatId === "act2_youth_camps")?.actWeek).toBe(23);
    expect(resolveFeatureCurtain(story).youth_camps).toBe(true);
  });

  it("raises at most one beat per week even when several are overdue", () => {
    expect(detectCareerActBeats(act2, START.season, START.week + 20)).toHaveLength(1);
  });

  it("stays silent outside Story Mode Act 2", () => {
    expect(detectCareerActBeats(session.storyState, START.season, 10)).toEqual([]);
    const regionalliga = newGameSession(new Date("2026-08-01T12:00:00Z")).storyState;
    expect(detectCareerActBeats({ ...regionalliga, act_started: act2.act_started }, 2, 10)).toEqual([]);
  });
});

describe("Act 2 choices and payoffs", () => {
  it("each resolve grants exactly its unlocks with one chronicle line per unlock", () => {
    const before = act2.chronicle_entries.length;
    const result = applyCareerActChoice(act2, "act2_chair_infra_vote", "hall", ctx(3));
    expect(result.story.curtain_unlocks).toEqual(["tactics_sliders", "stadium", "finances_deep"]);
    expect(result.story.chronicle_entries.length).toBe(before + 2);
    expect(result.story.choices.act2_chair_infra_vote?.option_id).toBe("hall");
    expect(result.players).toBeDefined();
  });

  it("letting the assistant keep the keys delays manual training by two weeks", () => {
    const result = applyCareerActChoice(act2, "act2_asst_training_keys", "assistant", ctx(11));
    expect(result.story.curtain_unlocks).not.toContain("manual_training");
    expect(resolveDuePayoffs(result.story, START.season, 12).curtain_unlocks).not.toContain("manual_training");
    const due = resolveDuePayoffs(result.story, START.season, 13);
    expect(due.curtain_unlocks).toContain("manual_training");
    expect(due.scheduled_payoffs).toEqual([]);
    expect(due.chronicle_entries.some((entry) => entry.id === "chronicle_unlock_manual_training")).toBe(true);
  });

  it("buying the analysis module costs cash; deferring unlocks it eight weeks later", () => {
    const bought = applyCareerActChoice(act2, "act2_salesman_analysis", "buy", ctx(15));
    expect(bought.finances!.cash).toBe(session.finances.cash - ACT2_ANALYSIS_MODULE_COST);
    expect(bought.story.curtain_unlocks).toContain("opponent_scout");
    const deferred = applyCareerActChoice(act2, "act2_salesman_analysis", "defer", ctx(15));
    expect(deferred.finances).toBeUndefined();
    expect(resolveDuePayoffs(deferred.story, START.season, 22).curtain_unlocks).not.toContain("opponent_scout");
    expect(resolveDuePayoffs(deferred.story, START.season, 23).curtain_unlocks).toContain("opponent_scout");
  });

  it("never grants an unlock twice", () => {
    const once = grantStoryUnlock(act2, "transfers", 2, 19);
    expect(grantStoryUnlock(once, "transfers", 2, 20)).toBe(once);
  });

  it("routes through applyStoryChoice like every other story beat", () => {
    const result = applyStoryChoice(act2, "act2_transfers_window", "ok", ctx(19));
    expect(result.story.curtain_unlocks).toContain("transfers");
  });

  it("localizes the inbox card with the chairman's name", () => {
    setLocale("en");
    const [payload] = detectCareerActBeats(act2, START.season, 3);
    const shown = localizeStoryInbox(payload!, act2.cast);
    expect(shown.title).toBe("Gerd Petersen · First investment");
    setLocale("de");
  });
});
