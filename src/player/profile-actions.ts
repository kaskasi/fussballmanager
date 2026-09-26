import { ACHIEVEMENT, grantAchievement } from "./achievements.ts";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { needsYouthContract, signYouthContract } from "./youth-contract.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

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

export interface ProfileMenuItem {
  action: PlayerProfileAction;
  label: string;
  hint: string;
}

const U19_CA_READY = 55;
const PRO_CA_READY = 68;
const EARLY_PRO_CA = 66;

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
): ProfileMenuItem[] {
  if (!owned || player.squad_status === "loaned_out") return [];

  const items: ProfileMenuItem[] = [];
  if (player.state.form >= 2) {
    items.push({
      action: "praise",
      label: "👏 Loben",
      hint: "Gute Form bestätigen — Moral steigt.",
    });
  } else if (player.state.form <= -1) {
    items.push({
      action: "criticize",
      label: "📢 Kritisieren",
      hint: "Schwache Form ansprechen — Moral sinkt.",
    });
  } else {
    items.push({
      action: "praise",
      label: "👏 Ermutigen",
      hint: "Kleiner Moral-Schub bei stabiler Form.",
    });
  }

  if (player.squad_status === "u17") {
    items.push({
      action: "promote_u19",
      label: "⬆️ In U19",
      hint: "Standard-Aufstieg in die U19.",
    });
    items.push({
      action: "promote_pro",
      label: "⭐ In Profikader",
      hint: "Früher Sprung ins erste Team — riskant ohne CA.",
    });
  } else if (player.squad_status === "u19") {
    items.push({
      action: "promote_pro",
      label: "⭐ In Profikader",
      hint: "Beförderung in die erste Elf.",
    });
    items.push({
      action: "demote_u17",
      label: "⬇️ Zurück U17",
      hint: "Zu früh für U19 — Moral leidet.",
    });
  } else if (player.squad_status === "pro" && player.age <= 22) {
    items.push({
      action: "demote_u19",
      label: "⬇️ Zurück U19",
      hint: "Kein Durchbruch — zurück in die Jugend.",
    });
  }

  if (needsYouthContract(player, season)) {
    const wageHint = player.age <= 15 ? 80 : player.age === 16 ? 120 : 175;
    items.push({
      action: "sign_contract",
      label: "✍️ Jugendvertrag",
      hint: `Vertrag bis Saison ${season + (player.age <= 16 ? 3 : 2)} · ca. € ${wageHint}/Woche`,
    });
  }

  items.push({
    action: "release",
    label: "🚪 Aus Kader entfernen",
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
): ProfileActionResult {
  switch (action) {
    case "praise": {
      const boost = player.state.form >= 2 ? 10 : 5;
      const next = withMorale(player, boost);
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
      if (player.squad_status !== "u17" && player.squad_status !== "u19") {
        return { player, message: "Nur Jugendspieler können befördert werden." };
      }
      const rating = ca(player);
      const ready = player.squad_status === "u19" ? rating >= PRO_CA_READY : rating >= EARLY_PRO_CA;
      const moraleDelta = ready ? 12 : player.squad_status === "u17" ? -15 : -10;
      let next: Player = {
        ...withMorale(player, moraleDelta),
        squad_status: "pro",
      };
      next = grantAchievement(next, ACHIEVEMENT.promotedPro);
      return {
        player: next,
        message: ready
          ? "Profibeförderung — große Motivation."
          : "Zu früh im Profikader — Moral sinkt stark.",
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
      const next = grantAchievement(signYouthContract(player, season, { moraleBoost: 8 }), ACHIEVEMENT.contractSigned);
      const wage = next.contract?.wage_weekly ?? 0;
      return {
        player: next,
        message: `Jugendvertrag bis Saison ${next.contract?.until_season} · € ${wage}/Woche · Moral steigt.`,
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

  const result = applyProfileAction(player, action, season);
  const next = [...players];
  next[index] = result.player;
  return { players: next, result };
}
