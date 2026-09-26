import { describe, expect, it } from "vitest";
import { loadDemoRoster } from "./demo-roster.ts";

describe("demo roster", () => {
  it("includes pro, u19, and u17 players", () => {
    const roster = loadDemoRoster();
    expect(roster.some((player) => player.squad_status === "pro")).toBe(true);
    expect(roster.some((player) => player.squad_status === "u19")).toBe(true);
    expect(roster.some((player) => player.squad_status === "u17")).toBe(true);
    expect(roster.length).toBeGreaterThan(30);
  });
});
