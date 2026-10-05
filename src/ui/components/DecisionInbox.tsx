import { useEffect, useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, roundStat } from "../../types/player-display.ts";
import { defaultYouthContract } from "../../player/youth-contract.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { coachIconLabel, type CoachIcon } from "../../youth/academy.ts";
import {
  actionIcon,
  actionLabel,
  allowedActions,
  loanBlockReason,
  inboxHeadline,
  inboxItemLabel,
  inboxPipelineHint,
  inboxWeekFocus,
  isStoryInboxItem,
  MAX_INBOX_ITEMS,
  pendingInboxItems,
  type DecisionAction,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";
import { canPromotePlayer, promotionGateLabel } from "../../youth/promotion-gate.ts";
import { proTrialLabel } from "../../youth/pro-trial.ts";
import { formatCalendarWeekDisplay } from "../../i18n/calendar-display.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { localizeStoryInbox } from "../../i18n/story-display.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { InboxStanceButtons } from "./InboxStanceButtons.tsx";

/**
 * WIREFRAME: docs/prd/design.md §9.4 — Postfach (modal; hub column §9.9) — Decision Inbox
 *
 * Queue (max 4) · player card · icon actions per PRD 03.4.
 */

export function DecisionInboxModal({
  inbox,
  players,
  clubId,
  season,
  week,
  onDecision,
  onClose,
  initialItemId = null,
  storyCast,
}: {
  inbox: YouthInboxState;
  players: Player[];
  clubId: string;
  season: number;
  week: number;
  onDecision: (itemId: string, action: DecisionAction) => void;
  onClose: () => void;
  initialItemId?: string | null;
  storyCast: StoryCast;
}) {
  useT();
  const focus = useMemo(() => inboxWeekFocus(inbox, players), [inbox, players]);
  const pending = focus.open;
  const nextQueuedPlayer = focus.nextQueued
    ? players.find((entry) => entry.id === focus.nextQueued?.playerId)
    : undefined;
  const pipelineHint = inboxPipelineHint(
    focus,
    nextQueuedPlayer ? formatPlayerName(nextQueuedPlayer) : undefined,
  );
  const [activeId, setActiveId] = useState<string | null>(initialItemId ?? pending[0]?.id ?? null);

  useEffect(() => {
    if (initialItemId && pending.some((item) => item.id === initialItemId)) {
      setActiveId(initialItemId);
    }
  }, [initialItemId, pending]);

  useEffect(() => {
    if (!pending.some((item) => item.id === activeId)) {
      setActiveId(pending[0]?.id ?? null);
    }
  }, [pending, activeId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = pending.find((item) => item.id === activeId) ?? pending[0] ?? null;
  const player = active ? players.find((entry) => entry.id === active.playerId) : null;
  const coachIcon = active ? inbox.coachIcons[active.playerId] : undefined;
  const actionContext = active
    ? { item: active, player: player ?? undefined, cast: storyCast }
    : undefined;
  const promotionBlock =
    active?.kind === "promotion" && player
      ? promotionGateLabel(canPromotePlayer(players, clubId, player), player.position)
      : null;
  const trialHint = player ? proTrialLabel(player, season, week) : null;
  const loanBlock = active && player ? loanBlockReason(active, players, clubId, week) : null;
  const activeActions =
    active && player ? allowedActions(active, players, clubId, week) : [];
  const showBlockedLoanAction =
    Boolean(loanBlock) &&
    active?.kind === "departure_risk" &&
    !activeActions.includes("loan");
  const primaryAction = active ? primaryInboxAction(active, activeActions) : null;

  return (
    <div className="inbox-backdrop" onClick={onClose} role="presentation">
      <div
        className="inbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("inbox.modal.aria")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inbox-head">
          <div>
            <p className="eyebrow">
              {t("hub.inbox.title", { current: focus.openCount, max: MAX_INBOX_ITEMS })}
              {" · "}
              {formatCalendarWeekDisplay(inbox.week)}
            </p>
            <h2>{t("inbox.modal.decisions")}</h2>
          </div>
          <button type="button" className="inbox-close" onClick={onClose} aria-label={t("inbox.modal.close")}>
            ✕
          </button>
        </header>

        <p className="inbox-focus-line">{inboxHeadline(focus)}</p>
        {pipelineHint ? <p className="inbox-queue-note">{pipelineHint}</p> : null}

        {pending.length === 0 ? (
          <p className="inbox-empty">
            {focus.nextQueued && nextQueuedPlayer
              ? t("inbox.modal.nextQueued", {
                  name: formatPlayerName(nextQueuedPlayer),
                  label: inboxItemLabel(focus.nextQueued, storyCast),
                })
              : t("inbox.modal.empty")}
          </p>
        ) : (
          <>
            <nav className="inbox-queue" aria-label="Warteschlange">
              {pending.map((item, index) => {
                const preview = inboxQueuePreview(item, players, storyCast);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === active?.id ? "inbox-queue-item is-active" : "inbox-queue-item"}
                    onClick={() => setActiveId(item.id)}
                  >
                    <span className="inbox-queue-index">{index + 1}</span>
                    <span className="inbox-queue-label">
                      <span className="inbox-queue-name">{preview.name}</span>
                      <span className="inbox-queue-topic">{preview.topic}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {active && isStoryInboxItem(active) && active.narrative ? (
              <section className="inbox-card inbox-card-story">
                <div className="inbox-story">
                  <p className="inbox-post-count">
                    Post · {(pending.findIndex((item) => item.id === active.id) ?? 0) + 1}/{pending.length}
                  </p>
                  <strong>{localizeStoryInbox(active.narrative, storyCast).title}</strong>
                  <p>{localizeStoryInbox(active.narrative, storyCast).body}</p>
                </div>
                <InboxStanceButtons
                  item={active}
                  storyCast={storyCast}
                  onChoose={(action) => onDecision(active.id, action)}
                />
              </section>
            ) : active && !player ? (
              <section className="inbox-card inbox-card-orphan">
                <p>{t("inbox.modal.orphan")}</p>
                <button type="button" className="inbox-action" onClick={() => onDecision(active.id, "dismiss")}>
                  <span aria-hidden="true">✕</span>
                  <span>{t("inbox.modal.remove")}</span>
                </button>
              </section>
            ) : active && player ? (
              <section className="inbox-card">
                <div className="inbox-player">
                  <PlayerPortrait seed={player.portrait_seed} size="md" className="inbox-portrait" />
                  <div className="inbox-player-body">
                    <p className="inbox-decision-headline">
                      <strong>{formatPlayerName(player)}</strong>
                      <span className="inbox-decision-sep" aria-hidden="true">—</span>
                      <span>{inboxItemLabel(active, storyCast)}</span>
                    </p>
                    <p className="inbox-player-meta">
                      {player.position} · {player.age} J. · CA {roundStat(estimateCa(player.attributes, player.position))}
                    </p>
                    {coachIcon ? (
                      <p className="inbox-coach-line" title={coachIconLabel(coachIcon)}>
                        <span className="inbox-coach-icon" aria-hidden="true">{coachIcon}</span>
                        <span>Coach: {coachIconLabel(coachIcon)}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {active.kind === "contract_offer" || active.reason === "no_contract" ? (
                  <p className="inbox-contract-hint">
                    ✍️ Angebot: € {defaultYouthContract(player.age, 1).wage_weekly}/Woche · Moral + bei Unterschrift
                  </p>
                ) : null}

                {promotionBlock ? (
                  <p className="inbox-promotion-block">🚫 {promotionBlock}</p>
                ) : null}

                {trialHint ? <p className="inbox-trial-hint">🏃 {trialHint}</p> : null}

                {active.reason === "ready_for_pro" && !promotionBlock ? (
                  <p className="inbox-contract-hint">
                    🏃 Probewoche: eine Woche Profiteam, danach automatische Beförderung wenn Platz frei ist.
                  </p>
                ) : null}

                <div className="inbox-actions" aria-label="Aktionen">
                  {activeActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={action === primaryAction ? "inbox-action is-primary" : "inbox-action"}
                      onClick={() => onDecision(active.id, action)}
                    >
                      <span aria-hidden="true">{actionIcon(action, actionContext)}</span>
                      <span>{actionLabel(action, actionContext)}</span>
                    </button>
                  ))}
                  {showBlockedLoanAction ? (
                    <button
                      type="button"
                      className="inbox-action is-disabled"
                      disabled
                      title={loanBlock ?? undefined}
                    >
                      <span aria-hidden="true">🔄</span>
                      <span>{t("inbox.action.loan")}</span>
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function inboxQueuePreview(
  item: DecisionInboxItem,
  players: readonly Player[],
  cast: StoryCast,
): { name: string; topic: string } {
  if (isStoryInboxItem(item) && item.narrative) {
    const body = localizeStoryInbox(item.narrative, cast).body;
    return {
      name: inboxItemLabel(item, cast),
      topic: body.length > 48 ? `${body.slice(0, 48)}…` : body,
    };
  }
  const player = players.find((entry) => entry.id === item.playerId);
  return {
    name: player ? formatPlayerName(player) : t("inbox.modal.playerFallback"),
    topic: inboxItemLabel(item, cast),
  };
}

function primaryInboxAction(
  item: DecisionInboxItem,
  actions: readonly DecisionAction[],
): DecisionAction | null {
  const preferred: DecisionAction[] =
    item.kind === "promotion"
      ? ["promote", "contract", "training_focus", "dismiss"]
      : item.kind === "contract_offer"
        ? ["contract", "dismiss"]
        : item.kind === "departure_risk"
          ? ["contract", "loan", "dismiss"]
          : item.kind === "training_focus"
            ? ["training_focus", "dismiss"]
            : [];
  return preferred.find((action) => actions.includes(action)) ?? actions[0] ?? null;
}

export function coachIconForPlayer(inbox: YouthInboxState, playerId: string): CoachIcon {
  return inbox.coachIcons[playerId] ?? "➡️";
}

export function hasDepartureRisk(
  inbox: YouthInboxState,
  playerId: string,
  players?: readonly Player[],
): boolean {
  return pendingInboxItems(inbox, players).some(
    (item) => item.playerId === playerId && item.kind === "departure_risk",
  );
}
