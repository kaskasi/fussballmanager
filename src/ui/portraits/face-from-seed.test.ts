import { describe, expect, it, vi } from "vitest";
import { faceFromSeed, NEUTRAL_TEAM_COLORS, raceForNationality, teamColorsForKit } from "./face-from-seed.ts";

const control = vi.hoisted(() => ({ fail: false }));

vi.mock("facesjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("facesjs")>();
  return {
    ...actual,
    generate: (...args: Parameters<typeof actual.generate>) => {
      if (control.fail) throw new Error("boom");
      return actual.generate(...args);
    },
  };
});

const KIEL = teamColorsForKit({ primary: "#2e9e46", secondary: "#1e7a38" });

describe("faceFromSeed", () => {
  it("gives the same face for the same seed (two separate generate runs, only the shirt differs)", () => {
    const { teamColors: kielShirt, ...inKiel } = faceFromSeed({ seed: 4711, teamColors: KIEL });
    const { teamColors: neutralShirt, ...neutral } = faceFromSeed({ seed: 4711 });
    expect(inKiel).toEqual(neutral);
    expect(kielShirt).not.toEqual(neutralShirt);
  });

  it("gives different faces for different seeds", () => {
    const faces = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(faceFromSeed({ seed: seed * 101, teamColors: KIEL }))),
    );
    expect(faces.size).toBe(8);
  });

  it("dresses the face in the club kit, or a neutral shirt without one", () => {
    expect(faceFromSeed({ seed: 9, teamColors: KIEL }).teamColors).toEqual(KIEL);
    expect(faceFromSeed({ seed: 9 }).teamColors).toEqual(NEUTRAL_TEAM_COLORS);
    expect(faceFromSeed({ seed: 9 }).jersey.id).toBe("football");
    expect(faceFromSeed({ seed: 9 }).accessories.id).toBe("none");
    expect(faceFromSeed({ seed: 9 }).glasses.id).toBe("none");
  });

  it("restores Math.random afterwards, also when faces.js throws", () => {
    const original = Math.random;
    faceFromSeed({ seed: 77, teamColors: KIEL });
    expect(Math.random).toBe(original);

    control.fail = true;
    try {
      expect(() => faceFromSeed({ seed: 78, nationality: "PL" })).toThrow("boom");
      expect(Math.random).toBe(original);
    } finally {
      control.fail = false;
    }
  });
});

describe("raceForNationality", () => {
  it("follows the nation weights", () => {
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(raceForNationality("NG", roll)).toBe("black");
      expect(raceForNationality("PL", roll)).toBe("white");
    }
    expect(raceForNationality("TR", 0.1)).toBe("brown");
  });

  it("falls back to the German mix for unknown or missing codes", () => {
    expect(raceForNationality(undefined, 0.1)).toBe(raceForNationality("DE", 0.1));
    expect(raceForNationality("XX", 0.95)).toBe(raceForNationality("DE", 0.95));
  });
});
