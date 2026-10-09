import { useEffect, useMemo, useState } from "react";
import type { SandboxPlan } from "@fussballmanager/shared";
import { X } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { defaultYouthContract } from "../../player/youth-contract.ts";
import { coachIconLabel } from "../../youth/academy.ts";
import {
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
import { t } from "../../i18n/index.ts";
import { postfachPresentation, postfachUsesExpandModal } from "../../inbox/postfach-presentation.ts";
import { campNationById } from "../../youth/satellite-camps.ts";
import { useT } from "../../i18n/react.ts";
import { localizeStoryInbox } from "../../i18n/story-display.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { InboxStanceButtons } from "./InboxStanceButtons.tsx";
import { campsAwaitingLeaderChoice, type CampLeaderCandidate } from "../../youth/camp-leader-hire.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import { parseCampLeaderPostfachItemId } from "../../inbox/postfach-camp-leader.ts";
import { CampLeaderInboxCard } from "./CampLeaderInboxCard.tsx";
import { ScoutJobInboxCard } from "./ScoutJobInboxCard.tsx";
import { OpponentScoutInboxCard } from "./OpponentScoutInboxCard.tsx";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import {
  scoutJobNoticeById,
  unconsumedScoutJobNotices,
} from "../../scouting/scout-job-postfach.ts";
import { buildPostfachArchive } from "../../inbox/postfach-archive.ts";
import { buildPostfachQueueIds } from "../../inbox/postfach-queue.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import { PostfachDecisionGrid } from "./PostfachDecisionGrid.tsx";
import { PostfachArchiveList } from "./PostfachArchiveList.tsx";
import { PostfachArchiveDetail } from "./PostfachArchiveDetail.tsx";
import type { PostfachArchiveEntry } from "../../inbox/postfach-archive.ts";
import { PostfachExpandModal } from "./PostfachExpandModal.tsx";
import { InboxActionButton } from "./InboxActionButton.tsx";
import { KickerInboxCard } from "./KickerInboxCard.tsx";
import type { KickerEdition, TreterEdition } from "../../media/kicker-digest.ts";
import { buildTreterEdition } from "../../media/kicker-digest.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import type { WorldClub } from "../../world/world-generator.ts";

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
  onApplyOpponentScoutPlan,
  clubEvents = [],
  kickerEdition = null,
  kickerEditionArchive = [],
  transferHistory = [],
  rivalPlayers = [],
  worldClubs = [],
  treterSession,
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
  onApplyOpponentScoutPlan?: (plan: SandboxPlan) => void;
  clubEvents?: readonly ClubEvent[];
  kickerEdition?: KickerEdition | null;
  kickerEditionArchive?: readonly TreterEdition[];
  transferHistory?: readonly TransferRecord[];
  rivalPlayers?: readonly Player[];
  worldClubs?: readonly WorldClub[];
  treterSession?: GameSession | null;
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
  const archiveEntries = useMemo(
    () =>
      buildPostfachArchive({
        scoutBoard: scoutBoard ?? { targets: {} },
        clubEvents,
        youthInbox: inbox,
        players,
        season,
        storyCast,
      }),
    [clubEvents, inbox, players, scoutBoard, season, storyCast],
  );
  const postfachQueueIds = useMemo(
    () => buildPostfachQueueIds(pending, campLeaderCamps, scoutJobNotices),
    [campLeaderCamps, pending, scoutJobNotices],
  );
  const postfachOpenTotal = postfachQueueIds.length;
  const pipelineHint = inboxPipelineHint(focus);
  const defaultQueueId =
    initialItemId && postfachQueueIds.includes(initialItemId)
      ? initialItemId
      : (postfachQueueIds[0] ?? null);
  const [activeId, setActiveId] = useState<string | null>(defaultQueueId);
  const [archiveEntry, setArchiveEntry] = useState<PostfachArchiveEntry | null>(null);
  const [expandModalOpen, setExpandModalOpen] = useState(false);
  const presentation = postfachPresentation(activeId, scoutBoard);

  useEffect(() => {
    if (initialItemId && postfachQueueIds.includes(initialItemId)) {
      setActiveId(initialItemId);
    }
  }, [initialItemId, postfachQueueIds]);

  useEffect(() => {
    if (postfachUsesExpandModal(presentation)) {
      setExpandModalOpen(true);
    } else {
      setExpandModalOpen(false);
    }
  }, [activeId, presentation]);

  useEffect(() => {
    if (activeId && !postfachQueueIds.includes(activeId)) {
      setActiveId(postfachQueueIds[0] ?? null);
    }
  }, [activeId, postfachQueueIds]);

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
  const kickerEditionResolved = useMemo((): KickerEdition => {
    if (kickerEdition && kickerEdition.season === season && kickerEdition.week === week) {
      return kickerEdition;
    }
    if (treterSession) return buildTreterEdition(treterSession);
    return { season, week, masthead: "", articles: [] };
  }, [kickerEdition, season, week, treterSession]);

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

      {postfachOpenTotal > 0 ? (
        <>
          <PostfachDecisionGrid
            queueIds={postfachQueueIds}
            activeId={activeId}
            pending={pending}
            players={players}
            storyCast={storyCast}
            scoutJobNotices={scoutJobNotices}
            onSelect={setActiveId}
          />

          {presentation === "modal-camp" && activeCamp && expandModalOpen ? (
            <PostfachExpandModal
              title={t("postfach.campLeader.modalTitle", {
                nation: campNationById(activeCamp.id)?.label ?? activeCamp.id,
              })}
              onClose={() => setExpandModalOpen(false)}
            >
              {masterSeed != null && onHireCampLeader ? (
                <CampLeaderInboxCard
                  camp={activeCamp}
                  masterSeed={masterSeed}
                  postIndex={postfachQueueIds.indexOf(activeId ?? "") + 1}
                  postTotal={postfachOpenTotal}
                  embedded
                  onHire={(candidate) => {
                    onHireCampLeader(activeCamp.id, candidate);
                    setExpandModalOpen(false);
                  }}
                />
              ) : null}
            </PostfachExpandModal>
          ) : null}

          {presentation === "modal-opponent-scout" &&
          activeScoutJob?.kind === "opponent_scout_complete" &&
          expandModalOpen &&
          onDismissScoutJob ? (
            <PostfachExpandModal
              title={t("postfach.opponentScout.title", {
                opponent: activeScoutJob.opponentShortName ?? "",
              })}
              onClose={() => setExpandModalOpen(false)}
            >
              <OpponentScoutInboxCard
                notice={activeScoutJob}
                postIndex={postfachQueueIds.indexOf(activeId ?? "") + 1}
                postTotal={postfachOpenTotal}
                embedded
                onDismiss={() => {
                  onDismissScoutJob(activeScoutJob.id);
                  setExpandModalOpen(false);
                }}
                onApplyPlan={onApplyOpponentScoutPlan}
              />
            </PostfachExpandModal>
          ) : null}

          {presentation === "modal-camp" && !expandModalOpen ? (
            <p className="inbox-inline-hint">
              <button type="button" className="hub-events-all-link" onClick={() => setExpandModalOpen(true)}>
                {t("postfach.tile.openCandidates")}
              </button>
            </p>
          ) : null}

          {presentation === "modal-opponent-scout" && !expandModalOpen ? (
            <p className="inbox-inline-hint">
              <button type="button" className="hub-events-all-link" onClick={() => setExpandModalOpen(true)}>
                {t("postfach.tile.openReport")}
              </button>
            </p>
          ) : null}

          {activeScoutJob && presentation === "inline-scout-job" && onDismissScoutJob ? (
            <ScoutJobInboxCard
              notice={activeScoutJob}
              postIndex={postfachQueueIds.indexOf(activeId ?? "") + 1}
              postTotal={postfachOpenTotal}
              onDismiss={() => onDismissScoutJob(activeScoutJob.id)}
              onOpenScoutingNetwork={onOpenScoutingNetwork}
              onOpenScoutingHits={onOpenScoutingHits}
              compact
            />
          ) : active && isStoryInboxItem(active) && active.narrative ? (
            <section className="inbox-detail inbox-card-story">
              <div className="inbox-story">
                <p className="inbox-post-count">
                  {t("postfach.scoutJob.postCount", {
                    index: postfachQueueIds.indexOf(active.id) + 1,
                    total: postfachOpenTotal,
                  })}
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
          ) : active?.kind === "kicker_transfer" ? (
            <KickerInboxCard
              edition={kickerEditionResolved}
              postIndex={postfachQueueIds.indexOf(active.id) + 1}
              postTotal={postfachOpenTotal}
              onDismiss={() => onDecision(active.id, "dismiss")}
              onSelectPlayer={onSelectPlayer}
              compact
            />
          ) : active?.kind === "assistant_training_reminder" ? (
            <section className="inbox-detail inbox-card-training-reminder">
              <p className="inbox-post-count">
                {t("postfach.scoutJob.postCount", {
                  index: postfachQueueIds.indexOf(active.id) + 1,
                  total: postfachOpenTotal,
                })}
              </p>
              <p>
                <strong>{storyCast.assistant_name}</strong>
              </p>
              <p>{inboxItemLabel(active, storyCast)}</p>
              <div className="inbox-actions">
                <button type="button" className="inbox-action" onClick={() => onDecision(active.id, "dismiss")}>
                  {t("inbox.modal.remove")}
                </button>
              </div>
            </section>
          ) : active && !player ? (
            <section className="inbox-detail inbox-card-orphan">
              <p>{t("inbox.modal.orphan")}</p>
              <button type="button" className="inbox-action" onClick={() => onDecision(active.id, "dismiss")}>
                {t("inbox.modal.remove")}
              </button>
            </section>
          ) : active && player ? (
            <section className="inbox-detail inbox-card-youth">
              <p className="inbox-youth-context">
                <span>{inboxItemLabel(active, storyCast)}</span>
                {coachIcon ? (
                  <span className="inbox-coach-line" title={coachIconLabel(coachIcon)}>
                    {coachIconLabel(coachIcon)}
                  </span>
                ) : null}
                {onSelectPlayer ? (
                  <button type="button" className="hub-events-all-link" onClick={() => onSelectPlayer(player.id)}>
                    {t("inbox.modal.profile")}
                  </button>
                ) : null}
              </p>

              {promotionBlock ? <p className="inbox-promotion-block">{promotionBlock}</p> : null}
              {trialHint ? <p className="inbox-trial-hint">{trialHint}</p> : null}

              <div className="inbox-actions" aria-label={t("inbox.modal.actionsAria")}>
                {activeActions.map((action) => (
                  <InboxActionButton
                    key={action}
                    action={action}
                    primary={action === primaryAction}
                    label={actionLabel(action, actionContext)}
                    onClick={() => onDecision(active.id, action)}
                  />
                ))}
                {showBlockedLoanAction ? (
                  <InboxActionButton
                    action="loan"
                    disabled
                    title={loanBlock ?? undefined}
                    label={t("inbox.action.loan")}
                    onClick={() => undefined}
                  />
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {archiveEntry ? (
        <PostfachArchiveDetail
          entry={archiveEntry}
          onClose={() => setArchiveEntry(null)}
          inbox={inbox}
          players={players}
          storyCast={storyCast}
          clubEvents={clubEvents}
          scoutBoard={scoutBoard}
          kickerEditionArchive={kickerEditionArchive}
          kickerEditionCurrent={kickerEdition}
          onSelectPlayer={onSelectPlayer}
        />
      ) : null}

      <PostfachArchiveList
        entries={archiveEntries}
        activeEntryId={archiveEntry?.id ?? null}
        onSelectEntry={setArchiveEntry}
      />
    </>
  );
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
              : item.kind === "kicker_transfer"
                ? ["dismiss"]
                : [];
  return preferred.find((action) => actions.includes(action)) ?? actions[0] ?? null;
}
