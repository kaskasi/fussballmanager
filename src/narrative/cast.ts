import type { StoryCast } from "./story-state.ts";

const ASSISTANT_FIRST = ["Markus", "Thomas", "Sven", "Lars", "Henning"];
const ASSISTANT_LAST = ["Behrens", "Voß", "Klug", "Evers", "Dose"];
const VENDOR_FIRST = ["Karl", "Jürgen", "Heiko", "Uwe", "Manfred"];
const ALLY_FIRST = ["Elena", "Sofia", "Nina", "Laura", "Maja"];
const ALLY_LAST = ["Kruse", "Wolff", "Brandt", "Haas", "Lorenz"];
const HOSTILE_OUTLETS = ["Nordreport", "Stadion-Echo", "Tabloid Sport Nord", "Abendblatt Sport"];
const FAN_REPS = ["Kurvenstand Nord", "Fanblock Ost", "Ultras Grün-Weiß", "Stehplatz Union"];
const GROUNDSKEEPERS = ["Heinz", "Günter", "Werner", "Dieter", "Horst"];

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)]!;
}

/** Deterministic named NPC cast per save (PRD 13). */
export function generateStoryCast(masterSeed: number): StoryCast {
  const random = mulberry32(masterSeed ^ 0x7f4a7c15);
  const vendorFirst = pick(VENDOR_FIRST, random);
  return {
    assistant_name: `${pick(ASSISTANT_FIRST, random)} ${pick(ASSISTANT_LAST, random)}`,
    captain_player_id: null,
    bratwurst_vendor_name: `${vendorFirst} vom Bratwurststand`,
    fan_rep_label: pick(FAN_REPS, random),
    journalist_hostile_name: pick(HOSTILE_OUTLETS, random),
    journalist_ally_name: `${pick(ALLY_FIRST, random)} ${pick(ALLY_LAST, random)}`,
    groundskeeper_name: `${pick(GROUNDSKEEPERS, random)}, Platzwart`,
  };
}
