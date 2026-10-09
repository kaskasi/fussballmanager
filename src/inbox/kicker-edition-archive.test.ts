import { describe, expect, it } from "vitest";
import {
  archiveKickerEdition,
  kickerEditionFromArchive,
  MAX_KICKER_EDITION_ARCHIVE,
  sessionKickerEditionLookup,
} from "./kicker-edition-archive.ts";

describe("kicker-edition-archive", () => {
  it("stores and replaces same week", () => {
    const a = { season: 1, week: 2, masthead: "A", articles: [] };
    const b = { season: 1, week: 2, masthead: "B", articles: [] };
    const once = archiveKickerEdition([], a);
    const twice = archiveKickerEdition(once, b);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.masthead).toBe("B");
  });

  it("caps archive size", () => {
    let archive = archiveKickerEdition([], { season: 1, week: 1, masthead: "x", articles: [] });
    for (let week = 2; week <= MAX_KICKER_EDITION_ARCHIVE + 5; week += 1) {
      archive = archiveKickerEdition(archive, { season: 1, week, masthead: `w${week}`, articles: [] });
    }
    expect(archive).toHaveLength(MAX_KICKER_EDITION_ARCHIVE);
    expect(kickerEditionFromArchive(archive, 1, 1)).toBeNull();
    expect(kickerEditionFromArchive(archive, 1, MAX_KICKER_EDITION_ARCHIVE + 5)?.masthead).toBe(
      `w${MAX_KICKER_EDITION_ARCHIVE + 5}`,
    );
  });

  it("prefers stored snapshot over current edition", () => {
    const stored = { season: 1, week: 3, masthead: "stored", articles: [] };
    const current = { season: 1, week: 3, masthead: "live", articles: [] };
    const found = sessionKickerEditionLookup([stored], current, 1, 3);
    expect(found?.masthead).toBe("stored");
  });
});
