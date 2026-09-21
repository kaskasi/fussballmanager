import type { MatchEvent } from "./match-event.ts";
import type { MatchState } from "./match-state.ts";
import type { TeamTactics } from "./tactics.ts";

/** Pure engine step: state + tactics → next event + updated state. */
export type StepInput = {
  state: MatchState;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
};

export type StepResult = {
  event: MatchEvent;
  state: MatchState;
};

export type SimulateResult = {
  events: MatchEvent[];
  finalState: MatchState;
};
