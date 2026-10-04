import { describe, expect, it } from "vitest";
import { setLocale, t } from "./index.ts";

describe("i18n", () => {
  it("falls back to de for missing keys", () => {
    setLocale("en");
    expect(t("shell.nav.pipeline")).toBe("Pipeline");
    expect(t("nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
  });

  it("interpolates params", () => {
    setLocale("de");
    expect(t("opening.story.welcome", { name: "Kim" })).toBe("Willkommen, Kim");
  });

  it("serves zh-Hans strings", () => {
    setLocale("zh-Hans");
    expect(t("shell.nav.finances")).toBe("财务");
  });
});
