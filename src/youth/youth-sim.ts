import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { ACHIEVEMENT, grantAchievements, type AchievementLabel } from "../player/achievements.ts";
import { pushWeeklyMinutes } from "../player/minute-history.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import type { CoachIcon } from "./academy.ts";
import { canPromotePlayer } from "./promotion-gate.ts";
import { isHqYouth } from "./youth-site.ts";

/**
 * Automatic U17/U19 week simulation (PRD 03.3, F3.3).
 * No lineups — summary outputs only.
 */

export interface YouthResults {
  wins: number;
  draws: number;
  losses: number;
}

export interface StandoutPlayer {
  player_id: string;
  rating_change: number;
  minutes_played: number;
  coach_comment_icon: CoachIcon;
}

export interface PromotionRecommendation {
  player_id: string;
  reason: "ready_for_first_team" | "needs_more_experience" | "contract_priority";
  urgency: "now" | "next_window" | "future";
}

export interface YouthReport {
  week: number;
  u17_results: YouthResults;
  u19_results: YouthResults;
  standout_players: StandoutPlayer[];
  promotion_recommendations: PromotionRecommendation[];
}

export function simulateYouthWeek(
  players: readonly Player[],
  week: number,
  masterSeed: number,
  clubId: string = DEFAULT_CLUB_ID,
): { players: Player[]; report: YouthReport } {
  const u17 = players.filter((player) => player.squad_status === "u17" && isHqYouth(player));
  const u19 = players.filter((player) => player.squad_status === "u19" && isHqYouth(player));
  const standout: StandoutPlayer[] = [];
  const promotions: PromotionRecommendation[] = [];

  const nextPlayers = players.map((player) => {
    if (player.squad_status !== "u17" && player.squad_status !== "u19") return player;
    const minutes = minutesForPlayer(player, week, masterSeed);
    const ratingChange = ratingDelta(player, minutes, week, masterSeed);
    const icon = coachIconForRating(ratingChange, player);
    if (isHqYouth(player)) {
      standout.push({
        player_id: player.id,
        rating_change: ratingChange,
        minutes_played: minutes,
        coach_comment_icon: icon,
      });
    }
    const ca = estimateCa(player.attributes, player.position);
    if (isHqYouth(player) && player.squad_status === "u17") {
      if (ca >= 60 && ratingChange >= 0.4 && canPromotePlayer(players, clubId, player).allowed) {
        promotions.push({
          player_id: player.id,
          reason: ca >= 66 ? "ready_for_first_team" : "needs_more_experience",
          urgency: ca >= 66 ? "now" : "next_window",
        });
      } else if (player.age >= 17 && !player.contract) {
        promotions.push({
          player_id: player.id,
          reason: "contract_priority",
          urgency: "now",
        });
      }
    } else if (
      isHqYouth(player) &&
      player.squad_status === "u19" &&
      ca >= 68 &&
      ratingChange >= 0.25 &&
      canPromotePlayer(players, clubId, player).allowed
    ) {
      promotions.push({
        player_id: player.id,
        reason: "ready_for_first_team",
        urgency: ca >= 74 ? "now" : "next_window",
      });
    }
    const badges: AchievementLabel[] = [];
    if (ratingChange >= 0.55) badges.push(ACHIEVEMENT.youthTopForm);
    if (minutes >= 80) badges.push(ACHIEVEMENT.youthHeavyMinutes);
    const withBadges = grantAchievements(player, badges);
    return pushWeeklyMinutes(withBadges, minutes);
  });

  return {
    players: nextPlayers,
    report: {
      week,
      u17_results: teamResults(u17.length, week, masterSeed, "u17"),
      u19_results: teamResults(u19.length, week, masterSeed, "u19"),
      standout_players: standout.sort((a, b) => b.rating_change - a.rating_change),
      promotion_recommendations: promotions,
    },
  };
}

function teamResults(squadSize: number, week: number, masterSeed: number, team: "u17" | "u19"): YouthResults {
  if (squadSize === 0) return { wins: 0, draws: 0, losses: 0 };
  const matches = squadSize >= 16 ? 2 : 1;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (let match = 0; match < matches; match++) {
    const roll = youthRoll(masterSeed, week, team, `match_${match}`);
    if (roll < 0.42) wins++;
    else if (roll < 0.72) draws++;
    else losses++;
  }
  return { wins, draws, losses };
}

function minutesForPlayer(player: Player, week: number, masterSeed: number): number {
  const ca = estimateCa(player.attributes, player.position);
  const base = 35 + Math.floor(ca / 4);
  const variance = Math.floor(youthRoll(masterSeed, week, player.id, "minutes") * 40);
  return Math.min(95, base + variance);
}

function ratingDelta(player: Player, minutes: number, week: number, masterSeed: number): number {
  const ca = estimateCa(player.attributes, player.position);
  const performance = youthRoll(masterSeed, week, player.id, "rating");
  const minuteFactor = minutes < 45 ? -0.35 : minutes >= 75 ? 0.25 : 0;
  return Number(((performance - 0.45) * 1.4 + minuteFactor + (ca - 55) / 80).toFixed(2));
}

function coachIconForRating(ratingChange: number, player: Player): CoachIcon {
  if (ratingChange >= 0.55) return "🚀";
  if (ratingChange <= -0.25 || player.state.morale < 40) return "😞";
  if (ratingChange < 0.1 || player.state.weekly_minutes < 45) return "⚠️";
  return "➡️";
}

function youthRoll(masterSeed: number, week: number, key: string, salt: string): number {
  let hash = masterSeed ^ week;
  for (const ch of `${key}:${salt}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
