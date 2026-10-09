import type { BroadcastBeatId } from "./beats.ts";
import type { CommentaryContext } from "./render.ts";
import type { MatchEvent, TeamId } from "@fussballmanager/shared";
import { formatClock } from "./render.ts";

export const MOMENT_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "restart_throw_in",
  "restart_corner",
  "restart_free_kick",
  "restart_goal_kick",
  "offside",
]);

export function isMomentBeat(beat: BroadcastBeatId): boolean {
  return MOMENT_BEATS.has(beat);
}

export function momentI18nKey(beat: BroadcastBeatId): string | null {
  switch (beat) {
    case "restart_corner":
      return "match.moment.corner";
    case "restart_free_kick":
      return "match.moment.free_kick";
    case "restart_throw_in":
      return "match.moment.throw_in";
    case "restart_goal_kick":
      return "match.moment.goal_kick";
    case "offside":
      return "match.moment.offside";
    default:
      return null;
  }
}

function takingTeam(event: MatchEvent): TeamId | null {
  if (event.type === "restart") return event.takingTeamId;
  if (event.type === "turnover" && event.reason === "offside") {
    return event.toTeamId;
  }
  return event.possessionTeamId;
}

/** Short DE moment line (client may replace via i18n). */
export function momentLineText(
  event: MatchEvent,
  ctx: CommentaryContext,
  beat: BroadcastBeatId,
): string {
  const teamId = takingTeam(event);
  const team = teamId ? ctx.teamName(teamId) : "";
  const clock = formatClock(event.clock);
  switch (beat) {
    case "restart_corner":
      return `${clock}  Ecke für ${team}.`;
    case "restart_free_kick":
      return `${clock}  Freistoß für ${team}.`;
    case "restart_throw_in":
      return `${clock}  Einwurf ${team}.`;
    case "restart_goal_kick":
      return `${clock}  Abstoß ${team}.`;
    case "offside":
      return `${clock}  Abseits — ${team}.`;
    default:
      return `${clock}  ${team}`;
  }
}

export function momentI18nParams(
  event: MatchEvent,
  ctx: CommentaryContext,
  beat: BroadcastBeatId,
): Record<string, string> | undefined {
  const teamId = takingTeam(event);
  if (!teamId) return undefined;
  return { team: ctx.teamName(teamId) };
}
