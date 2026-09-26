import { ensureYouthContract } from "../player/youth-contract.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { buildAcademyCohort } from "../youth/intake-generator.ts";
import { generateDemoProSquad } from "./demo-pro-squad.ts";

/** Mixed academy + pro squad for the pipeline demo. */
export function loadDemoRoster(): Player[] {
  const random = mulberry32(2026);
  const intake = buildAcademyCohort({
    season: 1,
    week: 1,
    seasonYear: 2026,
    clubId: "cl_fc_nordstern",
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: "academy_basic",
    idStart: 1,
    random: mulberry32(2026),
  }).map((player, index) => ({
    ...player,
    age: 15 + (index % 3),
  }));

  const ranked = [...intake].sort(
    (left, right) => estimateCa(right.attributes, right.position) - estimateCa(left.attributes, left.position),
  );
  const u19 = ranked.slice(0, 6).map((player) => ({
    ...player,
    squad_status: "u19" as const,
    age: Math.max(player.age, 16),
  }));
  const u17 = ranked.slice(6).map((player) => ({
    ...player,
    squad_status: "u17" as const,
  }));
  const pros = generateDemoProSquad({
    clubId: "cl_fc_nordstern",
    idStart: 100,
    random,
  });

  return [...pros, ...u19, ...u17].map((player) =>
    player.squad_status === "u17" || player.squad_status === "u19"
      ? ensureYouthContract(player, 1)
      : player,
  );
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
