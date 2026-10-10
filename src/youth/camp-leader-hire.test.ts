import { describe, expect, it } from "vitest";
import {
  advanceCalendarDay,
  commissionCampLeaderAgency,
  generateCampLeaderCandidates,
  hireCampLeader,
  shouldOpenLeaderCandidates,
  tickCampLeaderHires,
  workdaysElapsed,
} from "./camp-leader-hire.ts";
import { buyYouthCamp, isCampStaffed, normalizeYouthCamps } from "./satellite-camps.ts";

describe("camp leader hire", () => {
  it("counts only Mo–Fr across a weekend", () => {
    const start = { season: 1, week: 2, weekday: 1 };
    let cursor = start;
    for (let step = 0; step < 7; step++) {
      cursor = advanceCalendarDay(cursor);
    }
    expect(cursor.weekday).toBe(1);
    expect(cursor.week).toBe(3);
    expect(workdaysElapsed(start, cursor)).toBe(5);
    expect(shouldOpenLeaderCandidates(start, cursor)).toBe(true);
  });

  it("does not open candidates before five workdays", () => {
    const start = { season: 1, week: 1, weekday: 1 };
    const thursday = { season: 1, week: 1, weekday: 4 };
    expect(workdaysElapsed(start, thursday)).toBe(3);
    expect(shouldOpenLeaderCandidates(start, thursday)).toBe(false);
  });

  it("generates deterministic candidates and blocks disqualified hire", () => {
    const setId = "camp_br:1:2:1";
    const a = generateCampLeaderCandidates({ campId: "camp_br", masterSeed: 7, candidateSetId: setId });
    const b = generateCampLeaderCandidates({ campId: "camp_br", masterSeed: 7, candidateSetId: setId });
    expect(a).toEqual(b);
    expect(a[0]?.languages.length).toBeGreaterThanOrEqual(2);
    const bad = a.find((entry) => entry.disqualified);
    expect(bad).toBeDefined();
    let camps = buyYouthCamp([], "camp_br", 1);
    camps = commissionCampLeaderAgency(camps, "camp_br", { season: 1, week: 1, weekday: 1 });
    camps = tickCampLeaderHires(camps, { season: 1, week: 2, weekday: 1 });
    const ready = camps[0]!;
    expect(ready.leader_hire).toBe("candidates_ready");
    if (bad) {
      const blocked = hireCampLeader(camps, "camp_br", bad);
      expect(isCampStaffed(blocked[0]!)).toBe(false);
    }
    const pick = a.find((entry) => !entry.disqualified)!;
    const hired = hireCampLeader(camps, "camp_br", pick);
    expect(isCampStaffed(hired[0]!)).toBe(true);
    expect(hired[0]?.leader?.first).toBe(pick.name.first);
  });

  it("normalize keeps staffed only when hired", () => {
    const camps = normalizeYouthCamps([
      { id: "camp_br", staffed: true, purchased_season: 1, leader_hire: "agency_pending" },
    ]);
    expect(camps[0]?.staffed).toBe(false);
  });

  it("normalize preserves purchased_week for Treter timing", () => {
    const camps = normalizeYouthCamps([
      { id: "camp_br", staffed: true, purchased_season: 1, purchased_week: 4, leader_hire: "hired" },
    ]);
    expect(camps[0]?.purchased_week).toBe(4);
  });
});
