import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import { signYouthContract } from "../player/youth-contract.ts";
import { CONTRACT_SIGN_COOLDOWN_DAYS, lockContractTalks } from "../transfers/contract-talks.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { canLoanPlayerOut, loanYouthPlayer } from "../transfers/loans.ts";
import type { TransferRecord } from "../transfers/transfer-history.ts";
import type { Player } from "../types/player.ts";
import type { CoachIcon } from "./academy.ts";
import { departureReasonLabel, departureRiskReasons } from "./departure-risk.ts";
import { hasActiveProTrial } from "./pro-trial.ts";
import { canPromotePlayer } from "./promotion-gate.ts";
import { localizeStoryInbox } from "../i18n/story-display.ts";
import { t } from "../i18n/index.ts";
import type { StoryCast, StoryInboxPayload } from "../narrative/story-state.ts";
import { isHqYouth } from "./youth-site.ts";
import type { YouthReport } from "./youth-sim.ts";

/** PRD 03.4 — max open decisions at once; extra candidates wait in queue. */
export const MAX_INBOX_ITEMS = 4;

export type StoryDecisionAction = `story:${string}`;
export type DecisionAction =
  | "loan"
  | "promote"
  | "contract"
  | "training_focus"
  | "dismiss"
  | StoryDecisionAction;

export type InboxItemKind =
  | "departure_risk"
  | "promotion"
  | "contract_offer"
  | "training_focus"
  | "story_press"
  | "story_fan"
  | "story_captain"
  | "story_assistant"
  | "story_board"
  | "assistant_training_reminder"
  | "kicker_transfer";

export interface DecisionInboxItem {
  id: string;
  playerId: string;
  kind: InboxItemKind;
  week: number;
  urgency: "now" | "next_window" | "future";
  reason: string;
  narrative?: StoryInboxPayload;
}

const STORY_KINDS = new Set<InboxItemKind>([
  "story_press",
  "story_fan",
  "story_captain",
  "story_assistant",
  "story_board",
]);

export function isStoryInboxKind(kind: InboxItemKind): boolean {
  return STORY_KINDS.has(kind);
}

export function isStoryInboxItem(item: DecisionInboxItem): boolean {
  return isStoryInboxKind(item.kind);
}

function storyKindForSource(source: StoryInboxPayload["source"]): InboxItemKind {
  switch (source) {
    case "press":
      return "story_press";
    case "fan":
      return "story_fan";
    case "captain":
      return "story_captain";
    case "assistant":
      return "story_assistant";
    case "board":
    case "origin":
      return "story_board";
  }
}

export interface YouthInboxDeliveryStamp {
  season: number;
  week: number;
}

export interface YouthInboxState {
  week: number;
  items: DecisionInboxItem[];
  /** Priority-sorted backlog; at most one item moves to `items` per calendar week. */
  queue: DecisionInboxItem[];
  resolvedIds: string[];
  coachIcons: Record<string, CoachIcon>;
  lastReport: YouthReport | null;
  /** Last week a queued youth item was promoted to open (PRD 03.4 weekly slot). */
  lastYouthDelivery?: YouthInboxDeliveryStamp;
}

export interface InboxDeliveryContext {
  season: number;
  week: number;
  weekday: number;
  masterSeed: number;
}

const KIND_PRIORITY: Record<InboxItemKind, number> = {
  departure_risk: 0,
  story_board: 0,
  story_press: 1,
  story_captain: 1,
  promotion: 2,
  story_assistant: 2,
  story_fan: 3,
  contract_offer: 3,
  training_focus: 4,
  assistant_training_reminder: 0,
  kicker_transfer: 1,
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
      .filter((player) => (player.squad_status === "u17" || player.squad_status === "u19") && isHqYouth(player))
      .map((player) => player.id),
  );
}

function keepInboxItem(item: DecisionInboxItem, validIds: Set<string>): boolean {
  if (isStoryInboxItem(item)) return true;
  if (item.kind === "assistant_training_reminder") return true;
  if (item.kind === "kicker_transfer") return true;
  return validIds.has(item.playerId);
}

/** Drop inbox rows for players who left youth or the club. */
export function pruneYouthInbox(inbox: YouthInboxState, players: readonly Player[]): YouthInboxState {
  const validIds = youthPlayerIds(players);
  const keep = (item: DecisionInboxItem) => keepInboxItem(item, validIds);
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
  return open.filter((item) => keepInboxItem(item, validIds));
}

export function queuedInboxItems(
  inbox: YouthInboxState,
  players?: readonly Player[],
): DecisionInboxItem[] {
  const openIds = new Set(inbox.items.map((item) => item.id));
  const queued = inbox.queue.filter(
    (item) => !inbox.resolvedIds.includes(item.id) && !openIds.has(item.id),
  );
  if (!players) return queued;
  const validIds = youthPlayerIds(players);
  return queued.filter((item) => keepInboxItem(item, validIds));
}

export interface InboxWeekFocus {
  open: DecisionInboxItem[];
  openCount: number;
  slotsOpen: number;
  nextQueued: DecisionInboxItem | null;
}

/** What the manager should act on now — not the full backlog depth. */
export function inboxWeekFocus(
  inbox: YouthInboxState,
  players: readonly Player[],
): InboxWeekFocus {
  const open = pendingInboxItems(inbox, players);
  const queue = queuedInboxItems(inbox, players);
  return {
    open,
    openCount: open.length,
    slotsOpen: Math.max(0, MAX_INBOX_ITEMS - open.length),
    nextQueued: queue[0] ?? null,
  };
}

export function inboxHeadline(focus: InboxWeekFocus): string {
  if (focus.openCount === 0) return t("inbox.headline.none");
  if (focus.openCount === 1) return t("inbox.headline.one");
  return t("inbox.headline.many", { count: focus.openCount, max: MAX_INBOX_ITEMS });
}

export function inboxPipelineHint(focus: InboxWeekFocus): string | null {
  if (focus.openCount >= MAX_INBOX_ITEMS) {
    return t("inbox.hint.resolveFirst");
  }
  return null;
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
    queued: queuedInboxItems(inbox).length,
  };
}

/** Deterministic Mo–Fr release day for the weekly youth mail slot. */
export function inboxReleaseWeekday(masterSeed: number, season: number, week: number): number {
  let hash = masterSeed ^ season ^ week;
  hash = Math.imul(hash ^ 0x5f3759df, 0x9e3779b1);
  return 1 + ((hash >>> 0) % 5);
}

export function advanceInboxDeliveryDay(ctx: InboxDeliveryContext): InboxDeliveryContext {
  if (ctx.weekday < 7) {
    return { ...ctx, weekday: ctx.weekday + 1 };
  }
  return { season: ctx.season, week: ctx.week + 1, weekday: 1, masterSeed: ctx.masterSeed };
}

function youthDeliveredThisWeek(
  inbox: YouthInboxState,
  season: number,
  week: number,
): boolean {
  return inbox.lastYouthDelivery?.season === season && inbox.lastYouthDelivery?.week === week;
}

export function deliverDailyInbox(
  inbox: YouthInboxState,
  ctx: InboxDeliveryContext,
  players?: readonly Player[],
): YouthInboxState {
  let normalized = normalizeYouthInbox(inbox);
  if (players) normalized = pruneYouthInbox(normalized, players);
  const pending = pendingInboxItems(normalized, players);
  if (pending.length >= MAX_INBOX_ITEMS || normalized.queue.length === 0) {
    return normalized;
  }
  if (youthDeliveredThisWeek(normalized, ctx.season, ctx.week)) {
    return normalized;
  }
  if (ctx.weekday !== inboxReleaseWeekday(ctx.masterSeed, ctx.season, ctx.week)) {
    return normalized;
  }
  const [next, ...rest] = normalized.queue;
  if (!next) return normalized;
  return {
    ...normalized,
    items: [...normalized.items, next],
    queue: rest,
    lastYouthDelivery: { season: ctx.season, week: ctx.week },
  };
}

export function deliverInboxForDays(
  inbox: YouthInboxState,
  startCtx: InboxDeliveryContext,
  days: number,
  players?: readonly Player[],
): YouthInboxState {
  let current = inbox;
  let ctx = startCtx;
  for (let index = 0; index < days; index += 1) {
    ctx = advanceInboxDeliveryDay(ctx);
    current = deliverDailyInbox(current, ctx, players);
  }
  return current;
}

export function enqueueStoryInboxItem(
  inbox: YouthInboxState,
  week: number,
  payload: StoryInboxPayload,
  idSuffix: string,
): YouthInboxState {
  const item: DecisionInboxItem = {
    id: `story_${idSuffix}_${week}`,
    playerId: "",
    kind: storyKindForSource(payload.source),
    week,
    urgency: "now",
    reason: payload.beatId,
    narrative: payload,
  };
  if (inbox.items.some((entry) => entry.id === item.id) || inbox.queue.some((entry) => entry.id === item.id)) {
    return inbox;
  }
  const openCount = pendingInboxItems(inbox).length;
  if (openCount >= MAX_INBOX_ITEMS) {
    return { ...inbox, queue: [...inbox.queue, item] };
  }
  return { ...inbox, items: [...inbox.items, item] };
}

export function storyChoiceId(action: DecisionAction): string | null {
  if (!action.startsWith("story:")) return null;
  return action.slice("story:".length);
}

/** PRD 14.5 / 09.3 — stance buttons use form, not the English choice id. */
export type StoryStance = "survive" | "ambition" | "neutral";

const STANCE_BY_CHOICE: Record<string, { stance: StoryStance; labelKey: string; icon: string }> = {
  accept: { stance: "survive", labelKey: "story.stance.survive", icon: "●" },
  ambitious: { stance: "ambition", labelKey: "story.stance.ambition", icon: "▲" },
};

export function storyChoiceStance(choiceId: string | null, icon?: string): StoryStance {
  if (!choiceId) return "neutral";
  const mapped = STANCE_BY_CHOICE[choiceId];
  if (mapped) return mapped.stance;
  if (icon === "●") return "survive";
  if (icon === "▲") return "ambition";
  return "neutral";
}

export function inboxItemLabel(item: DecisionInboxItem, cast?: StoryCast): string {
  if (item.narrative && cast) return localizeStoryInbox(item.narrative, cast).title;
  if (item.narrative) return item.narrative.title;
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
      return t("inbox.reason.ready_for_u19");
    case "ready_for_pro":
      return t("inbox.reason.ready_for_pro");
    case "contract_due":
      return t("inbox.reason.contract_due");
    case "coach_focus":
      return t("inbox.reason.coach_focus");
    case "training_plan_missing":
      return t("inbox.reason.training_plan_missing");
    case "kicker_weekly":
      return t("postfach.treter.queueTopic");
    default:
      return item.reason;
  }
}

export function allowedActions(
  item: DecisionInboxItem,
  players?: readonly Player[],
  clubId?: string,
  week?: number,
): DecisionAction[] {
  if (item.narrative) {
    return item.narrative.choices.map((choice) => `story:${choice.id}` as StoryDecisionAction);
  }
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
      case "assistant_training_reminder":
        return ["dismiss"];
      case "kicker_transfer":
        return ["dismiss"];
      case "story_press":
      case "story_fan":
      case "story_captain":
      case "story_assistant":
      case "story_board":
        return [];
    }
  })();

  let actions = base;

  if (players && clubId) {
    const player = players.find((entry) => entry.id === item.playerId);
    if (player) {
      if (item.kind === "promotion") {
        if (!canPromotePlayer(players, clubId, player).allowed || hasActiveProTrial(player)) {
          actions = actions.filter((action) => action !== "promote");
        }
      }
      if (week !== undefined && !canLoanPlayerOut(players, clubId, week, player).allowed) {
        actions = actions.filter((action) => action !== "loan");
      }
    }
  }

  return actions;
}

export function loanBlockReason(
  item: DecisionInboxItem,
  players: readonly Player[],
  clubId: string,
  week: number,
): string | null {
  if (item.kind !== "departure_risk" && item.kind !== "promotion") return null;
  const player = players.find((entry) => entry.id === item.playerId);
  if (!player) return null;
  const eligibility = canLoanPlayerOut(players, clubId, week, player);
  if (eligibility.allowed) return null;
  return eligibility.reason ?? "Leihen nicht möglich.";
}

export interface DecisionActionContext {
  item?: DecisionInboxItem;
  player?: Player;
  cast?: StoryCast;
}

export function actionLabel(action: DecisionAction, context?: DecisionActionContext): string {
  if (action.startsWith("story:")) {
    const choiceId = action.slice("story:".length);
    const mapped = STANCE_BY_CHOICE[choiceId];
    if (mapped) return t(mapped.labelKey);
    const narrative = context?.item?.narrative;
    if (narrative && context?.cast) {
      const localized = localizeStoryInbox(narrative, context.cast);
      const choice = localized.choices.find((entry) => entry.id === choiceId);
      if (choice) return choice.label;
    }
    const choice = narrative?.choices.find((entry) => entry.id === choiceId);
    return choice?.label ?? choiceId;
  }
  switch (action) {
    case "loan":
      return t("inbox.action.loan");
    case "promote":
      return t("inbox.action.promote");
    case "contract":
      return t("inbox.action.contract");
    case "training_focus":
      return t("inbox.action.trainingFocus");
    case "dismiss":
      return t("inbox.action.dismiss");
    default:
      return action;
  }
}

export function actionIcon(action: DecisionAction, context?: DecisionActionContext): string {
  if (action.startsWith("story:")) {
    const choiceId = action.slice("story:".length);
    const mapped = STANCE_BY_CHOICE[choiceId];
    if (mapped) return mapped.icon;
    const choice = context?.item?.narrative?.choices.find((entry) => entry.id === choiceId);
    return choice?.icon ?? "💬";
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
    default:
      return "💬";
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
  const youth = players.filter(
    (player) => (player.squad_status === "u17" || player.squad_status === "u19") && isHqYouth(player),
  );
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

export interface InboxDecisionResult {
  inbox: YouthInboxState;
  players: Player[];
  transferRecord?: TransferRecord;
  loanFee?: number;
}

export function applyInboxDecision(
  inbox: YouthInboxState,
  players: readonly Player[],
  itemId: string,
  action: DecisionAction,
  season: number,
  currentWeek: number,
): InboxDecisionResult {
  const item = inbox.items.find((entry) => entry.id === itemId);
  if (!item || inbox.resolvedIds.includes(itemId)) {
    return { inbox, players: [...players] };
  }

  let nextPlayers = [...players];
  let transferRecord: TransferRecord | undefined;
  const player = item.playerId
    ? nextPlayers.find((entry) => entry.id === item.playerId)
    : undefined;
  const clubId = player?.club_id ?? resolveClubId(players);
  if (!allowedActions(item, players, clubId, currentWeek).includes(action)) {
    return { inbox, players: nextPlayers };
  }
  if (isStoryInboxItem(item)) {
    return {
      inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
      players: nextPlayers,
    };
  }
  if (!player) {
    return {
      inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
      players: nextPlayers,
    };
  }

  switch (action) {
    case "loan": {
      const eligibility = canLoanPlayerOut(nextPlayers, clubId, currentWeek, player);
      if (!eligibility.allowed) break;
      const loaned = loanYouthPlayer(
        player,
        season,
        currentWeek,
        player.club_id ?? clubId,
      );
      transferRecord = loaned.record;
      nextPlayers = nextPlayers.map((entry) =>
        entry.id === item.playerId ? loaned.player : entry,
      );
      return {
        inbox: { ...inbox, resolvedIds: [...inbox.resolvedIds, itemId] },
        players: nextPlayers,
        transferRecord,
        loanFee: loaned.fee,
      };
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
          entry.id === item.playerId
            ? grantAchievement({ ...entry, squad_status: "pro" }, ACHIEVEMENT.promotedPro)
            : entry,
        );
      }
      break;
    case "contract": {
      const moraleBoost =
        item.reason === "no_contract" || item.kind === "contract_offer" ? 10 : 6;
      nextPlayers = nextPlayers.map((entry) => {
        if (entry.id !== item.playerId) return entry;
        const signed = signYouthContract(entry, season, { moraleBoost });
        const locked = lockContractTalks(
          signed,
          { season, week: currentWeek, weekday: 1 },
          CONTRACT_SIGN_COOLDOWN_DAYS,
        );
        return grantAchievement(locked, ACHIEVEMENT.contractSigned);
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
      (isStoryInboxItem(item) || remaining.some((player) => player.id === item.playerId)),
  );
  const carriedQueue = inbox.queue.filter(
    (item) =>
      !inbox.resolvedIds.includes(item.id) &&
      !carriedOpen.some((open) => open.id === item.id) &&
      (isStoryInboxItem(item) || remaining.some((player) => player.id === item.playerId)),
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
