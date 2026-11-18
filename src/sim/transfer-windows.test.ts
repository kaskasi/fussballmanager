import { describe, expect, it } from "vitest";
import {
  isTransferWindowOpen,
  transferWindowKind,
  transferWindowLabel,
} from "./transfer-windows.ts";

describe("transfer windows (PRD 05, PRD 35)", () => {
  it("detects summer in the pre-season and winter around New Year", () => {
    expect(isTransferWindowOpen(3)).toBe(true);
    expect(transferWindowKind(3)).toBe("summer");
    expect(transferWindowLabel(3)).toBe("Sommerfenster");
    expect(isTransferWindowOpen(6)).toBe(true);
    expect(isTransferWindowOpen(7)).toBe(false);

    expect(isTransferWindowOpen(26)).toBe(true);
    expect(isTransferWindowOpen(28)).toBe(true);
    expect(isTransferWindowOpen(29)).toBe(false);
    expect(transferWindowKind(26)).toBe("winter");
    expect(transferWindowLabel(26)).toBe("Winterfenster");
  });

  it("is closed outside window weeks", () => {
    expect(isTransferWindowOpen(1)).toBe(false);
    expect(isTransferWindowOpen(10)).toBe(false);
    expect(transferWindowKind(10)).toBeNull();
    expect(transferWindowLabel(10)).toBe("Fenster geschlossen");
    expect(isTransferWindowOpen(25)).toBe(false);
    expect(isTransferWindowOpen(52)).toBe(false);
  });
});
