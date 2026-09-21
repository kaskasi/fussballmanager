import {
  isFormationId,
  SEED_MATCHUP,
  selectFormation,
} from "@fussballmanager/shared";
import { formatMatchLog, parseSeed } from "../commentary/index.ts";
import { createInitialState, simulate } from "../engine/index.ts";

function flag(argv: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit?.slice(prefix.length);
}

const formationRaw = flag(process.argv, "formation");
const lineRaw = flag(process.argv, "line");
const intensityRaw = flag(process.argv, "intensity");

let home = SEED_MATCHUP.home;
if (formationRaw) {
  if (!isFormationId(formationRaw)) {
    throw new Error(`Unknown formation ${formationRaw}`);
  }
  home = selectFormation(home, formationRaw);
}
if (lineRaw !== undefined) {
  const lineHeight = Number.parseInt(lineRaw, 10);
  if (!Number.isFinite(lineHeight)) {
    throw new Error(`Invalid --line=${lineRaw} (use 25–90)`);
  }
  home = {
    ...home,
    tactics: {
      ...home.tactics,
      lineHeight: Math.min(90, Math.max(25, lineHeight)),
    },
  };
}
if (intensityRaw !== undefined) {
  const intensity = Number.parseInt(intensityRaw, 10);
  if (!Number.isFinite(intensity)) {
    throw new Error(`Invalid --intensity=${intensityRaw} (use 80–130)`);
  }
  home = {
    ...home,
    tactics: {
      ...home.tactics,
      intensity: Math.min(130, Math.max(80, intensity)),
    },
  };
}

const away = SEED_MATCHUP.away;
const seed = parseSeed(process.argv);
const initial = createInitialState({
  home,
  away,
  seed,
  humanTeamId: home.team.id,
});
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
