import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { Player } from "../types/player.ts";
import type { CoachIcon } from "./academy.ts";
import type { YouthReport } from "./youth-sim.ts";

/** PRD 03.4 — max decision items per week, departure warnings count. */
export const MAX_INBOX_ITEMS = 4;

export type DecisionAction = "loan" | "promote" | "contract" | "training_focus" | "dismiss";

export type InboxItemKind =
  | "departure_risk"
  | "promotion"
  | "contract_offer"
  | "training_focus";

export interface DecisionInboxItem {
  id: string;
  playerId: string;
  kind: InboxItemKind;
  week: number;
  urgency: "now" | "next_window" | "future";
  reason: string;
}

export interface YouthInboxState {
  week: number;
  items: DecisionInboxItem[];
  resolvedIds: string[];
  overflowDropped: number;
  coachIcons: Record<string, CoachIcon>;
  lastReport: YouthReport | null;
}

const KIND_PRIORITY: Record<InboxItemKind, number> = {
  departure_risk: 0,
  promotion: 1,
  contract_offer: 2,
  training_focus: 3,
};

export function emptyInbox(week: number): YouthInboxState {
  return { week, items: [], resolvedIds: [], overflowDropped: 0, coachIcons: {}, lastReport: null };
}

export function pendingInboxItems(inbox: YouthInboxState): DecisionInboxItem[] {
  return inbox.items.filter((item) => !inbox.resolvedIds.includes(item.id));
}

export function inboxSummary(inbox: YouthInboxState): {
  pending: number;
  recommendations: number;
  departureRisks: number;
  overflowDropped: number;
} {
  const open = pendingInboxItems(inbox);
  return {
    pending: open.length,
    recommendations: open.filter((item) => item.kind !== "departure_risk").length,
    departureRisks: open.filter((item) => item.kind === "departure_risk").length,
    overflowDropped: inbox.overflowDropped,
  };
}

export function inboxItemLabel(item: DecisionInboxItem): string {
  switch (item.reason) {
    case "no_game_time":
      return "Wenig Spielzeit — Abgang droht";
    case "ready_for_u19":
      return "Bereit für U19";
    case "ready_for_pro":
      return "Bereit für Profikader";
    case "contract_due":
      return "Vertrag fällig";
    case "coach_focus":
      return "Coach empfiehlt Fokus";
    default:
      return item.reason;
  }
}

export function allowedActions(item: DecisionInboxItem): DecisionAction[] {
  switch (item.kind) {
    case "departure_risk":
      return ["loan", "contract", "dismiss"];
    case "promotion":
      return ["promote", "loan", "contract", "training_focus", "dismiss"];
    case "contract_offer":
      return ["contract", "dismiss"];
    case "training_focus":
      return ["training_focus", "dismiss"];
  }
}

export function actionLabel(action: DecisionAction): string {
  switch (action) {
    case "loan":
      return "Leihen";
    case "promote":
      return "Hochziehen";
    case "contract":
      return "Vertrag";
    case "training_focus":
      return "Trainingsfokus";
    case "dismiss":
      return "Später";
  }
}

export function actionIcon(action: DecisionAction): string {
  switch (action) {
    case "loan":
      return "🔄";
    case "promote":
      return "⬆️";
    case "contract":
      return "✍️";
    case "training_focus":
      return "💪";
    case "dismiss":
      return "⏭️";
  }
}

export function coachIconsForYouth(
  players: readonly Player[],
  masterSeed: number,
  week: number,
): Record<string, CoachIcon> {
  const icons: Record<string, CoachIcon> = {};
  for (const player of players) {
    if (player.squad_status !== "u17" && player.squad_status !== "u19") continue;
    const ca = estimateCa(player.attributes, player.position);
    const roll = inboxRoll(masterSeed, week, player.id, "coach");
    if (ca >= 62 && roll < 0.14) icons[player.id] = "🚀";
    else if (ca < 48 || roll < 0.18) icons[player.id] = "⚠️";
    else if (player.state.morale < 42 && roll < 0.3) icons[player.id] = "😞";
    else icons[player.id] = "➡️";
  }
  return icons;
}

export function generateWeeklyInbox(
  players: readonly Player[],
  week: number,
  masterSeed: number,
  report: YouthReport | null = null,
): YouthInboxState {
  const youth = players.filter((player) => player.squad_status === "u17" || player.squad_status === "u19");
  const coachIcons = report
    ? Object.fromEntries(report.standout_players.map((entry) => [entry.player_id, entry.coach_comment_icon]))
    : coachIconsForYouth(youth, masterSeed, week);
  const candidates: DecisionInboxItem[] = [];

  if (report) {
    for (const standout of report.standout_players) {
      const player = youth.find((entry) => entry.id === standout.player_id);
      if (!player || player.age < 16) continue;
      if (standout.minutes_played < 45) {
        candidates.push({
          id: `dep_${player.id}_${week}`,
          playerId: player.id,
          kind: "departure_risk",
          week,
          urgency: "now",
          reason: "no_game_time",
        });
      }
    }
    for (const recommendation of report.promotion_recommendations) {
      const player = youth.find((entry) => entry.id === recommendation.player_id);
      if (!player) continue;
      if (recommendation.reason === "contract_priority") {
        candidates.push({
          id: `con_${player.id}_${week}`,
          playerId: player.id,
          kind: "contract_offer",
          week,
          urgency: recommendation.urgency,
          reason: "contract_due",
        });
      } else if (player.squad_status === "u19" && recommendation.reason === "ready_for_first_team") {
        candidates.push({
          id: `pro1_${player.id}_${week}`,
          playerId: player.id,
          kind: "promotion",
          week,
          urgency: recommendation.urgency,
          reason: "ready_for_pro",
        });
      } else if (player.squad_status === "u17") {
        candidates.push({
          id: `pro_${player.id}_${week}`,
          playerId: player.id,
          kind: "promotion",
          week,
          urgency: recommendation.urgency,
          reason: "ready_for_u19",
        });
      }
    }
    for (const standout of report.standout_players) {
      if (standout.coach_comment_icon !== "⚠️" && standout.coach_comment_icon !== "😞") continue;
      candidates.push({
        id: `foc_${standout.player_id}_${week}`,
        playerId: standout.player_id,
        kind: "training_focus",
        week,
        urgency: "future",
        reason: "coach_focus",
      });
    }
  } else {
    for (const player of youth) {
      if (player.age >= 16 && inboxRoll(masterSeed, week, player.id, "departure") < 0.1) {
        candidates.push({
          id: `dep_${player.id}_${week}`,
          playerId: player.id,
          kind: "departure_risk",
          week,
          urgency: "now",
          reason: "no_game_time",
        });
      }
    }

    for (const player of youth.filter((entry) => entry.squad_status === "u17")) {
      const ca = estimateCa(player.attributes, player.position);
      if (ca >= 58 && inboxRoll(masterSeed, week, player.id, "promotion") < 0.16) {
        candidates.push({
          id: `pro_${player.id}_${week}`,
          playerId: player.id,
          kind: "promotion",
          week,
          urgency: ca >= 64 ? "now" : "next_window",
          reason: "ready_for_u19",
        });
      }
    }

    for (const player of youth.filter((entry) => entry.squad_status === "u19")) {
      const ca = estimateCa(player.attributes, player.position);
      if (ca >= 68 && inboxRoll(masterSeed, week, player.id, "pro_promotion") < 0.16) {
        candidates.push({
          id: `pro1_${player.id}_${week}`,
          playerId: player.id,
          kind: "promotion",
          week,
          urgency: ca >= 74 ? "now" : "next_window",
          reason: "ready_for_pro",
        });
      }
    }

    for (const player of youth) {
      if (player.age >= 17 && !player.contract && inboxRoll(masterSeed, week, player.id, "contract") < 0.2) {
        candidates.push({
          id: `con_${player.id}_${week}`,
          playerId: player.id,
          kind: "contract_offer",
          week,
          urgency: "now",
          reason: "contract_due",
        });
      }
    }

    for (const player of youth) {
      const icon = coachIcons[player.id];
      if ((icon === "⚠️" || icon === "😞") && inboxRoll(masterSeed, week, player.id, "focus") < 0.22) {
        candidates.push({
          id: `foc_${player.id}_${week}`,
          playerId: player.id,
          kind: "training_focus",
          week,
          urgency: "future",
          reason: "coach_focus",
        });
      }
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    const byKind = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (byKind !== 0) return byKind;
    return a.playerId.localeCompare(b.playerId);
  });

  const seen = new Set<string>();
  const unique = sorted.filter((item) => {
    if (seen.has(item.playerId)) return false;
    seen.add(item.playerId);
    return true;
  });

  const items = unique.slice(0, MAX_INBOX_ITEMS);
  const overflowDropped = Math.max(0, unique.length - MAX_INBOX_ITEMS);

  return { week, items, resolvedIds: [], overflowDropped, coachIcons, lastReport: report };
}

export function applyInboxDecision(
  inbox: YouthInboxState,
  players: readonly Player[],
  itemId: string,
  action: DecisionAction,
  season: number,
): { inbox: YouthInboxState; players: Player[] } {
  const item = inbox.items.find((entry) => entry.id === itemId);
  if (!item || inbox.resolvedIds.includes(itemId)) {
    return { inbox, players: [...players] };
  }
  if (!allowedActions(item).includes(action)) {
    return { inbox, players: [...players] };
  }

  let nextPlayers = [...players];
  const player = nextPlayers.find((entry) => entry.id === item.playerId);
  if (!player) {
    return {
      inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
      players: nextPlayers,
    };
  }

  switch (action) {
    case "loan":
      nextPlayers = nextPlayers.map((entry) => {
        if (entry.id !== item.playerId) return entry;
        const loaned = {
          ...entry,
          squad_status: "loaned_out" as const,
          current_loan: {
            from_club: entry.club_id ?? "cl_fc_nordstern",
            to_club: "cl_loan_partner",
            until_season: season + 1,
            has_option: true,
            minute_guarantee: 900,
          },
        };
        return grantAchievement(loaned, ACHIEVEMENT.loanMove);
      });
      break;
    case "promote":
      if (player.squad_status === "u17") {
        nextPlayers = nextPlayers.map((entry) =>
          entry.id === item.playerId
            ? grantAchievement({ ...entry, squad_status: "u19" }, ACHIEVEMENT.promotedU19)
            : entry,
        );
      } else if (player.squad_status === "u19") {
        nextPlayers = nextPlayers.map((entry) =>
          entry.id === item.playerId
            ? grantAchievement({ ...entry, squad_status: "pro" }, ACHIEVEMENT.promotedPro)
            : entry,
        );
      }
      break;
    case "contract":
      nextPlayers = nextPlayers.map((entry) => {
        if (entry.id !== item.playerId) return entry;
        const signed = {
          ...entry,
          contract: entry.contract ?? {
            wage_weekly: 350,
            bonus_goal: 0,
            bonus_appearance: 25,
            until_season: season + 3,
            guaranteed_minutes_promise: "rotation" as const,
          },
        };
        return grantAchievement(signed, ACHIEVEMENT.contractSigned);
      });
      break;
    case "training_focus":
      nextPlayers = nextPlayers.map((entry) => {
        if (entry.id !== item.playerId) return entry;
        const focused = {
          ...entry,
          state: {
            ...entry.state,
            modifiers: [
              ...entry.state.modifiers,
              {
                source_event_id: `inbox_focus_${item.week}`,
                fitness_regen_multiplier: 1.1,
                until_week: item.week + 4,
              },
            ],
          },
        };
        return grantAchievement(focused, ACHIEVEMENT.trainingFocus);
      });
      break;
    case "dismiss":
      break;
  }

  return {
    inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
    players: nextPlayers,
  };
}

/** End of week: unresolved departure risks from prior week remove the player. */
export function advanceInboxWeek(
  inbox: YouthInboxState,
  players: readonly Player[],
  nextWeek: number,
  masterSeed: number,
  report: YouthReport | null = null,
): { inbox: YouthInboxState; players: Player[]; lostPlayerIds: string[] } {
  const lost = inbox.items
    .filter(
      (item) =>
        item.kind === "departure_risk" &&
        item.week < nextWeek &&
        !inbox.resolvedIds.includes(item.id),
    )
    .map((item) => item.playerId);

  const remaining = players.filter((player) => !lost.includes(player.id));
  const fresh = generateWeeklyInbox(remaining, nextWeek, masterSeed, report);

  return { inbox: fresh, players: remaining, lostPlayerIds: lost };
}

function inboxRoll(masterSeed: number, week: number, playerId: string, salt: string): number {
  let hash = masterSeed ^ week;
  for (const ch of `${playerId}:${salt}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
