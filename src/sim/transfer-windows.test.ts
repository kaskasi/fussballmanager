import { describe, expect, it } from "vitest";
import {
  isTransferWindowOpen,
  transferWindowKind,
  transferWindowLabel,
} from "./transfer-windows.ts";

describe("transfer windows", () => {
  it("detects summer at season start and winter in January", () => {
    expect(isTransferWindowOpen(1)).toBe(true);
    expect(transferWindowKind(1)).toBe("summer");
    expect(transferWindowLabel(1)).toBe("Sommerfenster");

    expect(isTransferWindowOpen(2)).toBe(true);
    expect(transferWindowKind(2)).toBe("summer");

    expect(isTransferWindowOpen(20)).toBe(true);
    expect(transferWindowKind(20)).toBe("winter");
    expect(transferWindowLabel(20)).toBe("Winterfenster");
  });

  it("is closed outside window weeks", () => {
    expect(isTransferWindowOpen(10)).toBe(false);
    expect(transferWindowKind(10)).toBeNull();
    expect(transferWindowLabel(10)).toBe("Fenster geschlossen");
    expect(isTransferWindowOpen(3)).toBe(false);
    expect(isTransferWindowOpen(30)).toBe(false);
  });
});
