import { describe, expect, it } from "vitest";
import { matchdayMoodPhotoUrl, stadiumPhotoTierFromCapacity } from "./mood-photos.ts";

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
