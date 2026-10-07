import { describe, expect, it } from "vitest";
import {
  buildPostfachArchive,
  paginateArchiveEntries,
  POSTFACH_ARCHIVE_PAGE_SIZE,
  type PostfachArchiveEntry,
} from "./postfach-archive.ts";

describe("buildPostfachArchive", () => {
  it("merges consumed scout jobs and club events", () => {
    const entries = buildPostfachArchive({
      clubEvents: [
        { id: "e1", season: 1, week: 3, kind: "info", message: "Test event" },
      ],
      scoutBoard: {
        targets: {},
        discovery_postfach_queue: [
          {
            id: "job1",
            kind: "club_complete",
            season: 1,
            week: 2,
            consumed: true,
            clubName: "FC Test",
          },
        ],
      },
    });
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(POSTFACH_ARCHIVE_PAGE_SIZE).toBe(6);
  });

  it("paginates without accumulating prior pages", () => {
    const entries: PostfachArchiveEntry[] = Array.from({ length: 14 }, (_, index) => ({
      id: `e${index}`,
      season: 1,
      week: 40,
      title: `Title ${index}`,
      detail: `Detail ${index}`,
      kind: "club_event",
    }));
    const page0 = paginateArchiveEntries(entries, 0);
    const page1 = paginateArchiveEntries(entries, 1);
    expect(page0).toHaveLength(6);
    expect(page1).toHaveLength(6);
    expect(page0[0]?.id).toBe("e0");
    expect(page1[0]?.id).toBe("e6");
    expect(page0.some((entry) => entry.id === "e6")).toBe(false);
  });
});
