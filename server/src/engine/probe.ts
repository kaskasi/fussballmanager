import type {
  MatchEvent,
  PlayerRole,
  Squad,
  TeamId,
  TeamTactics,
  WideDuty,
} from "@fussballmanager/shared";
import { nordsternSquad, rheinwachtSquad } from "@fussballmanager/shared";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";
import { distance, goalMouth } from "./helpers.ts";

export const PROBE_SEEDS = [3, 7, 11, 19, 23, 29, 31, 37] as const;

export type MatchTally = {
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  offsides: number;
};

export type SideTally = {
  goals: number;
  shots: number;
};

function emptyTally(): MatchTally {
  return {
    homeGoals: 0,
    awayGoals: 0,
    homeShots: 0,
    awayShots: 0,
    offsides: 0,
  };
}

function addTally(into: MatchTally, extra: MatchTally): MatchTally {
  return {
    homeGoals: into.homeGoals + extra.homeGoals,
    awayGoals: into.awayGoals + extra.awayGoals,
    homeShots: into.homeShots + extra.homeShots,
    awayShots: into.awayShots + extra.awayShots,
    offsides: into.offsides + extra.offsides,
  };
}

export function tallyEvents(
  events: readonly MatchEvent[],
  homeTeamId: TeamId,
  score: { home: number; away: number },
): MatchTally {
  let homeShots = 0;
  let awayShots = 0;
  let offsides = 0;
  for (const event of events) {
    if (event.type === "shot") {
      if (event.shooter.teamId === homeTeamId) {
        homeShots += 1;
      } else {
        awayShots += 1;
      }
    }
    if (event.type === "turnover" && event.reason === "offside") {
      offsides += 1;
    }
  }
  return {
    homeGoals: score.home,
    awayGoals: score.away,
    homeShots,
    awayShots,
    offsides,
  };
}

export function simulateTally(home: Squad, away: Squad, seed: number): MatchTally {
  const state = createInitialState({ home, away, seed });
  const { events, finalState } = simulate({
    state,
    homeTactics: state.homeTactics,
    awayTactics: state.awayTactics,
  });
  return tallyEvents(events, home.team.id, finalState.score);
}

export function sumSeeds(
  home: Squad,
  away: Squad,
  seeds: readonly number[],
): MatchTally {
  return seeds.reduce(
    (acc, seed) => addTally(acc, simulateTally(home, away, seed)),
    emptyTally(),
  );
}

function goalsFor(tally: MatchTally, teamId: TeamId, homeId: TeamId): SideTally {
  if (teamId === homeId) {
    return { goals: tally.homeGoals, shots: tally.homeShots };
  }
  return { goals: tally.awayGoals, shots: tally.awayShots };
}

export function withTacticsPatch(
  squad: Squad,
  patch: Partial<TeamTactics>,
): Squad {
  return {
    ...squad,
    tactics: { ...squad.tactics, ...patch, teamId: squad.team.id },
  };
}

export function adoptTactics(squad: Squad, tactics: TeamTactics): Squad {
  const { formation: _formation, teamId: _teamId, ...style } = tactics;
  return withTacticsPatch(squad, style);
}

export type VenueProbe = {
  nordsternAtHome: SideTally;
  nordsternAway: SideTally;
  rheinwachtAtHome: SideTally;
  rheinwachtAway: SideTally;
};

/** Same XIs, both venues. Isolates pitch direction from cadre/tactics. */
export function probeVenue(seeds: readonly number[] = PROBE_SEEDS): VenueProbe {
  const homeVenue = sumSeeds(nordsternSquad, rheinwachtSquad, seeds);
  const awayVenue = sumSeeds(rheinwachtSquad, nordsternSquad, seeds);
  return {
    nordsternAtHome: goalsFor(
      homeVenue,
      nordsternSquad.team.id,
      nordsternSquad.team.id,
    ),
    nordsternAway: goalsFor(
      awayVenue,
      nordsternSquad.team.id,
      rheinwachtSquad.team.id,
    ),
    rheinwachtAtHome: goalsFor(
      awayVenue,
      rheinwachtSquad.team.id,
      rheinwachtSquad.team.id,
    ),
    rheinwachtAway: goalsFor(
      homeVenue,
      rheinwachtSquad.team.id,
      nordsternSquad.team.id,
    ),
  };
}

export type TacticsProbe = {
  ownTactics: SideTally;
  swappedTactics: SideTally;
};

/** Same venue and XIs; only instructions swap. */
export function probeTacticsSwap(
  seeds: readonly number[] = PROBE_SEEDS,
): TacticsProbe {
  const own = sumSeeds(nordsternSquad, rheinwachtSquad, seeds);
  const swapped = sumSeeds(
    adoptTactics(nordsternSquad, rheinwachtSquad.tactics),
    adoptTactics(rheinwachtSquad, nordsternSquad.tactics),
    seeds,
  );
  return {
    ownTactics: goalsFor(own, nordsternSquad.team.id, nordsternSquad.team.id),
    swappedTactics: goalsFor(
      swapped,
      nordsternSquad.team.id,
      nordsternSquad.team.id,
    ),
  };
}

export type KnobId = "line" | "marking" | "wide";

export type KnobProbe = {
  knob: KnobId;
  baselineLabel: string;
  variantLabel: string;
  baseline: MatchTally;
  variant: MatchTally;
};

function wideBoth(duty: WideDuty): Partial<TeamTactics> {
  return { wideDuty: { left: duty, right: duty } };
}

export function probeKnob(
  knob: KnobId,
  seeds: readonly number[] = PROBE_SEEDS,
): KnobProbe {
  const away = rheinwachtSquad;
  if (knob === "line") {
    return {
      knob,
      baselineLabel: "line 40",
      variantLabel: "line 72",
      baseline: sumSeeds(withTacticsPatch(nordsternSquad, { lineHeight: 40 }), away, seeds),
      variant: sumSeeds(withTacticsPatch(nordsternSquad, { lineHeight: 72 }), away, seeds),
    };
  }
  if (knob === "marking") {
    return {
      knob,
      baselineLabel: "zonal",
      variantLabel: "man",
      baseline: sumSeeds(withTacticsPatch(nordsternSquad, { marking: "zonal" }), away, seeds),
      variant: sumSeeds(withTacticsPatch(nordsternSquad, { marking: "man" }), away, seeds),
    };
  }
  return {
    knob,
    baselineLabel: "invert wings",
    variantLabel: "wide wings",
    baseline: sumSeeds(withTacticsPatch(nordsternSquad, wideBoth("invert")), away, seeds),
    variant: sumSeeds(withTacticsPatch(nordsternSquad, wideBoth("wide")), away, seeds),
  };
}

export function formatSide(label: string, side: SideTally): string {
  return `${label}: ${side.goals} goals, ${side.shots} shots`;
}

export function formatMatchTally(label: string, tally: MatchTally): string {
  return `${label}: ${tally.homeGoals}–${tally.awayGoals}  shots ${tally.homeShots}–${tally.awayShots}  offside ${tally.offsides}`;
}

export type ShotAutopsy = {
  n: number;
  goals: number;
  meanDist: number;
  byRole: Record<string, number>;
  byOutcome: Record<string, number>;
  byBand: Record<string, number>;
};

function roleMap(squad: Squad): Map<string, PlayerRole> {
  const map = new Map<string, PlayerRole>();
  for (const place of squad.starters) {
    map.set(place.player.id, place.player.role);
  }
  for (const player of squad.bench) {
    map.set(player.id, player.role);
  }
  return map;
}

function distBand(d: number): string {
  if (d < 12) {
    return "<12 box";
  }
  if (d < 18) {
    return "12-18";
  }
  if (d < 24) {
    return "18-24";
  }
  return "24+";
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/** Home-team shots: who, how far, how they ended. */
export function autopsyHomeShots(
  home: Squad,
  away: Squad,
  seeds: readonly number[] = PROBE_SEEDS,
): ShotAutopsy {
  const roles = roleMap(home);
  const byRole: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const byBand: Record<string, number> = {};
  const dists: number[] = [];
  let goals = 0;
  for (const seed of seeds) {
    const state = createInitialState({ home, away, seed });
    const { events } = simulate({
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    });
    const mouth = goalMouth(state.homeTeamId, home.team.id);
    for (const event of events) {
      if (event.type !== "shot" || event.shooter.teamId !== home.team.id) {
        continue;
      }
      const d = distance(event.shooter.position, mouth);
      dists.push(d);
      bump(byRole, roles.get(event.shooter.playerId) ?? "?");
      bump(byOutcome, event.outcome);
      bump(byBand, distBand(d));
      if (event.outcome === "goal") {
        goals += 1;
      }
    }
  }
  const meanDist =
    dists.length === 0
      ? 0
      : dists.reduce((sum, value) => sum + value, 0) / dists.length;
  return { n: dists.length, goals, meanDist, byRole, byOutcome, byBand };
}

export function formatShotAutopsy(label: string, report: ShotAutopsy): string {
  const roles = Object.entries(report.byRole)
    .map(([role, n]) => `${role} ${n}`)
    .join(", ");
  const outs = Object.entries(report.byOutcome)
    .map(([out, n]) => `${out} ${n}`)
    .join(", ");
  const bands = Object.entries(report.byBand)
    .map(([band, n]) => `${band} ${n}`)
    .join(", ");
  return [
    `${label}: ${report.n} shots, ${report.goals} goals, mean ${report.meanDist.toFixed(1)} from goal`,
    `  role  ${roles || "—"}`,
    `  end   ${outs || "—"}`,
    `  dist  ${bands || "—"}`,
  ].join("\n");
}

export function probeShotAutopsy(seeds: readonly number[] = PROBE_SEEDS): {
  ownTactics: ShotAutopsy;
  directTactics: ShotAutopsy;
} {
  return {
    ownTactics: autopsyHomeShots(nordsternSquad, rheinwachtSquad, seeds),
    directTactics: autopsyHomeShots(
      adoptTactics(nordsternSquad, rheinwachtSquad.tactics),
      rheinwachtSquad,
      seeds,
    ),
  };
}
