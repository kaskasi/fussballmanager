import { describe, expect, it } from "vitest";
import { eventLineTone } from "./match-presentation-mode.ts";

describe("eventLineTone", () => {
  it("flags goals and high-danger lines", () => {
    expect(eventLineTone("67'12  GOAL! Müller!")).toBe("goal");
    expect(eventLineTone("12'03  Holm has a go — it's in!")).toBe("goal");
    expect(eventLineTone("3'49  Holm forces a save.")).toBe("danger");
    expect(eventLineTone("22'10  Nordstern findet den Stürmer.")).toBe("default");
  });
});
