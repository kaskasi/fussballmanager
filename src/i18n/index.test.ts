import { describe, expect, it } from "vitest";
import de from "./locales/de.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };
import zhHans from "./locales/zh-Hans.json" with { type: "json" };
import { setLocale, t } from "./index.ts";

function localeKeys(pack: Record<string, string>): string[] {
  return Object.keys(pack).sort();
}

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

  it("keeps de, en, and zh-Hans locale packs in parity", () => {
    const kd = localeKeys(de as Record<string, string>);
    const ke = localeKeys(en as Record<string, string>);
    const kz = localeKeys(zhHans as Record<string, string>);
    expect(ke).toEqual(kd);
    expect(kz).toEqual(kd);
  });
});
