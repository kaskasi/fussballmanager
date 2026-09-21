import {
  SEED_MATCHUP,
  type MatchClock,
  type MatchEvent,
  type Squad,
} from "@fussballmanager/shared";
import { createInitialState, simulate } from "../engine/index.ts";

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

function formatClock(clock: MatchClock): string {
  const mmss = `${clock.minute}'${String(clock.second).padStart(2, "0")}`;
  const firstStoppage =
    clock.period === "first_half" &&
    clock.minute === 45 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  const secondStoppage =
    (clock.period === "second_half" || clock.period === "full_time") &&
    clock.minute === 90 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  if (firstStoppage || secondStoppage) {
    return `${clock.minute}+${clock.stoppageMinute}'${String(clock.second).padStart(2, "0")}`;
  }
  return mmss;
}

function formatEvent(
  event: MatchEvent,
  label: Map<string, string>,
): string {
  const clock = formatClock(event.clock);
  const who = event.involved
    .map((player) => label.get(player.playerId) ?? player.playerId)
    .join(" / ");
  if (event.type === "kickoff") {
    return `${clock}  kickoff  ${who}`;
  }
  if (event.type === "shot") {
    return `${clock}  shot (${event.outcome})  ${who}`;
  }
  if (event.type === "save") {
    return `${clock}  save  ${who}`;
  }
  if (event.type === "goal") {
    return `${clock}  GOAL  ${who}`;
  }
  if (event.type === "restart") {
    return `${clock}  restart (${event.phase})  ${who}`;
  }
  if (event.type === "foul") {
    return `${clock}  foul${event.card ? ` (${event.card})` : ""}  ${who}`;
  }
  if (event.type === "card") {
    return `${clock}  card (${event.color})  ${who}`;
  }
  if (event.type === "injury") {
    return `${clock}  injury (${event.severity})  ${who}`;
  }
  if (event.type === "substitution") {
    return `${clock}  sub  ${who}`;
  }
  if (event.type === "period_end") {
    return `${clock}  ${event.period === "first_half" ? "HALF TIME" : "FULL TIME (period)"}`;
  }
  if (event.type === "match_end") {
    return `${clock}  MATCH END  ${event.homeGoals}–${event.awayGoals}`;
  }
  return `${clock}  ${event.type}  ${who}`;
}

function isHeadline(event: MatchEvent): boolean {
  return (
    event.type === "kickoff" ||
    event.type === "shot" ||
    event.type === "save" ||
    event.type === "goal" ||
    event.type === "restart" ||
    event.type === "foul" ||
    event.type === "card" ||
    event.type === "injury" ||
    event.type === "substitution" ||
    event.type === "period_end" ||
    event.type === "match_end"
  );
}

const home = SEED_MATCHUP.home;
const away = SEED_MATCHUP.away;
const label = names(home, away);
const initial = createInitialState({ home, away, seed: 2026 });
const { events, finalState } = simulate({
  state: initial,
  homeTactics: initial.homeTactics,
  awayTactics: initial.awayTactics,
});

console.log(
  `${home.team.name} vs ${away.team.name} — full match (seed ${initial.rng.seed})`,
);
console.log("");
for (const event of events) {
  if (isHeadline(event)) {
    console.log(formatEvent(event, label));
  }
}
console.log("");
console.log(
  `FT ${finalState.score.home}–${finalState.score.away}  ${events.length} events`,
);
