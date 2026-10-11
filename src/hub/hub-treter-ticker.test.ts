import { describe, expect, it } from "vitest";
import { hubLatestTreterEdition, treterTickerLines } from "./hub-treter-ticker.ts";
import type { TreterArticle, TreterEdition } from "../media/kicker-digest.ts";

const emptyLeague: TreterEdition["league"] = { matchdaysPlayed: 0, table: [], scorers: [] };

function article(headline: string, kicker?: string): TreterArticle {
  return {
    id: headline,
    kind: "table",
    headline,
    kicker,
    body: "",
    layout: "column",
    priority: 1,
  };
}

function edition(partial: Omit<TreterEdition, "league">): TreterEdition {
  return { ...partial, league: emptyLeague };
}

describe("hubLatestTreterEdition", () => {
  it("prefers current when it has articles", () => {
    const current = edition({
      season: 1,
      week: 10,
      masthead: "",
      articles: [article("A")],
    });
    const archive = [
      edition({
        season: 1,
        week: 9,
        masthead: "",
        articles: [article("Old")],
      }),
    ];
    expect(hubLatestTreterEdition({ current, archive })?.week).toBe(10);
  });

  it("falls back to newest archive edition", () => {
    const archive = [
      edition({ season: 1, week: 7, masthead: "", articles: [article("W7")] }),
      edition({ season: 1, week: 8, masthead: "", articles: [article("W8")] }),
    ];
    expect(hubLatestTreterEdition({ archive })?.articles[0]?.headline).toBe("W8");
  });
});

describe("treterTickerLines", () => {
  it("joins kicker and headline", () => {
    const lines = treterTickerLines(
      edition({ season: 1, week: 1, masthead: "", articles: [article("Title", "Liga")] }),
    );
    expect(lines).toEqual(["Liga — Title"]);
  });
});
