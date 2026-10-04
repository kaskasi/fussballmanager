import { describe, expect, it } from "vitest";
import {
  matchAmbiencePhotoUrl,
  matchdayMoodPhotoUrl,
  MOOD_VARIANT_PHOTOS,
  stadiumPhotoTierFromCapacity,
  teamPoorRecentForm,
} from "./mood-photos.ts";

describe("stadiumPhotoTierFromCapacity", () => {
  it("maps default club size to small tier", () => {
    expect(stadiumPhotoTierFromCapacity(8_000)).toBe("s");
  });

  it("maps upgraded grounds to medium and large", () => {
    expect(stadiumPhotoTierFromCapacity(15_000)).toBe("m");
    expect(stadiumPhotoTierFromCapacity(40_000)).toBe("l");
  });
});

describe("matchdayMoodPhotoUrl", () => {
  it("uses away photo for Auswärtsspiel", () => {
    expect(matchdayMoodPhotoUrl(false, 8_000)).toContain("stad-away");
  });

  it("uses home tier from capacity", () => {
    expect(matchdayMoodPhotoUrl(true, 8_000)).toContain("stad-tier-s");
  });
});

describe("matchAmbiencePhotoUrl", () => {
  it("uses rain when form is poor", () => {
    expect(
      matchAmbiencePhotoUrl({
        isHome: true,
        homeCapacity: 8_000,
        fanbaseMood: "growing",
        poorForm: true,
      }),
    ).toBe(MOOD_VARIANT_PHOTOS.rain);
  });

  it("uses crowd for strong fanbase", () => {
    expect(
      matchAmbiencePhotoUrl({
        isHome: true,
        homeCapacity: 8_000,
        fanbaseMood: "strong",
      }),
    ).toBe(MOOD_VARIANT_PHOTOS.crowd);
  });
});

describe("teamPoorRecentForm", () => {
  it("detects two consecutive losses", () => {
    expect(teamPoorRecentForm(["W", "L", "L"])).toBe(true);
    expect(teamPoorRecentForm(["W", "L", "D"])).toBe(false);
  });
});
