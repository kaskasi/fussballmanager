import { matchdayFixtures, type TeamId, type MatchEvent } from "@fussballmanager/shared";
import { newGameSession } from "../src/persistence/game-session.ts";
import { squadForLeagueClub } from "../src/sim/league-divisions.ts";
import { createInitialState, simulate } from "../server/src/engine/index.ts";
const session = newGameSession(new Date("2026-08-01T12:00:00Z"));
const clubs = session.league.club_ids as TeamId[];
let n = 0, crosses = 0, ok = 0; const recvBand: Record<string, number> = {}, next: Record<string, number> = {}, fromDepth: Record<string, number> = {};
for (let md = 1; md <= 4; md++) for (const fx of matchdayFixtures(clubs, md)) {
  const st = createInitialState({ home: squadForLeagueClub(fx.homeTeamId, session.rivalPlayers)!, away: squadForLeagueClub(fx.awayTeamId, session.rivalPlayers)!, seed: 500 + md }); n++;
  const { events } = simulate({ state: st, homeTactics: st.homeTactics, awayTactics: st.awayTactics });
  events.forEach((e: MatchEvent, i) => { if (e.type !== "pass" || e.kind !== "cross") return; crosses++;
    const mx = e.from.teamId === st.homeTeamId ? 100 : 0; const fd = Math.abs(mx - e.from.position.x); fromDepth[fd < 8 ? "byline<8" : fd < 18 ? "8-18" : "18+"] = (fromDepth[fd < 8 ? "byline<8" : fd < 18 ? "8-18" : "18+"] ?? 0) + 1;
    if (!e.complete) return; ok++;
    const d = Math.hypot(mx - e.to.position.x, 50 - e.to.position.y); const b = d < 8 ? "<8" : d < 12 ? "8-12" : d < 18 ? "12-18" : "18+"; recvBand[b] = (recvBand[b] ?? 0) + 1;
    const nx = events[i + 1]; const k = nx ? nx.type + (nx.type === "duel" ? ":" + nx.kind : "") : "?"; next[k] = (next[k] ?? 0) + 1; });
}
const f = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / n).toFixed(1)}`).join(", ");
console.log(`crosses/match ${(crosses / n).toFixed(1)}, completed ${(ok / n).toFixed(1)}`); console.log("from (dist to byline):", f(fromDepth)); console.log("received at:", f(recvBand)); console.log("next event:", f(next));
