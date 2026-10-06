import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, roundStat } from "../../types/player-display.ts";
import { defaultYouthContract } from "../../player/youth-contract.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { coachIconLabel } from "../../youth/academy.ts";
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
import { campsAwaitingLeaderChoice, type CampLeaderCandidate } from "../../youth/camp-leader-hire.ts";
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";
import {
  campLeaderPostfachItemId,
  isCampLeaderPostfachItemId,
  parseCampLeaderPostfachItemId,
} from "../../inbox/postfach-camp-leader.ts";
import { CampLeaderInboxCard } from "./CampLeaderInboxCard.tsx";
import { ScoutJobInboxCard } from "./ScoutJobInboxCard.tsx";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import {
  scoutJobNoticeById,
  unconsumedScoutJobNotices,
  type ScoutJobCompleteNotice,
} from "../../scouting/scout-job-postfach.ts";
import { isScoutJobPostfachItemId } from "../../inbox/postfach-scout-job.ts";

/** WIREFRAME: docs/prd/design.md §9.4 — Postfach-Inhalt */
export function DecisionInboxPanel({
  inbox,
  players,
  clubId,
  season,
  week,
  onDecision,
  storyCast,
  initialItemId = null,
  onClose,
  onSelectPlayer,
  youthCamps,
  masterSeed,
  onHireCampLeader,
  scoutBoard,
  onDismissScoutJob,
  onOpenScoutingNetwork,
  onOpenScoutingHits,
}: {
  inbox: YouthInboxState;
  players: Player[];
  clubId: string;
  season: number;
  week: number;
  onDecision: (itemId: string, action: DecisionAction) => void;
  storyCast: StoryCast;
  initialItemId?: string | null;
  onClose?: () => void;
  onSelectPlayer?: (playerId: string) => void;
  youthCamps?: readonly YouthCamp[];
  masterSeed?: number;
  onHireCampLeader?: (campId: string, candidate: CampLeaderCandidate) => void;
  scoutBoard?: ScoutBoard;
  onDismissScoutJob?: (itemId: string) => void;
  onOpenScoutingNetwork?: () => void;
  onOpenScoutingHits?: () => void;
}) {
  useT();
  const focus = useMemo(() => inboxWeekFocus(inbox, players), [inbox, players]);
  const pending = focus.open;
  const campLeaderCamps = useMemo(
    () => (youthCamps ? campsAwaitingLeaderChoice(youthCamps) : []),
    [youthCamps],
  );
  const scoutJobNotices = useMemo(
    () => (scoutBoard ? unconsumedScoutJobNotices(scoutBoard) : []),
    [scoutBoard],
  );
  const postfachQueueIds = useMemo(
    () => [
      ...pending.map((item) => item.id),
      ...campLeaderCamps.map((camp) => campLeaderPostfachItemId(camp.id)),
      ...scoutJobNotices.map((notice) => notice.id),
    ],
    [campLeaderCamps, pending, scoutJobNotices],
  );
  const postfachOpenTotal = postfachQueueIds.length;
  const nextQueuedPlayer = focus.nextQueued
    ? players.find((entry) => entry.id === focus.nextQueued?.playerId)
    : undefined;
  const pipelineHint = inboxPipelineHint(
    focus,
    nextQueuedPlayer ? formatPlayerName(nextQueuedPlayer) : undefined,
  );
  const defaultQueueId =
    initialItemId ??
    pending[0]?.id ??
    (campLeaderCamps[0] ? campLeaderPostfachItemId(campLeaderCamps[0].id) : null);
  const [activeId, setActiveId] = useState<string | null>(defaultQueueId);

  useEffect(() => {
    if (initialItemId && postfachQueueIds.includes(initialItemId)) {
      setActiveId(initialItemId);
    }
  }, [initialItemId, postfachQueueIds]);

  useEffect(() => {
    if (activeId && !postfachQueueIds.includes(activeId)) {
      setActiveId(
        pending[0]?.id ?? (campLeaderCamps[0] ? campLeaderPostfachItemId(campLeaderCamps[0].id) : null),
      );
    }
  }, [activeId, campLeaderCamps, pending, postfachQueueIds]);

  const activeCampId = activeId ? parseCampLeaderPostfachItemId(activeId) : null;
  const activeCamp = activeCampId ? campLeaderCamps.find((camp) => camp.id === activeCampId) : undefined;
  const activeScoutJob =
    activeId && scoutBoard ? scoutJobNoticeById(scoutBoard, activeId) : undefined;
  const active = pending.find((item) => item.id === activeId) ?? null;
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
  const activeActions = active && player ? allowedActions(active, players, clubId, week) : [];
  const showBlockedLoanAction =
    Boolean(loanBlock) && active?.kind === "departure_risk" && !activeActions.includes("loan");
  const primaryAction = active ? primaryInboxAction(active, activeActions) : null;

  return (
    <>
      <header className="inbox-head">
        <div>
          <p className="eyebrow">
            {postfachOpenTotal > focus.openCount || campLeaderCamps.length > 0 || scoutJobNotices.length > 0
              ? t("hub.inbox.postfachQueue", { count: postfachOpenTotal })
              : t("hub.inbox.title", { current: focus.openCount, max: MAX_INBOX_ITEMS })}
            {" · "}
            {formatCalendarWeekDisplay(inbox.week)}
          </p>
          <h2>{t("inbox.modal.decisions")}</h2>
        </div>
        {onClose ? (
          <button type="button" className="inbox-close" onClick={onClose} aria-label={t("inbox.modal.close")}>
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </header>

      <p className="inbox-focus-line">{inboxHeadline(focus)}</p>
      {pipelineHint ? <p className="inbox-queue-note">{pipelineHint}</p> : null}

      {postfachOpenTotal === 0 ? (
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
            {postfachQueueIds.map((queueId, index) => {
              const preview = isCampLeaderPostfachItemId(queueId)
                ? campLeaderQueuePreview(parseCampLeaderPostfachItemId(queueId)!)
                : isScoutJobPostfachItemId(queueId)
                  ? scoutJobQueuePreview(
                      scoutJobNotices.find((notice) => notice.id === queueId),
                    )
                  : inboxQueuePreview(
                      pending.find((item) => item.id === queueId)!,
                      players,
                      storyCast,
                    );
              return (
                <button
                  key={queueId}
                  type="button"
                  className={queueId === activeId ? "inbox-queue-item is-active" : "inbox-queue-item"}
                  onClick={() => setActiveId(queueId)}
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

          {activeCamp && masterSeed != null && onHireCampLeader ? (
            <section className="inbox-card inbox-card-camp-leader">
              <CampLeaderInboxCard
                camp={activeCamp}
                masterSeed={masterSeed}
                postIndex={postfachQueueIds.indexOf(activeId ?? "") + 1}
                postTotal={postfachOpenTotal}
                onHire={(candidate) => onHireCampLeader(activeCamp.id, candidate)}
              />
            </section>
          ) : activeScoutJob && onDismissScoutJob ? (
            <ScoutJobInboxCard
              notice={activeScoutJob}
              postIndex={postfachQueueIds.indexOf(activeId ?? "") + 1}
              postTotal={postfachOpenTotal}
              onDismiss={() => onDismissScoutJob(activeScoutJob.id)}
              onOpenScoutingNetwork={onOpenScoutingNetwork}
              onOpenScoutingHits={onOpenScoutingHits}
            />
          ) : active && isStoryInboxItem(active) && active.narrative ? (
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
                {t("inbox.modal.remove")}
              </button>
            </section>
          ) : active && player ? (
            <section className="inbox-card inbox-card-open">
              <div className="inbox-player">
                <PlayerPortrait seed={player.portrait_seed} size="md" className="inbox-portrait" />
                <div className="inbox-player-body">
                  <p className="inbox-decision-headline">
                    <strong>{formatPlayerName(player)}</strong>
                    <span className="inbox-decision-sep" aria-hidden="true">
                      —
                    </span>
                    <span>{inboxItemLabel(active, storyCast)}</span>
                  </p>
                  <p className="inbox-player-meta">
                    {player.position} · {player.age} J. · CA{" "}
                    {roundStat(estimateCa(player.attributes, player.position))}
                  </p>
                  {coachIcon ? (
                    <p className="inbox-coach-line" title={coachIconLabel(coachIcon)}>
                      Coach: {coachIconLabel(coachIcon)}
                    </p>
                  ) : null}
                  {onSelectPlayer ? (
                    <button type="button" className="negotiation-btn" onClick={() => onSelectPlayer(player.id)}>
                      Profil
                    </button>
                  ) : null}
                </div>
              </div>

              {promotionBlock ? <p className="inbox-promotion-block">{promotionBlock}</p> : null}
              {trialHint ? <p className="inbox-trial-hint">{trialHint}</p> : null}

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
                  <button type="button" className="inbox-action is-disabled" disabled title={loanBlock ?? undefined}>
                    <span>{t("inbox.action.loan")}</span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}

function scoutJobQueuePreview(notice: ScoutJobCompleteNotice | undefined): {
  name: string;
  topic: string;
} {
  if (!notice) return { name: "Scouting", topic: "" };
  if (notice.kind === "region_complete") {
    return {
      name: notice.zoneLabel ?? notice.zoneId ?? "Region",
      topic: t("postfach.scoutJob.queueTopicRegion"),
    };
  }
  return {
    name: notice.clubName ?? notice.careerClubId ?? "Verein",
    topic: t("postfach.scoutJob.queueTopicClub"),
  };
}

function campLeaderQueuePreview(campId: string): { name: string; topic: string } {
  const nation = campNationById(campId);
  return {
    name: nation?.label ?? campId,
    topic: "Camp-Leiter · Kandidaten",
  };
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
  if (item.kind === "assistant_training_reminder") {
    return {
      name: cast.assistant_name,
      topic: inboxItemLabel(item, cast),
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
            : item.kind === "assistant_training_reminder"
              ? ["dismiss"]
              : [];
  return preferred.find((action) => actions.includes(action)) ?? actions[0] ?? null;
}
