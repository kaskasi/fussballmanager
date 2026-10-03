import { describe, expect, it } from "vitest";
import { pickStoryColorLine, storyBeatAllowsSlot } from "./story-slots.ts";

describe("pickStoryColorLine", () => {
  it("only fires on structural beats", () => {
    expect(storyBeatAllowsSlot("match_opening")).toBe(true);
    expect(storyBeatAllowsSlot("pass_key")).toBe(false);
  });

  it("emits derby color when flagged", () => {
    const picked = pickStoryColorLine({
      beat: "match_opening",
      ctx: { isDerby: true, opponentShortName: "REG" },
      fired: new Set(),
      seed: 1,
      seq: 0,
    });
    expect(picked?.slot).toBe("derby");
    expect(picked?.text).toContain("REG");
  });

  it("paraphrases fan feed without inventing scores", () => {
    const picked = pickStoryColorLine({
      beat: "half_time",
      ctx: {
        fanFeedHead: { speaker: "Kurvenstand", message: "Wir wollen drei Punkte!" },
      },
      fired: new Set(),
      seed: 2,
      seq: 10,
    });
    expect(picked?.slot).toBe("fan_mood");
    expect(picked?.text).toContain("Kurvenstand");
    expect(picked?.text).not.toMatch(/\d+–\d+/);
  });

  it("does not repeat a fired slot", () => {
    const fired = new Set<"derby">(["derby"]);
    const picked = pickStoryColorLine({
      beat: "match_opening",
      ctx: { isDerby: true, opponentShortName: "REG" },
      fired,
      seed: 1,
      seq: 0,
    });
    expect(picked?.slot).not.toBe("derby");
  });
});
