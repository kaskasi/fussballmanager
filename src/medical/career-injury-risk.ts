import {
  medicalModifiers,
  normalizeMedicalStaff,
  type MedicalStaff,
} from "../staff/medical-staff.ts";
import {
  precinctInjuryRiskFactor,
  precinctMedicalCenterLevel,
  precinctPitchInjuryFactor,
  precinctTzPhysioStack,
} from "../stadium/precinct-effects.ts";
import type { PrecinctState } from "../stadium/precinct.ts";

export function careerInjuryRiskFactor(
  precinct: PrecinctState | undefined,
  medicalStaff: MedicalStaff | undefined,
): number {
  const level = precinctMedicalCenterLevel(precinct);
  const pitch = precinctPitchInjuryFactor(precinct);
  if (level <= 0) {
    return precinctInjuryRiskFactor(precinct);
  }
  const tz = precinctTzPhysioStack(precinct);
  const staffMods = medicalModifiers(normalizeMedicalStaff(medicalStaff), level, tz);
  return staffMods.injuryRiskMultiplier * pitch;
}
