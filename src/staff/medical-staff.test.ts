import { describe, expect, it } from "vitest";
import {
  defaultMedicalStaff,
  hasLegendaryMedicalHired,
  hireMedicalDoctor,
  medicalCandidates,
  medicalDiagnosisDaysForBuilding,
  medicalDoctorWage,
  medicalModifiers,
  medicalPhysioWage,
  medicalSlotCaps,
} from "./medical-staff.ts";

describe("medical-staff", () => {
  it("doctor wage is 5× physio at same quality", () => {
    expect(medicalDoctorWage(68, false)).toBe(medicalPhysioWage(68, false) * 5);
  });

  it("gates slots by building level", () => {
    expect(medicalSlotCaps(0).doctor).toBe(0);
    expect(medicalSlotCaps(1)).toEqual({ doctor: 1, physios: 1, orthopedist: 0 });
    expect(medicalSlotCaps(3).physios).toBe(4);
  });

  it("diagnosis days 3 then 1", () => {
    expect(medicalDiagnosisDaysForBuilding(1)).toBe(3);
    expect(medicalDiagnosisDaysForBuilding(2)).toBe(1);
  });

  it("modifiers improve with building and staff", () => {
    const empty = medicalModifiers(defaultMedicalStaff(), 0, 1);
    expect(empty.diagnosisDays).toBe(0);
    const level3 = medicalModifiers(defaultMedicalStaff(), 3, 0.92);
    expect(level3.diagnosisDays).toBe(1);
    expect(level3.recoveryMultiplier).toBeLessThan(1);
    expect(level3.injuryRiskMultiplier).toBeLessThanOrEqual(0.92);
  });

  it("legendary doc can appear in market once", () => {
    const staff = defaultMedicalStaff();
    const pool = medicalCandidates("doctor", 1, 5, 4242, hasLegendaryMedicalHired(staff));
    const legendary = pool.find((c) => c.legendary_id === "doc_wohlfahrt");
    const hired = hireMedicalDoctor(staff, legendary ?? pool[0]!);
    if (legendary) {
      expect(hired.doctor?.name).toContain("Wohlfahrt");
    }
    const pool2 = medicalCandidates("doctor", 1, 6, 4242, hasLegendaryMedicalHired(hired));
    expect(pool2.some((c) => c.legendary_id === "doc_wohlfahrt")).toBe(false);
  });
});
