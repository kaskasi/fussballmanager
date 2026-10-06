import { describe, expect, it } from "vitest";
import {
  QUICK_NORDSTERN_STUDY,
  runNordsternOpponentScoutStudy,
} from "./opponent-scout-nordstern-study.ts";

describe("opponent scout Nordstern lattice study", () => {
  it(
    "runs quick lattice probe in CI (similar opponent bucket)",
    () => {
      const result = runNordsternOpponentScoutStudy(QUICK_NORDSTERN_STUDY);
      expect(result.matchdays).toHaveLength(1);
      expect(result.matchdays[0]?.strengthBucket).toBe("similar");
      expect(result.matchdays[0]?.topPlans.length).toBe(QUICK_NORDSTERN_STUDY.topK);
      expect(result.matchdays[0]?.nordsternStarterCa).toBeGreaterThan(0);
      expect(result.matchdays[0]?.opponentStarterCa).toBeGreaterThan(0);
    },
    120_000,
  );
});
