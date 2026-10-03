import { describe, expect, it } from "vitest";
import { eventLineTone } from "./match-presentation-mode.ts";

describe("eventLineTone", () => {
  it("flags goals and high-danger lines", () => {
    expect(eventLineTone("67'12  TOR! Müller!")).toBe("goal");
    expect(eventLineTone("12'03  Holm zieht ab — und trifft!")).toBe("goal");
    expect(eventLineTone("3'49  Holm zwingt den Keeper zur Parade.")).toBe(
      "danger",
    );
    expect(eventLineTone("22'10  Nordstern findet den Stürmer.")).toBe("default");
  });
});
