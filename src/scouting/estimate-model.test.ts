import { describe, expect, it } from "vitest";
import {
  applyObservation,
  applyQuietWeek,
  confidenceLabel,
  ownPlayer,
  unknownPlayer,
} from "./estimate-model.ts";

describe("scout knowledge", () => {
  it("starts an unknown player at mean 65 with a range of 40", () => {
    expect(unknownPlayer()).toEqual({
      status: "scouted",
      estimate: { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 },
    });
    expect(confidenceLabel(unknownPlayer())).toBe("❓ Unbekannt");
  });

  it("narrows the range by the published observation amounts and never below 0", () => {
    const live = applyObservation(unknownPlayer(), "live_match_view");
    const visit = applyObservation(unknownPlayer(), "scout_visit_report");
    const video = applyObservation(unknownPlayer(), "video_review");
    const trial = applyObservation(unknownPlayer(), "trial_period");
    expect(live.status === "scouted" && live.estimate.uncertaintyRange).toBe(25);
    expect(live.status === "scouted" && live.estimate.sampleSize).toBe(1);
    expect(visit.status === "scouted" && visit.estimate.uncertaintyRange).toBe(32);
    expect(video.status === "scouted" && video.estimate.uncertaintyRange).toBe(35);
    expect(trial.status === "scouted" && trial.estimate).toMatchObject({
      uncertaintyRange: 15,
      sampleSize: 3,
      estimatedAbilityMean: 65,
    });

    const tight = applyObservation(trial, "trial_period");
    expect(tight.status === "scouted" && tight.estimate.uncertaintyRange).toBe(0);
    expect(tight.status === "scouted" && tight.estimate.sampleSize).toBe(6);
  });

  it("widens a quiet week by 0.25 and stops at 40", () => {
    const watched = applyObservation(unknownPlayer(), "video_review");
    const week = applyQuietWeek(watched);
    expect(week.status === "scouted" && week.estimate.uncertaintyRange).toBe(35.25);
    expect(applyQuietWeek(unknownPlayer()).status === "scouted" && applyQuietWeek(unknownPlayer())).toEqual(
      unknownPlayer(),
    );
  });

  it("gives own players no band, and observations cannot create one", () => {
    expect(ownPlayer()).toEqual({ status: "owned" });
    expect(confidenceLabel(ownPlayer())).toBeNull();
    expect(applyObservation(ownPlayer(), "live_match_view")).toEqual(ownPlayer());
    expect(applyQuietWeek(ownPlayer())).toEqual(ownPlayer());
  });

  it("labels the range bands, with under 5 more precise than under 10", () => {
    expect(confidenceLabel(band(40))).toBe("❓ Unbekannt");
    expect(confidenceLabel(band(20))).toBe("🤷 Unklar");
    expect(confidenceLabel(band(10))).toBe("👁️ Grobes Bild");
    expect(confidenceLabel(band(5))).toBe("✅ Gut bekannt");
    expect(confidenceLabel(band(4.9))).toBe("🎯 Präzise Einschätzung");
    expect(confidenceLabel(band(0))).toBe("🎯 Präzise Einschätzung");
  });
});

function band(uncertaintyRange: number) {
  return {
    status: "scouted" as const,
    estimate: { estimatedAbilityMean: 65, uncertaintyRange, sampleSize: 1 },
  };
}
