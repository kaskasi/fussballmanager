import { describe, expect, it } from "vitest";
import { generateSyncCode, isValidSyncCode, normalizeSyncCodeInput } from "./sync-code.ts";

describe("sync-code", () => {
  it("generates valid codes", () => {
    const code = generateSyncCode();
    expect(isValidSyncCode(code)).toBe(true);
    expect(code.startsWith("fuss-")).toBe(true);
  });

  it("normalizes input", () => {
    expect(normalizeSyncCodeInput("  FUSS-Abcd-Efgh  ")).toBe("fuss-abcd-efgh");
  });
});
