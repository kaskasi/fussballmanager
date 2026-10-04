import type { MatchEvent, PlayerId, TeamId } from "@fussballmanager/shared";
import type { BroadcastBeatId } from "./beats.ts";
import type { CommentaryContext } from "./render.ts";

export type CommentaryI18n = {
  key: string;
  params: Record<string, string>;
};

function player(ctx: CommentaryContext, id: PlayerId): string {
  return ctx.playerName(id);
}

function team(ctx: CommentaryContext, id: TeamId): string {
  return ctx.teamName(id);
}

/** Stable template keys for F12.8 locale packs (presentation only). */
export function commentaryI18n(
  event: MatchEvent,
  ctx: CommentaryContext,
  beat: BroadcastBeatId,
): CommentaryI18n | null {
  switch (beat) {
    case "match_opening": {
      if (event.type !== "kickoff") return null;
      const kicker = event.involved[0];
      return {
        key: "match.beat.match_opening",
        params: {
          team: team(ctx, event.kickingTeamId),
          name: kicker ? player(ctx, kicker.playerId) : team(ctx, event.kickingTeamId),
        },
      };
    }
    case "second_half_open": {
      if (event.type !== "kickoff") return null;
      const kicker = event.involved[0];
      return {
        key: "match.beat.second_half_open",
        params: {
          name: kicker ? player(ctx, kicker.playerId) : team(ctx, event.kickingTeamId),
        },
      };
    }
    case "shot_goal": {
      if (event.type !== "shot" || event.outcome !== "goal") return null;
      const attackTeam = event.possessionTeamId ?? event.shooter.teamId;
      return {
        key: "match.beat.shot_goal",
        params: {
          shooter: player(ctx, event.shooter.playerId),
          team: team(ctx, attackTeam),
        },
      };
    }
    case "shot_saved": {
      if (event.type !== "shot" || event.outcome !== "save") return null;
      return {
        key: "match.beat.shot_saved",
        params: {
          shooter: player(ctx, event.shooter.playerId),
          keeper: "?",
        },
      };
    }
    case "full_time": {
      if (event.type !== "match_end") return null;
      return {
        key: "match.beat.full_time",
        params: {
          home: ctx.homeName,
          away: ctx.awayName,
          homeGoals: String(event.homeGoals),
          awayGoals: String(event.awayGoals),
        },
      };
    }
    case "card_yellow": {
      if (event.type !== "card") return null;
      if (event.color !== "yellow" && event.color !== "second_yellow") return null;
      return {
        key: "match.beat.card_yellow",
        params: { player: player(ctx, event.player.playerId) },
      };
    }
    case "card_red": {
      if (event.type !== "card") return null;
      if (event.color !== "red" && event.color !== "second_yellow") return null;
      return {
        key: "match.beat.card_red",
        params: { player: player(ctx, event.player.playerId) },
      };
    }
    case "substitution": {
      if (event.type !== "substitution") return null;
      return {
        key: "match.beat.substitution",
        params: {
          team: team(ctx, event.teamId),
          off: player(ctx, event.playerOff.playerId),
          on: player(ctx, event.playerOn.playerId),
        },
      };
    }
    default:
      return null;
  }
}

export function macroCommentaryI18n(macroId: string, variant: number): CommentaryI18n {
  return {
    key: `match.macro.${macroId}.${variant}`,
    params: {},
  };
}
