/**
 * World-only long run (PRD 32 §2): AI growth weeks and the real season end, no
 * matches. About a second per season, so growth-curve changes can be measured
 * quickly. `scripts/longrun-world.ts` stays the full acceptance run.
 *
 *   npx vite-node scripts/longrun-world-fast.ts [--seasons=20] [--seed=2026]
 */
import { setLocale } from "../src/i18n/index.ts";
import { newGameSession, type GameSession } from "../src/persistence/game-session.ts";
import { LEAGUE_FIRST_WEEK, LEAGUE_LAST_WEEK } from "../src/sim/game-calendar.ts";
import { advanceRivalGrowthWeek } from "../src/sim/rival-growth.ts";
import { runSeasonEnd } from "../src/sim/season-end.ts";
import { estimateCa } from "../src/transfers/market-value.ts";
import { worldSeasonMetrics } from "../src/playtest/world-longevity.ts";
import type { Player, PositionPrimary } from "../src/types/player.ts";

function argValue(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
}

const seasons = Math.max(1, Number.parseInt(argValue("seasons") ?? "20", 10) || 20);
const seed = Number.parseInt(argValue("seed") ?? "2026", 10) || 2026;

const ca = (player: Player) => estimateCa(player.attributes, player.position as PositionPrimary);
const BANDS: [string, number, number][] = [
  ["17-20", 17, 20],
  ["21-24", 21, 24],
  ["25-28", 25, 28],
  ["29-31", 29, 31],
  ["32-34", 32, 34],
  ["35+", 35, 99],
];

function caByAge(players: readonly Player[]): string {
  return BANDS.map(([label, lo, hi]) => {
    const band = players.filter((player) => player.age >= lo && player.age <= hi);
    const mean = band.length ? band.reduce((sum, player) => sum + ca(player), 0) / band.length : 0;
    return `${label} ${mean.toFixed(0)}`;
  }).join(" · ");
}

setLocale("en");
let session: GameSession = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed });
let baseline = 0;
console.log(`World-only run · ${seasons} seasons · seed ${seed}`);
for (let played = 0; played < seasons; played++) {
  const season = session.season;
  let rivals = session.rivalPlayers;
  for (let week = LEAGUE_FIRST_WEEK; week <= LEAGUE_LAST_WEEK; week++) {
    rivals = advanceRivalGrowthWeek(rivals, season, week, session.masterSeed, true);
  }
  const before = { ...session, rivalPlayers: rivals };
  const ai = rivals.filter((player) => player.club_id && player.club_id !== session.clubId);
  const ended = runSeasonEnd(before, season).session;
  session = { ...ended, season: ended.season === season ? season + 1 : ended.season };
  const metrics = worldSeasonMetrics(session, season);
  baseline ||= metrics.aiMeanCa;
  const drift = ((metrics.aiMeanCa / baseline - 1) * 100).toFixed(1);
  console.log(
    `S${String(season).padStart(2)} CA ${metrics.aiMeanCa} (${drift} %) age ${metrics.aiMeanAge} ` +
      `35+ ${(metrics.aiShare35Plus * 100).toFixed(1)} % · ${JSON.stringify(metrics.divisionMeanCa)} | ${caByAge(ai)}`,
  );
}
