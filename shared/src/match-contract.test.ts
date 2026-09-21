import { describe, expect, it } from "vitest";
import { eventHasVizPayload, eventTypeLabel, samplePass, sampleShot, sampleState } from "./sample.ts";

describe("MatchEvent / MatchState contract", () => {
  it("carries ball and involved-player positions for commentary and pitch viz", () => {
    expect(eventHasVizPayload(samplePass)).toBe(true);
    expect(eventHasVizPayload(sampleShot)).toBe(true);
    expect(samplePass.type).toBe("pass");
    if (samplePass.type === "pass") {
      expect(samplePass.from.playerId).toBe(samplePass.involved[0]?.playerId);
      expect(samplePass.to.position).toEqual(samplePass.ball);
    }
  });

  it("keeps tactics, form, and fatigue on match state as explicit inputs", () => {
    expect(sampleState.homeTactics.formation).toBe("4-3-3");
    expect(sampleState.players.every((p) => p.form >= 0 && p.fatigue >= 0)).toBe(
      true,
    );
    expect(sampleState.nextSeq).toBe(sampleShot.seq);
  });

  it("narrows event types for a template renderer", () => {
    expect(eventTypeLabel(samplePass)).toBe("Pass");
    expect(eventTypeLabel(sampleShot)).toBe("Shot");
    if (sampleShot.type === "shot") {
      expect(sampleShot.outcome).toBe("save");
    }
  });
});
