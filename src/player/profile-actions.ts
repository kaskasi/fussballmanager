import { ACHIEVEMENT, grantAchievement } from "./achievements.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { needsYouthContract, signYouthContract } from "./youth-contract.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { CONTRACT_SIGN_COOLDOWN_DAYS, lockContractTalks } from "../transfers/contract-talks.ts";
import { LEAGUE_LAST_WEEK } from "../sim/game-calendar.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { canPromotePlayer } from "../youth/promotion-gate.ts";

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
const PRO_CA_READY = 68;

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
        label: "Loben",
        hint: "Gute Form bestätigen — Moral steigt. Max. einmal alle 4 Wochen.",
      });
    }
  } else if (player.state.form <= -1) {
    items.push({
      action: "criticize",
      label: "Kritisieren",
      hint: "Schwache Form ansprechen — Moral sinkt.",
    });
  } else if (praiseLocked === 0) {
    items.push({
      action: "praise",
      label: "Ermutigen",
      hint: "Kleiner Moral-Schub bei stabiler Form. Max. einmal alle 4 Wochen.",
    });
  }

  if (player.squad_status === "u17") {
    items.push({
      action: "promote_u19",
      label: "In U19",
      hint: "Aufstieg in die U19 — nächster Schritt vor dem Profikader.",
    });
  } else if (player.squad_status === "u19") {
    items.push({
      action: "promote_pro",
      label: "Profikader",
      hint: "Direkt ins erste Team, wenn Platz im Kader.",
    });
    items.push({
      action: "demote_u17",
      label: "Zurück U17",
      hint: "Zu früh für U19 — Moral leidet.",
    });
  } else if (player.squad_status === "pro" && player.age <= 22) {
    items.push({
      action: "demote_u19",
      label: "Zurück U19",
      hint: "Kein Durchbruch — zurück in die Jugend.",
    });
  }

  if (needsYouthContract(player, season)) {
    const wageHint = player.age <= 15 ? 80 : player.age === 16 ? 120 : 175;
    items.push({
      action: "sign_contract",
      label: "Jugendvertrag",
      hint: `Vertrag bis ${formatSeasonLabel(season + (player.age <= 16 ? 3 : 2))} · ca. € ${wageHint}/Woche`,
    });
  }

  items.push({
    action: "release",
    label: "Entfernen",
    hint: "Spieler verlässt den Verein und ist vereinslos.",
  });

  return items;
}

export interface ProfileActionResult {
  player: Player;
  message: string;
  removed?: boolean;
}

export function canReleasePlayer(
  player: Player,
  squad: readonly Player[],
  clubId: string = DEFAULT_CLUB_ID,
): string | null {
  if (player.club_id !== clubId) return "Spieler gehört nicht zum Verein.";
  if (player.squad_status === "loaned_out") {
    return "Ausgeliehene Spieler können nicht entlassen werden.";
  }

  const clubPlayers = squad.filter((entry) => entry.club_id === clubId);
  if (player.squad_status === "pro") {
    const pros = clubPlayers.filter((entry) => entry.squad_status === "pro");
    if (pros.length <= MIN_PRO_SQUAD) {
      return `Mindestens ${MIN_PRO_SQUAD} Profis müssen im Kader bleiben.`;
    }
    if (player.position === "GK") {
      const otherGoalkeepers = pros.filter(
        (entry) => entry.position === "GK" && entry.id !== player.id,
      );
      if (otherGoalkeepers.length === 0) {
        return "Mindestens ein Torwart muss im Profikader bleiben.";
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
              ? "Ermutigen/Loben erst wieder nächste Woche möglich."
              : `Ermutigen/Loben erst wieder in ${locked} Wochen möglich.`,
        };
      }
      const boost = player.state.form >= 2 ? 10 : 5;
      const next = withMorale(player, boost);
      next.state = {
        ...next.state,
        last_praise_season: season,
        last_praise_week: week,
      };
      return { player: next, message: `Moral ${boost > 8 ? "deutlich" : ""} gestiegen (+${boost}).` };
    }
    case "criticize": {
      const penalty = player.state.morale < 35 ? 12 : 7;
      const next = withMorale(player, -penalty);
      return { player: next, message: `Kritik gesetzt — Moral −${penalty}.` };
    }
    case "promote_u19": {
      if (player.squad_status !== "u17") {
        return { player, message: "Nur U17-Spieler können in die U19." };
      }
      const roster = squad.length > 0 ? squad : [player];
      if (!canPromotePlayer(roster, clubId, player).allowed) {
        return { player, message: "U19-Kader voll — kein Platz zum Hochziehen." };
      }
      const rating = ca(player);
      const moraleDelta = rating >= U19_CA_READY ? 6 : -8;
      let next: Player = {
        ...withMorale(player, moraleDelta),
        squad_status: "u19",
      };
      next = grantAchievement(next, ACHIEVEMENT.promotedU19);
      return {
        player: next,
        message:
          moraleDelta > 0
            ? "Aufstieg U19 — Spieler ist motiviert."
            : "Aufstieg U19 trotz schwacher CA — Frust spürbar.",
      };
    }
    case "promote_pro": {
      if (player.squad_status !== "u19") {
        return {
          player,
          message: "Nur U19-Spieler können ins Profiteam — zuerst U17 → U19.",
        };
      }
      const roster = squad.length > 0 ? squad : [player];
      const gate = canPromotePlayer(roster, clubId, player);
      if (!gate.allowed) {
        return { player, message: "Kein Platz im Profikader zum Hochziehen." };
      }
      const rating = ca(player);
      const ready = rating >= PRO_CA_READY;
      const moraleDelta = ready ? 10 : -6;
      let next: Player = {
        ...withMorale(player, moraleDelta),
        squad_status: "pro",
        state: {
          ...player.state,
          pro_trial: undefined,
          modifiers: player.state.modifiers.filter(
            (mod) => !mod.source_event_id.startsWith("pro_trial_"),
          ),
        },
      };
      next = grantAchievement(next, ACHIEVEMENT.promotedPro);
      return {
        player: next,
        message: ready
          ? "Hochgezogen ins Profiteam — Spieler ist motiviert."
          : "Ins Profiteam geholt — noch Entwicklung nötig, Moral leidet leicht.",
      };
    }
    case "demote_u19": {
      if (player.squad_status !== "pro") {
        return { player, message: "Nur Profis können zurück in die U19." };
      }
      const next: Player = {
        ...withMorale(player, -14),
        squad_status: "u19",
      };
      return { player: next, message: "Abstieg in U19 — Moral leidet." };
    }
    case "demote_u17": {
      if (player.squad_status !== "u19") {
        return { player, message: "Nur U19-Spieler können zurück in die U17." };
      }
      const next: Player = {
        ...withMorale(player, -9),
        squad_status: "u17",
      };
      return { player: next, message: "Abstieg in U17 — Spieler ist enttäuscht." };
    }
    case "sign_contract": {
      if (!needsYouthContract(player, season)) {
        return { player, message: "Für diesen Spieler ist kein neuer Jugendvertrag nötig." };
      }
      const signed = grantAchievement(signYouthContract(player, season, { moraleBoost: 8 }), ACHIEVEMENT.contractSigned);
      const next = lockContractTalks(signed, { season, week, weekday }, CONTRACT_SIGN_COOLDOWN_DAYS);
      const wage = next.contract?.wage_weekly ?? 0;
      return {
        player: next,
        message: `Jugendvertrag bis ${formatSeasonLabel(next.contract?.until_season ?? season)} · € ${wage}/Woche · Moral steigt.`,
      };
    }
    case "release": {
      return {
        player,
        message: `${formatPlayerName(player)} wurde aus dem Kader entfernt.`,
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
