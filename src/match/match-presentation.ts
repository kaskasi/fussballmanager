import type { MatchView, MatchViewFrame, PlayerRole } from "@fussballmanager/shared";

const DEFENSIVE_DEPTH = 28;

function roleOf(
  roster: MatchView["roster"],
  playerId: string | null,
): PlayerRole | null {
  if (!playerId) return null;
  return roster.find((entry) => entry.id === playerId)?.role ?? null;
}

function isDefensiveThird(frame: MatchViewFrame, carrierTeamId: string | null, homeId: string): boolean {
  if (!carrierTeamId) return false;
  const defendingHome = carrierTeamId === homeId;
  return defendingHome ? frame.ball.x < DEFENSIVE_DEPTH : frame.ball.x > 100 - DEFENSIVE_DEPTH;
}

function isGkCbCarrier(role: PlayerRole | null): boolean {
  return role === "GK" || role === "CB";
}

/** Collapse long GK↔CB ping-pong into two ticks for playback (presentation only). */
export function compressGkCbRecycleFrames(view: MatchView): MatchView {
  const homeId = view.home.id;
  const frames = view.frames;
  if (frames.length < 3) return view;

  const compressed: MatchViewFrame[] = [];
  let index = 0;
  while (index < frames.length) {
    let runEnd = index + 1;
    while (runEnd < frames.length) {
      const prev = frames[runEnd - 1]!;
      const next = frames[runEnd]!;
      const prevRole = roleOf(view.roster, prev.ballCarrierId);
      const nextRole = roleOf(view.roster, next.ballCarrierId);
      const sameThird =
        isDefensiveThird(prev, prev.possessionTeamId, homeId) &&
        isDefensiveThird(next, next.possessionTeamId, homeId);
      const gkCbSwap =
        isGkCbCarrier(prevRole) &&
        isGkCbCarrier(nextRole) &&
        prevRole !== nextRole &&
        prev.possessionTeamId === next.possessionTeamId;
      if (!sameThird || !gkCbSwap) break;
      runEnd += 1;
    }
    const runLength = runEnd - index;
    if (runLength >= 3) {
      compressed.push(frames[index]!, frames[runEnd - 1]!);
      index = runEnd;
      continue;
    }
    compressed.push(frames[index]!);
    index += 1;
  }

  if (compressed.length === frames.length) return view;
  return { ...view, frames: compressed, eventCount: compressed.length };
}
