import type { IndividualProgram } from "../development/individual-training.ts";
import { programKindLabel } from "../development/individual-training.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import { isTrainingSlotEmpty, trainingUnit } from "../development/training-units.ts";
import { needsYouthContract } from "../player/youth-contract.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";
import { generatePlayerName } from "../types/player-display.ts";
import type { Player } from "../types/player.ts";
import { COACH_ICON_ORDER, type CoachIcon } from "./academy.ts";
import {
  allowedActions,
  isStoryInboxItem,
  pendingInboxItems,
  type DecisionAction,
  type YouthInboxState,
} from "./decision-inbox.ts";
import { isHqYouth } from "./youth-site.ts";
import type { YouthReport } from "./youth-sim.ts";

export const YOUTH_REPORT_ACTIONS = ["loan", "promote", "contract", "training_focus"] as const;
export type YouthReportDropAction = (typeof YOUTH_REPORT_ACTIONS)[number];

const GROUP_TARGET: Record<"technical" | "physical" | "mental", { icon: string; title: string }> = {
  physical: { icon: "💪", title: "Physis" },
  technical: { icon: "🎯", title: "Technik" },
  mental: { icon: "🧠", title: "Mental" },
};

export function formatYouthReportName(player: Pick<Player, "name" | "portrait_seed">): string {
  const first = player.name.first?.trim();
  const last = player.name.last?.trim();
  const generated = generatePlayerName(player.portrait_seed);
  const given = first || generated.first || "A";
  const family = last || generated.last || "?";
  return `${family}, ${given.charAt(0)}.`;
}

export function emptyCoachCounts(): Record<CoachIcon, number> {
  return { "🚀": 0, "➡️": 0, "⚠️": 0, "😞": 0 };
}

/** Coach-icon tally for the report header (PRD 14.4). Furniture exists before the first match. */
export function coachIconCounts(
  players: readonly Player[],
  inbox: YouthInboxState,
  report: YouthReport | null,
  team: "u17" | "u19",
): Record<CoachIcon, number> {
  const ids = new Set(
    players.filter((player) => player.squad_status === team && isHqYouth(player)).map((player) => player.id),
  );
  const counts = emptyCoachCounts();
  if (report) {
    for (const standout of report.standout_players) {
      if (!ids.has(standout.player_id)) continue;
      counts[standout.coach_comment_icon] += 1;
    }
    return counts;
  }
  for (const player of players) {
    if (player.squad_status !== team) continue;
    const icon = inbox.coachIcons[player.id] ?? "➡️";
    counts[icon] += 1;
  }
  return counts;
}

export interface YouthReportStatus {
  icon: string;
  label: string;
  kind: "risk" | "contract" | "promote" | "focus" | "ok";
}

export function youthReportStatus(
  player: Player,
  inbox: YouthInboxState,
  season: number,
  report: YouthReport | null,
): YouthReportStatus {
  const pending = pendingInboxItems(inbox, [player]).filter((item) => item.playerId === player.id);
  if (pending.some((item) => item.kind === "departure_risk")) {
    return { icon: "🚩", label: "Abgang", kind: "risk" };
  }
  if (needsYouthContract(player, season) || pending.some((item) => item.kind === "contract_offer")) {
    return { icon: "✍️", label: "fällig", kind: "contract" };
  }
  const ready = report?.promotion_recommendations.find(
    (entry) => entry.player_id === player.id && entry.urgency === "now",
  );
  if (ready || pending.some((item) => item.kind === "promotion")) {
    return { icon: "⬆️", label: "bereit", kind: "promote" };
  }
  if (pending.some((item) => item.kind === "training_focus")) {
    return { icon: "💪", label: "Fokus", kind: "focus" };
  }
  if (player.contract) {
    return { icon: "📅", label: formatSeasonLabel(player.contract.until_season), kind: "ok" };
  }
  return { icon: "", label: "—", kind: "ok" };
}

export interface YouthReportTarget {
  icon: string;
  title: string;
  progress: number | null;
}

export function youthReportTarget(
  player: Player,
  programs: readonly IndividualProgram[],
  plan: readonly TrainingSlot[],
  week: number,
): YouthReportTarget {
  const program = programs.find((entry) => entry.playerId === player.id);
  if (program) {
    const elapsed = Math.max(0, week - program.startedWeek);
    const total = Math.max(1, elapsed + program.weeksRemaining);
    return {
      icon: program.kind === "weak_foot" ? "🦶" : "🧭",
      title: programKindLabel(program.kind),
      progress: Math.min(1, elapsed / total),
    };
  }
  const focused = plan.find((slot) => slot.focus && !isTrainingSlotEmpty(slot));
  const firstConfigured = plan.find((slot) => !isTrainingSlotEmpty(slot));
  const slot = focused ?? firstConfigured;
  if (!slot || isTrainingSlotEmpty(slot)) {
    return { icon: "🏋️", title: "Kein Plan", progress: null };
  }
  const group = GROUP_TARGET[trainingUnit(slot.unitId).group];
  return { icon: group.icon, title: group.title, progress: null };
}

export type YouthReportDropResult =
  | { kind: "decide"; itemId: string; action: DecisionAction }
  | { kind: "inbox"; itemId: string }
  | { kind: "profile"; playerId: string };

export function resolveYouthReportDrop(
  inbox: YouthInboxState,
  players: readonly Player[],
  clubId: string,
  week: number,
  playerId: string,
  action: YouthReportDropAction,
): YouthReportDropResult {
  const item = pendingInboxItems(inbox, players).find(
    (entry) => entry.playerId === playerId && !isStoryInboxItem(entry),
  );
  if (!item) return { kind: "profile", playerId };
  if (allowedActions(item, players, clubId, week).includes(action)) {
    return { kind: "decide", itemId: item.id, action };
  }
  return { kind: "inbox", itemId: item.id };
}

export function sortYouthReportPlayerIds(
  players: readonly Player[],
  inbox: YouthInboxState,
  report: YouthReport | null,
  team: "u17" | "u19",
): Player[] {
  const standoutById = new Map(
    (report?.standout_players ?? []).map((entry) => [entry.player_id, entry.coach_comment_icon]),
  );
  return players
    .filter((player) => player.squad_status === team && isHqYouth(player))
    .slice()
    .sort((a, b) => {
      const iconA = standoutById.get(a.id) ?? inbox.coachIcons[a.id] ?? "➡️";
      const iconB = standoutById.get(b.id) ?? inbox.coachIcons[b.id] ?? "➡️";
      const byIcon = COACH_ICON_ORDER.indexOf(iconA) - COACH_ICON_ORDER.indexOf(iconB);
      if (byIcon !== 0) return byIcon;
      return formatYouthReportName(a).localeCompare(formatYouthReportName(b), "de");
    });
}
