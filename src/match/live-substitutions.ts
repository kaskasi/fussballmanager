/** PRD 27 — who can come off and on at the paused tick, planned changes, and where playback halts. */
import type { MatchView, MatchViewRosterPlayer, PlayerRole } from "@fussballmanager/shared";

/** Engine limit (`MAX_SUBS`). */
export const MAX_LIVE_SUBSTITUTIONS = 3;

export type LiveSquadRow = {
  id: string;
  name: string;
  role: PlayerRole;
  shirt: number;
  /** 0–100 engine fatigue at the paused tick; absent for the bench. */
  fatigue?: number;
};

export type PlannedSubstitution = { offId: string; onId: string; offName: string; onName: string };

export type LiveSubstitutionState = {
  onPitch: LiveSquadRow[];
  /** Fresh players only: nobody who already played, nobody already lined up for a change. */
  bench: LiveSquadRow[];
  /** Changes asked for but not made yet: they wait for the ball to go out. */
  planned: PlannedSubstitution[];
  /** Made plus planned. */
  used: number;
  left: number;
};

function rowFrom(entry: MatchViewRosterPlayer, fatigue?: number): LiveSquadRow {
  return { id: entry.id, name: entry.name, role: entry.role, shirt: entry.shirt, fatigue };
}

export function liveSubstitutionState(
  view: MatchView,
  frameIndex: number,
  ownTeamId: string,
): LiveSubstitutionState {
  const frame = view.frames[frameIndex] ?? view.kickoff;
  const roster = new Map(view.roster.map((entry) => [entry.id, entry]));
  const appeared = new Set<string>();
  for (const dot of view.kickoff.dots) if (dot.teamId === ownTeamId) appeared.add(dot.playerId);
  for (let index = 0; index <= frameIndex && index < view.frames.length; index += 1) {
    for (const dot of view.frames[index]!.dots) if (dot.teamId === ownTeamId) appeared.add(dot.playerId);
  }
  const planned: PlannedSubstitution[] = [];
  for (const later of view.frames) {
    const change = later.substitution;
    if (later.seq <= frame.seq || !change || change.teamId !== ownTeamId) continue;
    planned.push({
      offId: change.playerOffId,
      onId: change.playerOnId,
      offName: roster.get(change.playerOffId)?.name ?? change.playerOffId,
      onName: roster.get(change.playerOnId)?.name ?? change.playerOnId,
    });
  }
  const plannedIds = new Set(planned.flatMap((change) => [change.offId, change.onId]));
  const onPitch = frame.dots
    .filter((dot) => dot.teamId === ownTeamId && !plannedIds.has(dot.playerId))
    .map((dot) => roster.get(dot.playerId))
    .filter((entry): entry is MatchViewRosterPlayer => entry !== undefined)
    .map((entry) => rowFrom(entry, frame.dots.find((dot) => dot.playerId === entry.id)?.fatigue))
    .sort((a, b) => a.shirt - b.shirt);
  const bench = view.roster
    .filter((entry) => entry.teamId === ownTeamId && !appeared.has(entry.id) && !plannedIds.has(entry.id))
    .map((entry) => rowFrom(entry));
  const side = ownTeamId === view.home.id ? "home" : "away";
  const used = (frame.substitutionsUsed?.[side] ?? 0) + planned.length;
  return { onPitch, bench, planned, used, left: Math.max(0, MAX_LIVE_SUBSTITUTIONS - used) };
}

/** Seq of the half-time whistle (last first-half tick), or null before the engine got there. */
export function halfTimeSeq(view: MatchView): number | null {
  const index = view.frames.findIndex((frame) => frame.clock.period === "second_half");
  return index > 0 ? view.frames[index - 1]!.seq : null;
}

/** Own players hurt badly enough to need a decision: one who had to go off, or a hurt keeper. */
export function ownInjurySeqs(view: MatchView, ownTeamId: string): number[] {
  const roles = new Map(view.roster.map((entry) => [entry.id, entry.role]));
  return view.frames
    .filter(
      (frame) =>
        frame.injury?.teamId === ownTeamId &&
        (frame.injury.left || roles.get(frame.injury.playerId) === "GK"),
    )
    .map((frame) => frame.seq);
}

/** Bench players for an injured man: same role first, then the rest in squad order. */
export function substituteSuggestions(
  bench: readonly LiveSquadRow[],
  role: PlayerRole | undefined,
  rank: (id: string) => number = () => 0,
  limit = 3,
): LiveSquadRow[] {
  const keeper = role === "GK";
  return [...bench]
    .filter((row) => (keeper ? true : row.role !== "GK"))
    .sort((a, b) => {
      const sameRole = Number(b.role === role) - Number(a.role === role);
      return sameRole !== 0 ? sameRole : rank(b.id) - rank(a.id);
    })
    .slice(0, limit);
}
