import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { shouldPauseTrainingAutoNext } from "./training-auto-next.ts";
import { isTrainingNextActive } from "./training-next.ts";

describe("training auto next", () => {
  it("pauses when the next training slot is empty", () => {
    const session = newGameSession();
    session.trainingCalendarGateDone = true;
    expect(isTrainingNextActive(session)).toBe(true);
    expect(
      shouldPauseTrainingAutoNext({
        session,
        youthInbox: session.youthInbox,
        players: session.players,
        screen: "training",
        simulating: false,
        careerMatchActive: false,
      }),
    ).toBe(true);
  });

  it("pauses when leaving training or on inbox blocker", () => {
    const session = newGameSession();
    session.weekday = 1;
    expect(
      shouldPauseTrainingAutoNext({
        session,
        youthInbox: session.youthInbox,
        players: session.players,
        screen: "hub",
        simulating: false,
        careerMatchActive: false,
      }),
    ).toBe(true);
  });
});
