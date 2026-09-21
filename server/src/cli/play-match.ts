import {
  SEED_MATCHUP,
  type MatchEvent,
  type Squad,
} from "@fussballmanager/shared";
import { createInitialState, stepMany } from "../engine/index.ts";

function names(home: Squad, away: Squad): Map<string, string> {
  const map = new Map<string, string>();
  for (const squad of [home, away]) {
    for (const player of [
      ...squad.starters.map((place) => place.player),
      ...squad.bench,
    ]) {
      map.set(player.id, player.name);
    }
  }
  return map;
}

function formatEvent(
  event: MatchEvent,
  label: Map<string, string>,
): string {
  const clock = `${event.clock.minute}'${String(event.clock.second).padStart(2, "0")}`;
  const who = event.involved
    .map((player) => label.get(player.playerId) ?? player.playerId)
    .join(" / ");
  if (event.type === "pass") {
    return `${clock}  ${event.complete ? "pass" : "incomplete pass"}  ${who}`;
  }
  if (event.type === "carry") {
    return `${clock}  carry  ${who}`;
  }
  if (event.type === "duel") {
    const winner = label.get(event.winnerId) ?? event.winnerId;
    return `${clock}  duel (${event.kind})  ${who}  winner ${winner}`;
  }
  if (event.type === "turnover") {
    return `${clock}  turnover  ${who}`;
  }
  if (event.type === "kickoff") {
    return `${clock}  kickoff  ${who}`;
  }
  return `${clock}  ${event.type}  ${who}`;
}

const home = SEED_MATCHUP.home;
const away = SEED_MATCHUP.away;
const label = names(home, away);
const initial = createInitialState({ home, away, seed: 2026 });
const { events, state } = stepMany(
  {
    state: initial,
    homeTactics: initial.homeTactics,
    awayTactics: initial.awayTactics,
  },
  20,
);

console.log(
  `${home.team.name} vs ${away.team.name} — first ${events.length} events (seed ${initial.rng.seed})`,
);
console.log("");
for (const event of events) {
  console.log(formatEvent(event, label));
}
console.log("");
console.log(
  `Score ${state.score.home}–${state.score.away}  possession ${state.possessionTeamId}  seq ${state.nextSeq}`,
);
