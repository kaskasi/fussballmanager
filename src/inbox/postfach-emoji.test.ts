import { describe, expect, it } from "vitest";
import { inboxEmojiLine, splitInboxEmojiPrefix } from "./postfach-emoji.ts";

describe("postfach-emoji", () => {
  it("splits a leading pictograph from archive text", () => {
    expect(splitInboxEmojiPrefix("🌱 Adrian legt Grünschnabel ab")).toEqual({
      emoji: "🌱",
      body: "Adrian legt Grünschnabel ab",
    });
  });

  it("leaves plain text unchanged", () => {
    expect(splitInboxEmojiPrefix("Camp fertig")).toEqual({ emoji: null, body: "Camp fertig" });
  });

  it("builds prefixed lines", () => {
    expect(inboxEmojiLine("📣", "Markt-Hinweis")).toBe("📣 Markt-Hinweis");
  });
});
