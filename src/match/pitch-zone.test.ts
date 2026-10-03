import { describe, expect, it } from "vitest";
import { ballZone, pitchLateral, pitchThirdForTeam } from "./pitch-zone.ts";

const HOME = "home-id";
const AWAY = "away-id";

describe("pitch-zone", () => {
  it("maps home possession into thirds toward the away goal", () => {
    expect(pitchThirdForTeam(20, HOME, HOME)).toBe("defensive");
    expect(pitchThirdForTeam(50, HOME, HOME)).toBe("middle");
    expect(pitchThirdForTeam(80, HOME, HOME)).toBe("attacking");
  });

  it("flips thirds for away possession", () => {
    expect(pitchThirdForTeam(80, AWAY, HOME)).toBe("defensive");
    expect(pitchThirdForTeam(20, AWAY, HOME)).toBe("attacking");
  });

  it("maps lateral channels from y", () => {
    expect(pitchLateral(10)).toBe("left");
    expect(pitchLateral(50)).toBe("center");
    expect(pitchLateral(90)).toBe("right");
  });

  it("combines ball position with possession", () => {
    expect(ballZone({ x: 75, y: 12 }, HOME, HOME)).toEqual({
      third: "attacking",
      lateral: "left",
    });
  });
});
