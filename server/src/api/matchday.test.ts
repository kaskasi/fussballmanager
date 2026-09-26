import { describe, expect, it } from "vitest";
import { runMatchday } from "./matchday.ts";

describe("matchday api", () => {
  it("returns results and table for a division matchday", () => {
    const played = runMatchday({ matchday: 1, baseSeed: 2026 });
    expect(played.results).toHaveLength(3);
    expect(played.table).toHaveLength(6);
    expect(played.table[0]?.points).toBeGreaterThanOrEqual(0);
  });
});
