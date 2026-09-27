import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import { signYouthContract } from "../player/youth-contract.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { loanPlayerOut, type TransferRecord } from "../transfers/transfer-history.ts";
import type { Player } from "../types/player.ts";
import type { CoachIcon } from "./academy.ts";
import { departureReasonLabel, departureRiskReasons } from "./departure-risk.ts";
import { hasActiveProTrial, startProTrial } from "./pro-trial.ts";
import { canPromotePlayer } from "./promotion-gate.ts";
import type { YouthReport } from "./youth-sim.ts";

/** PRD 03.4 — max open decisions at once; extra candidates wait in queue. */
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
  /** Priority-sorted backlog; one item moves to `items` per in-game day. */
  queue: DecisionInboxItem[];
  resolvedIds: string[];
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
  return { week, items: [], queue: [], resolvedIds: [], coachIcons: {}, lastReport: null };
}

/** Older browser saves may lack `queue` until migration 013 is persisted. */
export function normalizeYouthInbox(inbox: YouthInboxState): YouthInboxState {
  return {
    ...inbox,
    items: inbox.items ?? [],
    queue: inbox.queue ?? [],
    resolvedIds: inbox.resolvedIds ?? [],
    coachIcons: inbox.coachIcons ?? {},
  };
}

function youthPlayerIds(players: readonly Player[]): Set<string> {
  return new Set(
    players
      .filter((player) => player.squad_status === "u17" || player.squad_status === "u19")
      .map((player) => player.id),
  );
}

/** Drop inbox rows for players who left youth or the club. */
export function pruneYouthInbox(inbox: YouthInboxState, players: readonly Player[]): YouthInboxState {
  const validIds = youthPlayerIds(players);
  const keep = (item: DecisionInboxItem) => validIds.has(item.playerId);
  return {
    ...inbox,
    items: inbox.items.filter(keep),
    queue: inbox.queue.filter(keep),
  };
}

export function pendingInboxItems(
  inbox: YouthInboxState,
  players?: readonly Player[],
): DecisionInboxItem[] {
  const open = inbox.items.filter((item) => !inbox.resolvedIds.includes(item.id));
  if (!players) return open;
  const validIds = youthPlayerIds(players);
  return open.filter((item) => validIds.has(item.playerId));
}

export function inboxSummary(inbox: YouthInboxState): {
  pending: number;
  recommendations: number;
  departureRisks: number;
  queued: number;
} {
  const open = pendingInboxItems(inbox);
  return {
    pending: open.length,
    recommendations: open.filter((item) => item.kind !== "departure_risk").length,
    departureRisks: open.filter((item) => item.kind === "departure_risk").length,
    queued: inbox.queue.length,
  };
}

export function deliverDailyInbox(
  inbox: YouthInboxState,
  players?: readonly Player[],
): YouthInboxState {
  let normalized = normalizeYouthInbox(inbox);
  if (players) normalized = pruneYouthInbox(normalized, players);
  const pending = pendingInboxItems(normalized, players);
  if (pending.length >= MAX_INBOX_ITEMS || normalized.queue.length === 0) {
    return normalized;
  }
  const [next, ...rest] = normalized.queue;
  if (!next) return normalized;
  return {
    ...normalized,
    items: [...normalized.items, next],
    queue: rest,
  };
}

export function deliverInboxForDays(
  inbox: YouthInboxState,
  days: number,
  players?: readonly Player[],
): YouthInboxState {
  let current = inbox;
  for (let index = 0; index < days; index += 1) {
    current = deliverDailyInbox(current, players);
  }
  return current;
}

export function inboxItemLabel(item: DecisionInboxItem): string {
  switch (item.reason) {
    case "no_game_time":
      return departureReasonLabel("no_game_time");
    case "rival_offer":
      return departureReasonLabel("rival_offer");
    case "family_move":
      return departureReasonLabel("family_move");
    case "no_contract":
      return departureReasonLabel("no_contract");
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

export function allowedActions(
  item: DecisionInboxItem,
  players?: readonly Player[],
  clubId?: string,
): DecisionAction[] {
  const base: DecisionAction[] = (() => {
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
  })();

  if (item.kind !== "promotion" || !players || !clubId) return base;

  const player = players.find((entry) => entry.id === item.playerId);
  if (!player) return base;
  if (canPromotePlayer(players, clubId, player).allowed && !hasActiveProTrial(player)) {
    return base;
  }

  return base.filter((action) => action !== "promote");
}

export interface DecisionActionContext {
  item?: DecisionInboxItem;
  player?: Player;
}

export function actionLabel(action: DecisionAction, context?: DecisionActionContext): string {
  if (
    action === "promote" &&
    context?.player?.squad_status === "u19" &&
    context?.item?.reason === "ready_for_pro"
  ) {
    return "Probewoche";
  }
  switch (action) {
    case "loan":
      return "Leihen";
    case "promote":
      return "Hochziehen";
    case "contract":
      return "Jugendvertrag";
    case "training_focus":
      return "Trainingsfokus";
    case "dismiss":
      return "Später";
  }
}

export function actionIcon(action: DecisionAction, context?: DecisionActionContext): string {
  if (
    action === "promote" &&
    context?.player?.squad_status === "u19" &&
    context?.item?.reason === "ready_for_pro"
  ) {
    return "🏃";
  }
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

function resolveClubId(players: readonly Player[], clubId?: string): string {
  if (clubId) return clubId;
  return players.find((player) => player.club_id)?.club_id ?? DEFAULT_CLUB_ID;
}

function promotionAllowed(
  players: readonly Player[],
  clubId: string,
  player: Player,
  reason: "ready_for_u19" | "ready_for_pro",
): boolean {
  if (hasActiveProTrial(player)) return false;
  if (reason === "ready_for_u19") {
    return canPromotePlayer(players, clubId, player).allowed;
  }
  if (player.squad_status !== "u19") return false;
  return canPromotePlayer(players, clubId, player).allowed;
}

export function generateWeeklyInbox(
  players: readonly Player[],
  week: number,
  masterSeed: number,
  report: YouthReport | null = null,
  clubId?: string,
): YouthInboxState {
  const resolvedClubId = resolveClubId(players, clubId);
  const youth = players.filter((player) => player.squad_status === "u17" || player.squad_status === "u19");
  const coachIcons = report
    ? Object.fromEntries(report.standout_players.map((entry) => [entry.player_id, entry.coach_comment_icon]))
    : coachIconsForYouth(youth, masterSeed, week);
  const candidates: DecisionInboxItem[] = [];

  if (report) {
    for (const player of youth) {
      const reasons = departureRiskReasons(player, week, masterSeed);
      const primary = reasons[0];
      if (!primary) continue;
      candidates.push({
        id: `dep_${player.id}_${week}`,
        playerId: player.id,
        kind: "departure_risk",
        week,
        urgency: "now",
        reason: primary,
      });
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
        if (!promotionAllowed(players, resolvedClubId, player, "ready_for_pro")) continue;
        candidates.push({
          id: `pro1_${player.id}_${week}`,
          playerId: player.id,
          kind: "promotion",
          week,
          urgency: recommendation.urgency,
          reason: "ready_for_pro",
        });
      } else if (player.squad_status === "u17") {
        if (!promotionAllowed(players, resolvedClubId, player, "ready_for_u19")) continue;
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
      const reasons = departureRiskReasons(player, week, masterSeed);
      const primary = reasons[0];
      if (!primary) continue;
      candidates.push({
        id: `dep_${player.id}_${week}`,
        playerId: player.id,
        kind: "departure_risk",
        week,
        urgency: "now",
        reason: primary,
      });
    }

    for (const player of youth.filter((entry) => entry.squad_status === "u17")) {
      const ca = estimateCa(player.attributes, player.position);
      if (
        ca >= 58 &&
        inboxRoll(masterSeed, week, player.id, "promotion") < 0.16 &&
        promotionAllowed(players, resolvedClubId, player, "ready_for_u19")
      ) {
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
      if (
        ca >= 68 &&
        inboxRoll(masterSeed, week, player.id, "pro_promotion") < 0.16 &&
        promotionAllowed(players, resolvedClubId, player, "ready_for_pro")
      ) {
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

  return { week, items: [], queue: unique, resolvedIds: [], coachIcons, lastReport: report };
}

export function applyInboxDecision(
  inbox: YouthInboxState,
  players: readonly Player[],
  itemId: string,
  action: DecisionAction,
  season: number,
): { inbox: YouthInboxState; players: Player[]; transferRecord?: TransferRecord } {
  const item = inbox.items.find((entry) => entry.id === itemId);
  if (!item || inbox.resolvedIds.includes(itemId)) {
    return { inbox, players: [...players] };
  }

  let nextPlayers = [...players];
  let transferRecord: TransferRecord | undefined;
  const player = nextPlayers.find((entry) => entry.id === item.playerId);
  const clubId = player?.club_id ?? resolveClubId(players);
  if (!allowedActions(item, players, clubId).includes(action)) {
    return { inbox, players: nextPlayers };
  }
  if (!player) {
    return {
      inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
      players: nextPlayers,
    };
  }

  switch (action) {
    case "loan": {
      const loaned = loanPlayerOut(
        player,
        season,
        item.week,
        player.club_id ?? "cl_fc_nordstern",
      );
      transferRecord = loaned.record;
      nextPlayers = nextPlayers.map((entry) =>
        entry.id === item.playerId ? loaned.player : entry,
      );
      break;
    }
    case "promote":
      if (!canPromotePlayer(nextPlayers, clubId, player).allowed) break;
      if (player.squad_status === "u17") {
        nextPlayers = nextPlayers.map((entry) =>
          entry.id === item.playerId
            ? grantAchievement({ ...entry, squad_status: "u19" }, ACHIEVEMENT.promotedU19)
            : entry,
        );
      } else if (player.squad_status === "u19") {
        nextPlayers = nextPlayers.map((entry) =>
          entry.id === item.playerId ? startProTrial(entry, season, item.week) : entry,
        );
      }
      break;
    case "contract": {
      const moraleBoost =
        item.reason === "no_contract" || item.kind === "contract_offer" ? 10 : 6;
      nextPlayers = nextPlayers.map((entry) => {
        if (entry.id !== item.playerId) return entry;
        const signed = signYouthContract(entry, season, { moraleBoost });
        return grantAchievement(signed, ACHIEVEMENT.contractSigned);
      });
      break;
    }
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
      if (item.kind === "departure_risk" && item.reason === "no_contract") {
        nextPlayers = nextPlayers.map((entry) => {
          if (entry.id !== item.playerId) return entry;
          return {
            ...entry,
            state: {
              ...entry.state,
              morale: Math.max(0, entry.state.morale - 6),
            },
          };
        });
      }
      break;
  }

  return {
    inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
    players: nextPlayers,
    transferRecord,
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
  const carriedOpen = inbox.items.filter(
    (item) =>
      !inbox.resolvedIds.includes(item.id) &&
      remaining.some((player) => player.id === item.playerId),
  );
  const carriedQueue = inbox.queue.filter(
    (item) =>
      !inbox.resolvedIds.includes(item.id) &&
      !carriedOpen.some((open) => open.id === item.id) &&
      remaining.some((player) => player.id === item.playerId),
  );

  return {
    inbox: pruneYouthInbox(
      {
        ...fresh,
        items: carriedOpen,
        queue: [...carriedQueue, ...fresh.queue],
        resolvedIds: inbox.resolvedIds,
        coachIcons: { ...inbox.coachIcons, ...fresh.coachIcons },
      },
      remaining,
    ),
    players: remaining,
    lostPlayerIds: lost,
  };
}

function inboxRoll(masterSeed: number, week: number, playerId: string, salt: string): number {
  let hash = masterSeed ^ week;
  for (const ch of `${playerId}:${salt}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
