import { matchdayFixtures, type TeamId, type MatchEvent } from "@fussballmanager/shared";
import { newGameSession } from "../src/persistence/game-session.ts";
import { squadForLeagueClub } from "../src/sim/league-divisions.ts";
import { createInitialState, simulate } from "../server/src/engine/index.ts";
const session = newGameSession(new Date("2026-08-01T12:00:00Z"));
const clubs = session.league.club_ids as TeamId[];
const g: Record<string, [number, number]> = {}; let n = 0;
const band = (d: number) => (d < 8 ? "<8" : d < 12 ? "8-12" : d < 18 ? "12-18" : d < 24 ? "18-24" : "24+");
for (let md = 1; md <= 5; md++) for (const fx of matchdayFixtures(clubs, md)) for (const seed of [1, 2]) {
  const st = createInitialState({ home: squadForLeagueClub(fx.homeTeamId, session.rivalPlayers)!, away: squadForLeagueClub(fx.awayTeamId, session.rivalPlayers)!, seed: seed * 1000 + md }); n++;
  const { events } = simulate({ state: st, homeTactics: st.homeTactics, awayTactics: st.awayTactics });
  events.forEach((e: MatchEvent, i) => { if (e.type !== "shot") return; const p = events[i - 1];
    const kind = p?.type === "pass" && p.complete ? (p.kind === "cross" ? "after cross" : p.kind === "through" ? "after through" : "after pass") : p?.type ?? "?";
    const mouthX = e.shooter.teamId === st.homeTeamId ? 100 : 0; const d = Math.hypot(mouthX - e.shooter.position.x, 50 - e.shooter.position.y);
    for (const k of [kind, "dist " + band(d), "ALL"]) { g[k] ??= [0, 0]; g[k][0]++; if (e.outcome === "goal") g[k][1]++; } });
}
for (const [k, [s, gl]] of Object.entries(g).sort()) console.log(k.padEnd(16), `shots/match ${(s / n).toFixed(1).padStart(5)}  conv ${(100 * gl / s).toFixed(1)}%`);
