import { describe, expect, it } from "vitest";
import {
  COMMERCE_KIOSK_PHOTO,
  HUB_OFFICE_PHOTO,
  HUB_STADIUM_DUSK_PHOTO,
  hubHeroPhotoUrl,
  transferAmbiencePhotoUrl,
} from "./hub-photos.ts";

describe("hubHeroPhotoUrl", () => {
  it("returns one of the two hub photos", () => {
    const url = hubHeroPhotoUrl(1, 1);
    expect([HUB_OFFICE_PHOTO, HUB_STADIUM_DUSK_PHOTO]).toContain(url);
  });

  it("is stable for the same season and week", () => {
    expect(hubHeroPhotoUrl(3, 12)).toBe(hubHeroPhotoUrl(3, 12));
  });

  it("can differ across weeks", () => {
    const a = hubHeroPhotoUrl(1, 1);
    const b = hubHeroPhotoUrl(1, 2);
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });
});

describe("transferAmbiencePhotoUrl", () => {
  it("returns tunnel photo path", () => {
    expect(transferAmbiencePhotoUrl()).toContain("transfer-tunnel");
  });
});

describe("commerce constant", () => {
  it("points at public commerce photo", () => {
    expect(COMMERCE_KIOSK_PHOTO).toBe("/assets/photos/commerce-kiosk.jpg");
  });
});
