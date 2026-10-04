import { estimateCa, marketValue } from "../transfers/market-value.ts";
import type { Attributes, Player, PositionPrimary } from "../types/player.ts";
import { generatePlayerName } from "../types/player-display.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { seedPhaseStamps } from "../development/ability-stamps.ts";

const PRO_ROSTER: readonly { position: PositionPrimary; age: number; scale: number }[] = [
  { position: "GK", age: 28, scale: 1.05 },
  { position: "GK", age: 21, scale: 0.82 },
  { position: "CB", age: 27, scale: 1.02 },
  { position: "CB", age: 24, scale: 0.95 },
  { position: "LB", age: 25, scale: 0.98 },
  { position: "RB", age: 23, scale: 0.96 },
  { position: "DM", age: 29, scale: 1.04 },
  { position: "CM", age: 26, scale: 1.0 },
  { position: "CM", age: 22, scale: 0.9 },
  { position: "AM", age: 24, scale: 0.97 },
  { position: "LW", age: 21, scale: 0.93 },
  { position: "RW", age: 27, scale: 1.01 },
  { position: "CF", age: 30, scale: 1.06 },
  { position: "CF", age: 19, scale: 0.88 },
];

function scaleAttributes(attributes: Attributes, scale: number): Attributes {
  const next = { ...attributes };
  for (const key of Object.keys(next) as (keyof Attributes)[]) {
    if (key === "weak_foot") {
      next[key] = Math.min(100, Math.round(next[key] * scale));
    } else if (key === "gk_handling" && next[key] < 20) {
      next[key] = Math.max(8, Math.round(next[key] * scale));
    } else {
      next[key] = Math.min(199, Math.max(0, Math.round(next[key] * scale)));
    }
  }
  return next;
}

/** Deterministic senior squad for the pipeline demo. */
export function generateDemoProSquad(input: {
  clubId: string;
  idStart: number;
  random: () => number;
}): Player[] {
  return PRO_ROSTER.map((slot, index) => {
    const template = clonePlayer();
    const idNumber = input.idStart + index;
    const portraitSeed = Math.floor(input.random() * 1_000_000_000);
    const attributes = scaleAttributes(template.attributes, slot.scale);
    const position = slot.position;
    const birthYear = 2026 - slot.age;
    const built: Player = {
      ...template,
      id: `pl_${String(idNumber).padStart(5, "0")}`,
      name: generatePlayerName(portraitSeed),
      birth: {
        date: `${birthYear}-07-${String(3 + (index % 25)).padStart(2, "0")}`,
        place: "Kiel",
        region: "Schleswig-Holstein",
      },
      nationality: "DE",
      age: slot.age,
      club_id: input.clubId,
      squad_status: "pro",
      position,
      flexibility: [],
      contract: {
        wage_weekly: 600 + index * 120,
        bonus_goal: 150,
        bonus_appearance: 75,
        until_season: 3,
        guaranteed_minutes_promise: index < 8 ? "starter" : "rotation",
      },
      market_value: marketValue({
        ca: estimateCa(attributes, position),
        age: slot.age,
        monthsRemaining: 24,
        wage: 600,
        marketWage: 600,
        demandFactor: 1,
        reputationFactor: 1,
      }),
      attributes,
      hidden: {
        ...template.hidden,
        drive: Math.min(1.5, Math.max(0.7, 0.85 + input.random() * 0.4)),
      },
      state: {
        ...template.state,
        morale: 62 + Math.floor(input.random() * 25),
        weekly_minutes: 0,
        season_minutes: 0,
        season_apps: 0,
        season_goals: 0,
        season_assists: 0,
        season_yellow_cards: 0,
        season_tackles: 0,
        season_headers: 0,
        recent_growth_26w: 0,
        recent_weekly_minutes: [],
      },
      history: {
        growth: [],
        clubs: [],
        achievements: [],
        milestones: [],
      },
      stamps: [],
      portrait_seed: portraitSeed,
    };
    return seedPhaseStamps(built, 1, 1, input.random);
  });
}
