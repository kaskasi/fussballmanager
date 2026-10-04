import { describe, expect, it } from "vitest";
import type { MatchViewLine } from "@fussballmanager/shared";
import { setLocale } from "../i18n/index.ts";
import { localizeMatchLine } from "./localize-match-line.ts";

describe("localizeMatchLine", () => {
  it("resolves beat template per locale", () => {
    const line: MatchViewLine = {
      seq: 1,
      text: "Tor! Max trifft für FC!",
      i18nKey: "match.beat.shot_goal",
      i18nParams: { shooter: "Max", team: "FC" },
    };
    setLocale("en");
    expect(localizeMatchLine(line)).toBe("Goal! Max scores for FC!");
    setLocale("de");
    expect(localizeMatchLine(line)).toBe("Tor! Max trifft für FC!");
  });

  it("falls back to raw text when key missing", () => {
    setLocale("en");
    const line: MatchViewLine = {
      seq: 2,
      text: "Legacy line",
      i18nKey: "match.beat.nonexistent",
    };
    expect(localizeMatchLine(line)).toBe("Legacy line");
  });
});
