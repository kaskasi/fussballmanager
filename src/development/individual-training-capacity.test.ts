import { describe, expect, it } from "vitest";
import { defaultCoachingStaff } from "../staff/coaching-staff.ts";
import { emptyPrecinct } from "../stadium/precinct.ts";
import {
  INDIVIDUAL_SLOTS_BASE,
  INDIVIDUAL_SLOTS_CAP,
  individualSlotsFromFacilities,
  individualTrainingSlots,
  isIndividualSlotFree,
} from "./individual-training-capacity.ts";

describe("individual training slots", () => {
  it("given no facilities and no coaches, when slots are computed, then only the base slot is open", () => {
    const slots = individualSlotsFromFacilities({ trainingCentreLevel: 0, trainingPitchLevel: 0, coaches: 0 });
    expect(slots.total).toBe(INDIVIDUAL_SLOTS_BASE);
    expect(slots.parts.map((part) => part.source)).toEqual(["base"]);
  });

  it("given Trainingszentrum level 3 and 2 coaches, when slots are computed, then base + 2 + 2", () => {
    const slots = individualSlotsFromFacilities({ trainingCentreLevel: 3, trainingPitchLevel: 0, coaches: 2 });
    expect(slots.total).toBe(INDIVIDUAL_SLOTS_BASE + 4);
    expect(slots.parts).toContainEqual({ source: "training_centre", slots: 2, level: 3 });
    expect(slots.parts).toContainEqual({ source: "coaches", slots: 2 });
  });

  it("counts the Trainingsplatz only from level 2", () => {
    expect(
      individualSlotsFromFacilities({ trainingCentreLevel: 0, trainingPitchLevel: 1, coaches: 0 }).total,
    ).toBe(INDIVIDUAL_SLOTS_BASE);
    expect(
      individualSlotsFromFacilities({ trainingCentreLevel: 0, trainingPitchLevel: 2, coaches: 0 }).total,
    ).toBe(INDIVIDUAL_SLOTS_BASE + 1);
  });

  it("given every facility maxed and all coaches, when slots are computed, then the cap holds", () => {
    const slots = individualSlotsFromFacilities({ trainingCentreLevel: 5, trainingPitchLevel: 3, coaches: 3 });
    expect(slots.total).toBe(INDIVIDUAL_SLOTS_CAP);
  });

  it("lists the next upgrades that unlock a slot", () => {
    const slots = individualSlotsFromFacilities({ trainingCentreLevel: 1, trainingPitchLevel: 0, coaches: 3 });
    expect(slots.next).toContainEqual({ source: "training_centre", level: 3 });
    expect(slots.next).toContainEqual({ source: "training_pitch", level: 2 });
    expect(slots.next.some((entry) => entry.source === "coaches")).toBe(false);
  });

  it("reads coaches and an empty Gelände from the session state", () => {
    const slots = individualTrainingSlots(emptyPrecinct(), defaultCoachingStaff(1));
    expect(slots.total).toBe(INDIVIDUAL_SLOTS_BASE + 3);
  });

  it("given programs over capacity, then running programs stay and no new player fits", () => {
    const programs = [{ playerId: "a" }, { playerId: "b" }, { playerId: "c" }];
    expect(isIndividualSlotFree(programs, "d", 2)).toBe(false);
    expect(isIndividualSlotFree(programs, "a", 2)).toBe(true);
    expect(isIndividualSlotFree(programs.slice(0, 1), "d", 2)).toBe(true);
  });
});
