import { SEED_MATCHUP, type MatchEvent } from "@fussballmanager/shared";
import {
  commentateLine,
  commentaryContextFromSquads,
} from "../commentary/index.ts";
import { createInitialState, simulate } from "../engine/index.ts";

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
const ctx = commentaryContextFromSquads(home, away);
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
    console.log(commentateLine(event, ctx));
  }
}
console.log("");
console.log(
  `FT ${finalState.score.home}–${finalState.score.away}  ${events.length} events`,
);
