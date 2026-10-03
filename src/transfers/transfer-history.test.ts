import { describe, expect, it } from "vitest";
import { generateWorld } from "../world/world-generator.ts";
import { displayTransferOtherClubs, formatClubEventMessage } from "./transfer-history.ts";
import { loanClubName } from "./loan-roster.ts";

describe("club name display", () => {
  const world = generateWorld(4242);
  const club = world.clubs.find((entry) => entry.id !== "fc-nordstern");
  expect(club).toBeDefined();

  it("resolves procedural career club ids", () => {
    if (!club) return;
    const careerId = `cl_${club.id.replace(/-/g, "_")}`;
    const label = loanClubName(careerId, world.clubs);
    expect(label).toBe(club.short_name);
    expect(label).not.toContain("cl_world");
  });

  it("rewrites legacy event strings", () => {
    if (!club) return;
    const careerId = `cl_${club.id.replace(/-/g, "_")}`;
    const raw = `Liga: Test · ${careerId} → cl_loan_partner (1M)`;
    const fixed = formatClubEventMessage(raw, world.clubs);
    expect(fixed).toContain(club.short_name);
    expect(fixed).not.toContain(careerId);
  });

  it("rewrites transfer history arrows", () => {
    if (!club) return;
    const from = `cl_${club.id.replace(/-/g, "_")}`;
    const fixed = displayTransferOtherClubs(`${from} → cl_loan_partner`, world.clubs);
    expect(fixed).toContain(club.short_name);
  });
});
