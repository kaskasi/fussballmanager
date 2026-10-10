/** Player-facing symptoms before doctor reveals diagnosis (PRD 07.6 M2). */

export type BodyRegion =
  | "foot_l"
  | "foot_r"
  | "ankle_l"
  | "ankle_r"
  | "knee_l"
  | "knee_r"
  | "groin"
  | "back"
  | "thigh_l"
  | "thigh_r";

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPE_REGIONS: Record<string, readonly BodyRegion[]> = {
  muscle: ["thigh_l", "thigh_r", "groin"],
  ankle: ["ankle_l", "ankle_r"],
  knee: ["knee_l", "knee_r"],
  groin: ["groin"],
  back: ["back"],
};

export function bodyRegionForInjury(
  typeId: string,
  playerId: string,
  masterSeed: number,
): BodyRegion {
  const pool = TYPE_REGIONS[typeId] ?? ["thigh_l", "thigh_r"];
  const rng = mulberry32(hashSeed([masterSeed, playerId, typeId, "body-region"]));
  return pool[Math.floor(rng() * pool.length)] ?? "thigh_l";
}

/** i18n key under medical.symptom.* */
export function symptomKeyForInjury(typeId: string, region: BodyRegion): string {
  if (typeId === "ankle") return "medical.symptom.ankleLoad";
  if (typeId === "knee") return "medical.symptom.kneeTwist";
  if (typeId === "groin") return "medical.symptom.groinPull";
  if (typeId === "back") return "medical.symptom.backStiff";
  if (typeId === "muscle") {
    return region.startsWith("thigh") ? "medical.symptom.thighPain" : "medical.symptom.muscleTight";
  }
  return "medical.symptom.genericPain";
}

export function symptomPresentation(
  typeId: string,
  playerId: string,
  masterSeed: number,
): { body_region: BodyRegion; symptom_key: string } {
  const body_region = bodyRegionForInjury(typeId, playerId, masterSeed);
  return { body_region, symptom_key: symptomKeyForInjury(typeId, body_region) };
}
