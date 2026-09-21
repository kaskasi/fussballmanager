import { SEED_MATCHUP } from "@fussballmanager/shared";
import { formatMatchLog, parseSeed } from "../commentary/index.ts";
import { createInitialState, simulate } from "../engine/index.ts";

const home = SEED_MATCHUP.home;
const away = SEED_MATCHUP.away;
const seed = parseSeed(process.argv);
const initial = createInitialState({ home, away, seed });
const { events, finalState } = simulate({
  state: initial,
  homeTactics: initial.homeTactics,
  awayTactics: initial.awayTactics,
});

console.log(
  formatMatchLog({
    home,
    away,
    seed: initial.rng.seed,
    events,
    finalScore: finalState.score,
  }),
);
