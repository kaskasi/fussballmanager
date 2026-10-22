import { ACHIEVEMENT, grantAchievement } from "./achievements.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { needsYouthContract } from "./youth-contract.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { LEAGUE_LAST_WEEK } from "../sim/game-calendar.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { canPromotePlayer } from "../youth/promotion-gate.ts";
import { contractMonthsRemaining } from "../transfers/contract-remaining.ts";
import { t } from "../i18n/index.ts";

export type PlayerProfileAction =
  | "praise"
  | "criticize"
  | "promote_u19"
  | "promote_pro"
  | "demote_u19"
  | "demote_u17"
  | "sign_contract"
  | "release";

const MIN_PRO_SQUAD = 11;
export const PRAISE_COOLDOWN_WEEKS = 4;

function seasonWeekOrdinal(season: number, week: number): number {
  return (Math.max(1, season) - 1) * LEAGUE_LAST_WEEK + Math.max(1, week);
}

/** Whole weeks until praise is allowed again (0 = now). */
export function praiseCooldownWeeksRemaining(player: Player, season: number, week: number): number {
  const lastSeason = player.state.last_praise_season;
  const lastWeek = player.state.last_praise_week;
  if (lastSeason === undefined || lastWeek === undefined) return 0;
  const elapsed = seasonWeekOrdinal(season, week) - seasonWeekOrdinal(lastSeason, lastWeek);
  return Math.max(0, PRAISE_COOLDOWN_WEEKS - elapsed);
}

export interface ProfileMenuItem {
  action: PlayerProfileAction;
  label: string;
  hint: string;
}

const U19_CA_READY = 55;

function clampMorale(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function withMorale(player: Player, delta: number): Player {
  return {
    ...player,
    state: {
      ...player.state,
      morale: clampMorale(player.state.morale + delta),
    },
  };
}

function ca(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

/** Contextual manager menu for owned players (PRD 09.2 Screen 4). */
export function profileMenuItems(
  player: Player,
  owned: boolean,
  season = 1,
  week = 1,
): ProfileMenuItem[] {
  if (!owned || player.squad_status === "loaned_out") return [];

  const items: ProfileMenuItem[] = [];
  const praiseLocked = praiseCooldownWeeksRemaining(player, season, week);
  if (player.state.form >= 2) {
    if (praiseLocked === 0) {
      items.push({
        action: "praise",
        label: t("profile.action.praise"),
        hint: t("profile.action.praise.hint", { weeks: PRAISE_COOLDOWN_WEEKS }),
      });
    }
  } else if (player.state.form <= -1) {
    items.push({
      action: "criticize",
      label: t("profile.action.criticize"),
      hint: t("profile.action.criticize.hint"),
    });
  } else if (praiseLocked === 0) {
    items.push({
      action: "praise",
      label: t("profile.action.encourage"),
      hint: t("profile.action.encourage.hint", { weeks: PRAISE_COOLDOWN_WEEKS }),
    });
  }

  if (player.squad_status === "u17") {
    items.push({
      action: "promote_u19",
      label: t("profile.action.promoteU19"),
      hint: t("profile.action.promoteU19.hint"),
    });
  } else if (player.squad_status === "u19") {
    items.push({
      action: "promote_pro",
      label: t("profile.action.promotePro"),
      hint: t("profile.action.promotePro.hint"),
    });
    items.push({
      action: "demote_u17",
      label: t("profile.action.demoteU17"),
      hint: t("profile.action.demoteU17.hint"),
    });
  } else if (player.squad_status === "pro" && player.age <= 22) {
    items.push({
      action: "demote_u19",
      label: t("profile.action.demoteU19"),
      hint: t("profile.action.demoteU19.hint"),
    });
  }

  if (needsYouthContract(player, season)) {
    items.push({
      action: "sign_contract",
      label: t("profile.action.negotiate"),
      hint: t("profile.action.signYouth.hint"),
    });
  }

  return items;
}

/** ⋮-Menü — destruktive Kaderaktionen (nicht in der Rail). */
export function profileOverflowMenuItems(
  player: Player,
  owned: boolean,
): ProfileMenuItem[] {
  if (!owned || player.squad_status === "loaned_out") return [];
  return [
    {
      action: "release",
      label: t("profile.action.release"),
      hint: t("profile.action.release.hint"),
    },
  ];
}

/** Severance for early termination (remaining obligation, discounted). */
export function contractTerminationPayout(
  player: Player,
  season: number,
  week: number,
): number {
  const contract = player.contract;
  if (!contract) {
    return Math.max(800, Math.round(ca(player) * 45));
  }
  const months = contractMonthsRemaining(season, week, contract.until_season);
  const weeksLeft = Math.max(1, Math.round(months * (LEAGUE_LAST_WEEK / 12)));
  return Math.round(contract.wage_weekly * weeksLeft * 0.65);
}

export interface ProfileActionResult {
  player: Player;
  message: string;
  removed?: boolean;
  openContractTalk?: boolean;
}

function youthPromotionContract(player: Player, season: number): Player["contract"] {
  const rating = estimateCa(player.attributes, player.position);
  return {
    wage_weekly: Math.max(80, Math.round(40 + rating * 3)),
    bonus_goal: 0,
    bonus_appearance: 0,
    until_season: season + 2,
    guaranteed_minutes_promise: "none",
  };
}

export function canReleasePlayer(
  player: Player,
  squad: readonly Player[],
  clubId: string = DEFAULT_CLUB_ID,
): string | null {
  if (player.club_id !== clubId) return t("profile.release.notOurs");
  if (player.squad_status === "loaned_out") {
    return t("profile.release.loanedOut");
  }

  const clubPlayers = squad.filter((entry) => entry.club_id === clubId);
  if (player.squad_status === "pro") {
    const pros = clubPlayers.filter((entry) => entry.squad_status === "pro");
    if (pros.length <= MIN_PRO_SQUAD) {
      return t("profile.release.minPros", { count: MIN_PRO_SQUAD });
    }
    if (player.position === "GK") {
      const otherGoalkeepers = pros.filter(
        (entry) => entry.position === "GK" && entry.id !== player.id,
      );
      if (otherGoalkeepers.length === 0) {
        return t("profile.release.lastKeeper");
      }
    }
  }

  return null;
}

export function applyProfileAction(
  player: Player,
  action: PlayerProfileAction,
  season = 1,
  week = 1,
  squad: readonly Player[] = [],
  clubId: string = DEFAULT_CLUB_ID,
  weekday = 1,
): ProfileActionResult {
  switch (action) {
    case "praise": {
      const locked = praiseCooldownWeeksRemaining(player, season, week);
      if (locked > 0) {
        return {
          player,
          message:
            locked === 1
              ? t("profile.praise.lockedNextWeek")
              : t("profile.praise.lockedWeeks", { weeks: locked }),
        };
      }
      const boost = player.state.form >= 2 ? 10 : 5;
      const next = withMorale(player, boost);
      next.state = {
        ...next.state,
        last_praise_season: season,
        last_praise_week: week,
      };
      return {
        player: next,
        message: t(boost > 8 ? "profile.praise.doneBig" : "profile.praise.done", { boost }),
      };
    }
    case "criticize": {
      const penalty = player.state.morale < 35 ? 12 : 7;
      const next = withMorale(player, -penalty);
      return { player: next, message: t("profile.criticize.done", { penalty }) };
    }
    case "promote_u19": {
      if (player.squad_status !== "u17") {
        return { player, message: t("profile.promoteU19.onlyU17") };
      }
      const roster = squad.length > 0 ? squad : [player];
      if (!canPromotePlayer(roster, clubId, player).allowed) {
        return { player, message: t("profile.promoteU19.full") };
      }
      const rating = ca(player);
      const moraleDelta = rating >= U19_CA_READY ? 6 : -8;
      let next: Player = {
        ...withMorale(player, moraleDelta),
        squad_status: "u19",
        contract: youthPromotionContract(player, season),
      };
      next = grantAchievement(next, ACHIEVEMENT.promotedU19);
      return {
        player: next,
        message:
          moraleDelta > 0 ? t("profile.promoteU19.motivated") : t("profile.promoteU19.frustrated"),
      };
    }
    case "promote_pro": {
      if (player.squad_status !== "u19") {
        return {
          player,
          message: t("profile.promotePro.onlyU19"),
        };
      }
      const roster = squad.length > 0 ? squad : [player];
      const gate = canPromotePlayer(roster, clubId, player);
      if (!gate.allowed) {
        return { player, message: t("profile.promotePro.full") };
      }
      return {
        player,
        openContractTalk: true,
        message: t("profile.promotePro.talk"),
      };
    }
    case "demote_u19": {
      if (player.squad_status !== "pro") {
        return { player, message: t("profile.demoteU19.onlyPros") };
      }
      const next: Player = {
        ...withMorale(player, -14),
        squad_status: "u19",
      };
      return { player: next, message: t("profile.demoteU19.done") };
    }
    case "demote_u17": {
      if (player.squad_status !== "u19") {
        return { player, message: t("profile.demoteU17.onlyU19") };
      }
      const next: Player = {
        ...withMorale(player, -9),
        squad_status: "u17",
      };
      return { player: next, message: t("profile.demoteU17.done") };
    }
    case "sign_contract":
      return {
        player,
        message: t("profile.signYouth.viaTalk"),
      };
    case "release": {
      return {
        player,
        message: t("profile.release.done", { name: formatPlayerName(player) }),
        removed: true,
      };
    }
  }
}

export function applyProfileActionToSquad(
  players: readonly Player[],
  playerId: string,
  action: PlayerProfileAction,
  clubId: string = DEFAULT_CLUB_ID,
  season = 1,
  week = 1,
  weekday = 1,
): { players: Player[]; result: ProfileActionResult | null } {
  const index = players.findIndex((player) => player.id === playerId);
  if (index < 0) return { players: [...players], result: null };
  const player = players[index]!;

  if (action === "release") {
    const blocked = canReleasePlayer(player, players, clubId);
    if (blocked) {
      return { players: [...players], result: { player, message: blocked } };
    }
    const result = applyProfileAction(player, action);
    return {
      players: players.filter((entry) => entry.id !== playerId),
      result,
    };
  }

  const result = applyProfileAction(player, action, season, week, players, clubId, weekday);
  const next = [...players];
  next[index] = result.player;
  return { players: next, result };
}
