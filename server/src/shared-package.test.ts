import { describe, expect, it } from "vitest";
import { asTeamId, PITCH_MAX } from "@fussballmanager/shared";

describe("shared workspace package", () => {
  it("resolves branded ids and pitch constants", () => {
    expect(asTeamId("fc-nordstern")).toBe("fc-nordstern");
    expect(PITCH_MAX).toBe(100);
  });
});
