import { describe, expect, it } from "vitest";
import {
  isTransferWindowOpen,
  transferWindowKind,
  transferWindowLabel,
} from "./transfer-windows.ts";

describe("transfer windows", () => {
  it("detects summer and winter windows", () => {
    expect(isTransferWindowOpen(30)).toBe(true);
    expect(transferWindowKind(30)).toBe("summer");
    expect(transferWindowLabel(30)).toBe("Sommerfenster");

    expect(isTransferWindowOpen(3)).toBe(true);
    expect(transferWindowKind(3)).toBe("winter");
    expect(transferWindowLabel(3)).toBe("Winterfenster");
  });

  it("is closed outside window weeks", () => {
    expect(isTransferWindowOpen(10)).toBe(false);
    expect(transferWindowKind(10)).toBeNull();
    expect(transferWindowLabel(10)).toBe("Fenster geschlossen");
  });
});
