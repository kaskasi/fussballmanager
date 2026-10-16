import { useCallback, useRef, type MutableRefObject } from "react";
import { deliverMerchandisingOrders } from "../../economy/merchandising.ts";
import { t } from "../../i18n/index.ts";
import {
  applyWeeklyKickerDelivery,
  kickerItemId,
  KICKER_DELIVERY_WEEKDAY,
  shouldDeliverWeeklyKicker,
} from "../../inbox/kicker-inbox.ts";
import { appendMatchdayClubEvents } from "../../match/post-match-events.ts";
import { tickMedicalSessionDay, tickMedicalSessionDays } from "../../medical/medical-session.ts";
import { resolveFeatureCurtain } from "../../narrative/career-presentation.ts";
import { saveFromSession, sessionFromSave } from "../../persistence/game-session.ts";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import { advanceScoutWorkingDay } from "../../scouting/scout-board.ts";
import { buildOpponentScoutWorkingDayContext } from "../../scouting/opponent-scout-job.ts";
import { prepareCareerMatch, type CareerMatchSetup } from "../../sim/career-match-setup.ts";
import { MONDAY, resolveSmartSkip } from "../../sim/day-calendar.ts";
import {
  fastForwardToMonthEnd,
  sessionAfterWeekSimulation,
} from "../../sim/fast-forward-to-month.ts";
import { shouldPauseTrainingAutoNext } from "../../sim/training-auto-next.ts";
import {
  isTrainingCalendarGatePending,
  isTrainingNextActive,
  runTrainingNextStep,
} from "../../sim/training-next.ts";
import type { WatchedPlayerMatch } from "../../sim/watched-player-match.ts";
import { simulateGameWeek } from "../../sim/week-pipeline.ts";
import { worldCareerClubId } from "../../world/world-generator.ts";
import {
  deliverDailyInbox,
  deliverInboxForDays,
  pendingInboxItems,
} from "../../youth/decision-inbox.ts";
import { tickCampLeaderHires } from "../../youth/camp-leader-hire.ts";
import { MANAGER_DESK_HUB_ENABLED } from "../../hub/config.ts";
import { logPostHogInfo, trackEvent } from "../../telemetry/analytics.ts";
import { Diag } from "../../telemetry/diagnostic-log.ts";
import {
  hasInboxBlockerForNext,
  shouldNavigateToCalendarBeforeTimeStep,
  shouldOpenLineupFromCalendar,
} from "../nav-next-flow.ts";
import type { PersistedSession } from "../session/usePersistedGameSession.ts";
import type { Screen } from "../shell/types.ts";
import { attributeLabel } from "../player-profile.ts";
import type { Attributes } from "../../types/player.ts";
import type { Player } from "../../types/player.ts";
import type { YouthInboxState } from "../../youth/decision-inbox.ts";

const CALENDAR_MONTH_KEYS = [
  "calendar.month.january",
  "calendar.month.february",
  "calendar.month.march",
  "calendar.month.april",
  "calendar.month.may",
  "calendar.month.june",
  "calendar.month.july",
  "calendar.month.august",
  "calendar.month.september",
  "calendar.month.october",
  "calendar.month.november",
  "calendar.month.december",
] as const;

export interface UseWeekAdvanceParams {
  save: SaveGame;
  session: PersistedSession;
  youthInbox: YouthInboxState;
  players: readonly Player[];
  screen: Screen;
  simulating: boolean;
  setSimulating: (value: boolean) => void;
  setScreen: (screen: Screen) => void;
  setTrainingAutoNext: (value: boolean | ((prev: boolean) => boolean)) => void;
  trainingAutoNext: boolean;
  patchSession: (recipe: (current: PersistedSession) => PersistedSession) => void;
  replaceSave: (updater: (current: SaveGame) => SaveGame) => void;
  setSave: (updater: (current: SaveGame) => SaveGame) => void;
  flashNotice: (text: string, tone?: "ok" | "warn") => void;
  openPostfach: (itemId?: string) => void;
  setPostfachItemId: (id: string | null) => void;
  setProfileId: (id: string | null) => void;
  setForeignPlayerId: (id: string | null) => void;
  setProfileFeedback: (value: string | null) => void;
  careerMatchSetup: CareerMatchSetup | null;
  careerMatchUiVisible: boolean;
  careerMatchFlowRef: MutableRefObject<boolean>;
  setCareerMatchSetup: (value: CareerMatchSetup | null) => void;
  setCareerMatchUiVisible: (value: boolean) => void;
  pendingWatchedMatch: WatchedPlayerMatch | null;
  setPendingWatchedMatch: (value: WatchedPlayerMatch | null) => void;
  revealCampDebut: (payload: { campId: string; playerId: string }) => void;
}

function advanceScoutBoardForSession(current: PersistedSession, weekday: number) {
  const club = current.world.clubs.find(
    (entry) => worldCareerClubId(entry.id) === current.clubId,
  );
  const division = club?.division_id ?? "regionalliga-nord";
  const opponentCtx = buildOpponentScoutWorkingDayContext(current);
  return advanceScoutWorkingDay(
    current.scoutBoard,
    weekday,
    current.rivalPlayers,
    current.scoutNetwork,
    current.world.clubs,
    current.season,
    current.week,
    division,
    opponentCtx,
  );
}

export function useWeekAdvance(params: UseWeekAdvanceParams) {
  const {
    save,
    session,
    youthInbox,
    players,
    screen,
    simulating,
    setSimulating,
    setScreen,
    setTrainingAutoNext,
    trainingAutoNext,
    patchSession,
    replaceSave,
    setSave,
    flashNotice,
    openPostfach,
    setPostfachItemId,
    setProfileId,
    setForeignPlayerId,
    setProfileFeedback,
    careerMatchSetup,
    careerMatchUiVisible,
    careerMatchFlowRef,
    setCareerMatchSetup,
    setCareerMatchUiVisible,
    pendingWatchedMatch,
    setPendingWatchedMatch,
    revealCampDebut,
  } = params;

  const finishWeekSimulation = useCallback(
    async (watchedMatch?: WatchedPlayerMatch | null) => {
      const snapshot = sessionFromSave(save);
      const override = watchedMatch ?? pendingWatchedMatch;
      const result = await simulateGameWeek(snapshot, override);
      setPendingWatchedMatch(null);
      replaceSave((current) => {
        const weekStamp = {
          season: result.session.season,
          week: result.session.week,
          weekday: MONDAY,
        };
        let nextSession = {
          ...result.session,
          weekday: MONDAY,
          trainingUnitsCompleted: 0,
          trainingUnitOutcomes: [],
          trainingCalendarGateDone: !resolveFeatureCurtain(result.session.storyState).auto_training
            ? false
            : true,
          matchPlayedThisWeek: false,
          youthInbox: deliverDailyInbox(
            result.session.youthInbox,
            {
              season: result.session.season,
              week: result.session.week,
              weekday: MONDAY,
              masterSeed: result.session.masterSeed,
            },
            result.session.players,
          ),
          youthCamps: tickCampLeaderHires(result.session.youthCamps, weekStamp),
        };
        if (result.playerFixture) {
          nextSession = {
            ...nextSession,
            clubEvents: appendMatchdayClubEvents(
              nextSession.clubEvents,
              nextSession.season,
              nextSession.week,
              result.playerFixture,
              nextSession.league.player_club_id,
              result.matchdayStats,
            ),
          };
        }
        return saveFromSession(nextSession, current);
      });
      if (result.campDebuts.length > 0) {
        const debut = result.campDebuts[0]!;
        const hasPlayer = result.session.players.some((entry) => entry.id === debut.playerId);
        if (hasPlayer) {
          revealCampDebut(debut);
        }
      }
      trackEvent("week_simulation_completed", { watched_match: Boolean(override) });
      logPostHogInfo("Game week simulation completed", {
        event: "game_week_simulation_completed",
        watched_match: Boolean(override),
      });
    },
    [pendingWatchedMatch, replaceSave, revealCampDebut, save, setPendingWatchedMatch],
  );

  const simulateWeek = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      await finishWeekSimulation();
    } catch (error) {
      console.error("Week simulation failed", error);
      flashNotice(t("shell.weekSimFailed"), "warn");
    } finally {
      setSimulating(false);
    }
  }, [finishWeekSimulation, flashNotice, setSimulating, simulating]);

  const handleFastForwardToMonth = useCallback(
    async (targetMonthIndex: number) => {
      if (simulating) return;
      setSimulating(true);
      try {
        const snapshot = sessionFromSave(save);
        const advanceSessionDays = (
          current: typeof snapshot,
          daysAdvanced: number,
          targetWeekday: number,
        ) => {
          const now = {
            season: current.season,
            week: current.week,
            weekday: targetWeekday,
          };
          let next = {
            ...current,
            weekday: targetWeekday,
            youthInbox: deliverInboxForDays(
              current.youthInbox,
              {
                season: current.season,
                week: current.week,
                weekday: current.weekday,
                masterSeed: current.masterSeed,
              },
              daysAdvanced,
              current.players,
            ),
            youthCamps: tickCampLeaderHires(current.youthCamps, now),
            scoutBoard: advanceScoutBoardForSession(current, targetWeekday),
          };
          next = tickMedicalSessionDays(next, daysAdvanced);
          return applyWeeklyKickerDelivery(next);
        };
        const simulateWeekForFastForward = async (current: typeof snapshot) => {
          const result = await simulateGameWeek(current);
          let next = sessionAfterWeekSimulation(result.session);
          const weekStamp = {
            season: next.season,
            week: next.week,
            weekday: MONDAY,
          };
          next = {
            ...next,
            trainingCalendarGateDone: !resolveFeatureCurtain(next.storyState).auto_training
              ? false
              : true,
            youthInbox: deliverDailyInbox(
              next.youthInbox,
              {
                season: next.season,
                week: next.week,
                weekday: MONDAY,
                masterSeed: next.masterSeed,
              },
              next.players,
            ),
            youthCamps: tickCampLeaderHires(next.youthCamps, weekStamp),
          };
          return next;
        };
        const outcome = await Promise.race([
          fastForwardToMonthEnd(snapshot, targetMonthIndex, {
            simulateWeek: simulateWeekForFastForward,
            advanceSessionDays,
            onProgress: async (sessionAfterStep) => {
              await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 0);
              });
              setSave((current) => saveFromSession(sessionAfterStep, current));
            },
          }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Fast-forward timeout (90s)")), 90_000);
          }),
        ]);
        const monthLabel = t(
          CALENDAR_MONTH_KEYS[targetMonthIndex] ?? "calendar.month.january",
        );
        replaceSave((current) => saveFromSession(outcome.session, current));
        trackEvent("calendar_fast_forward_completed", {
          outcome: outcome.reason,
          steps: outcome.steps,
        });
        if (outcome.reason === "reached") {
          flashNotice(
            t("calendar.fastForward.done", {
              month: monthLabel,
              steps: String(outcome.steps),
            }),
            "ok",
          );
        } else if (outcome.reason === "training_plan") {
          flashNotice(t("calendar.fastForward.trainingPlan"), "warn");
        } else if (outcome.reason === "season_complete") {
          flashNotice(t("calendar.fastForward.seasonComplete"), "warn");
        } else if (outcome.reason === "limit") {
          flashNotice(
            t("calendar.fastForward.limit", { steps: String(outcome.steps) }),
            "warn",
          );
        } else if (outcome.reason === "stall") {
          flashNotice(t("calendar.fastForward.stall"), "warn");
        }
      } catch (error) {
        console.error("Fast-forward failed", error);
        const detail = error instanceof Error ? error.message : String(error);
        flashNotice(
          import.meta.env.DEV
            ? `${t("shell.weekSimFailed")} (${detail})`
            : t("shell.weekSimFailed"),
          "warn",
        );
      } finally {
        setSimulating(false);
      }
    },
    [flashNotice, replaceSave, save, setSave, setSimulating, simulating],
  );

  const handleNext = useCallback(
    (trigger?: { fromAuto?: boolean }) => {
      const fromAuto = trigger?.fromAuto === true;
      if (simulating) return;

      const careerMatchActive = Boolean(careerMatchSetup && careerMatchUiVisible);
      const pauseAuto = shouldPauseTrainingAutoNext({
        session,
        youthInbox,
        players,
        screen,
        simulating,
        careerMatchActive,
      });

      if (
        MANAGER_DESK_HUB_ENABLED &&
        screen !== "hub" &&
        screen !== "calendar" &&
        !careerMatchActive
      ) {
        setScreen("hub");
        return;
      }

      if (fromAuto) {
        if (pauseAuto) {
          setTrainingAutoNext(false);
          return;
        }
      } else if (screen === "training") {
        setTrainingAutoNext(!pauseAuto);
      } else if (MANAGER_DESK_HUB_ENABLED && screen === "hub" && !fromAuto && trainingAutoNext) {
        setTrainingAutoNext(false);
        return;
      }

      const focusHubInboxDecision = () => {
        const pending = pendingInboxItems(youthInbox, players);
        setPostfachItemId(pending[0]?.id ?? null);
        setProfileId(null);
        setForeignPlayerId(null);
        setProfileFeedback(null);
        flashNotice(t("shell.nextToPostfach"), "warn");
      };

      if (hasInboxBlockerForNext(session, youthInbox, players)) {
        Diag.next("blocked_inbox");
        if (MANAGER_DESK_HUB_ENABLED) {
          if (screen === "hub") {
            focusHubInboxDecision();
          } else {
            setScreen("hub");
          }
        } else {
          openPostfach();
        }
        return;
      }

      if (!MANAGER_DESK_HUB_ENABLED && isTrainingCalendarGatePending(session)) {
        if (screen !== "calendar") {
          setScreen("calendar");
          return;
        }
        patchSession((current) => ({ ...current, trainingCalendarGateDone: true }));
        setScreen("training");
        flashNotice(t("training.next.weekStart"), "ok");
        return;
      }

      if (isTrainingNextActive(session)) {
        if (MANAGER_DESK_HUB_ENABLED && screen === "hub" && !fromAuto && !trainingAutoNext) {
          setTrainingAutoNext(true);
        }
        const preview = runTrainingNextStep(session);
        const deliverKickerAfterStep =
          preview.session.weekday === KICKER_DELIVERY_WEEKDAY &&
          shouldDeliverWeeklyKicker({
            session: { ...session, weekday: KICKER_DELIVERY_WEEKDAY },
            inbox: session.youthInbox,
            targetWeekday: KICKER_DELIVERY_WEEKDAY,
          });
        patchSession((current) => {
          const step = runTrainingNextStep(current);
          let nextSession = step.session;
          if (nextSession.weekday !== current.weekday) {
            nextSession = {
              ...nextSession,
              stadium: deliverMerchandisingOrders(
                current.stadium,
                nextSession.season,
                nextSession.week,
                nextSession.weekday,
              ),
              scoutBoard: advanceScoutBoardForSession(current, nextSession.weekday),
            };
            nextSession = tickMedicalSessionDay(nextSession);
          }
          return deliverKickerAfterStep ? applyWeeklyKickerDelivery(nextSession) : nextSession;
        });
        trackEvent("training_step_completed", { automated: fromAuto });
        if (deliverKickerAfterStep) {
          const treterId = kickerItemId(session.season, session.week);
          setPostfachItemId(treterId);
          setProfileId(null);
          setForeignPlayerId(null);
          setProfileFeedback(null);
          if (!MANAGER_DESK_HUB_ENABLED) {
            setScreen("postfach");
          }
        }
        const stayOnHub = MANAGER_DESK_HUB_ENABLED && screen === "hub";
        const trainingNavScreen: Screen = MANAGER_DESK_HUB_ENABLED ? "hub" : "training";
        if (preview.openTrainingScreen) {
          if (!stayOnHub) setScreen(trainingNavScreen);
        } else if (screen !== "training" && !stayOnHub) {
          setScreen(trainingNavScreen);
        }
        const silentToast =
          preview.toast.key === "training.next.unitResult" ||
          preview.toast.key === "training.next.unitResultQuiet";
        if (!silentToast) {
          const toastParams =
            "params" in preview.toast && preview.toast.params
              ? { ...preview.toast.params }
              : undefined;
          if (toastParams?.attribute) {
            toastParams.attribute = attributeLabel(toastParams.attribute as keyof Attributes);
          }
          flashNotice(
            toastParams ? t(preview.toast.key, toastParams) : t(preview.toast.key),
            preview.openTrainingScreen ? "warn" : "ok",
          );
        }
        return;
      }

      if (
        shouldNavigateToCalendarBeforeTimeStep(
          screen,
          hasInboxBlockerForNext(session, youthInbox, players),
          session,
        )
      ) {
        setScreen("calendar");
        return;
      }

      const hasInbox = pendingInboxItems(youthInbox, players).length > 0;
      const skip = resolveSmartSkip(session, hasInbox);

      if (skip.action === "inbox") {
        if (MANAGER_DESK_HUB_ENABLED) {
          if (screen === "hub") {
            focusHubInboxDecision();
          } else {
            setScreen("hub");
          }
        } else {
          openPostfach();
        }
        return;
      }

      if (MANAGER_DESK_HUB_ENABLED && screen === "hub" && !fromAuto && !trainingAutoNext) {
        setTrainingAutoNext(true);
      }

      const inboxAfterDays =
        skip.daysAdvanced > 0
          ? deliverInboxForDays(
              session.youthInbox,
              {
                season: session.season,
                week: session.week,
                weekday: session.weekday,
                masterSeed: session.masterSeed,
              },
              skip.daysAdvanced,
              session.players,
            )
          : session.youthInbox;
      const sessionAtTarget = { ...session, weekday: skip.weekday, youthInbox: inboxAfterDays };

      if (skip.action === "match" || shouldOpenLineupFromCalendar(skip, session)) {
        if (skip.daysAdvanced > 0) {
          patchSession((current) => {
            const now = { season: current.season, week: current.week, weekday: skip.weekday };
            const stepped = {
              ...current,
              weekday: skip.weekday,
              youthInbox: deliverInboxForDays(
                current.youthInbox,
                {
                  season: current.season,
                  week: current.week,
                  weekday: current.weekday,
                  masterSeed: current.masterSeed,
                },
                skip.daysAdvanced,
                current.players,
              ),
              youthCamps: tickCampLeaderHires(current.youthCamps, now),
              scoutBoard: advanceScoutBoardForSession(current, skip.weekday),
            };
            return tickMedicalSessionDays(stepped, skip.daysAdvanced);
          });
        }
        const setup = prepareCareerMatch(sessionAtTarget);
        if (setup) {
          careerMatchFlowRef.current = true;
          setCareerMatchUiVisible(true);
          setCareerMatchSetup(setup);
          setScreen("hub");
          return;
        }
      }

      if (skip.action === "simulate_week") {
        void simulateWeek();
        return;
      }

      if (skip.action === "advance" && skip.daysAdvanced > 0) {
        const landOnKickerDay =
          skip.weekday === KICKER_DELIVERY_WEEKDAY &&
          shouldDeliverWeeklyKicker({
            session: { ...session, weekday: skip.weekday },
            inbox: session.youthInbox,
            targetWeekday: KICKER_DELIVERY_WEEKDAY,
          });
        patchSession((current) => {
          const now = { season: current.season, week: current.week, weekday: skip.weekday };
          let next = {
            ...current,
            weekday: skip.weekday,
            youthInbox: deliverInboxForDays(
              current.youthInbox,
              {
                season: current.season,
                week: current.week,
                weekday: current.weekday,
                masterSeed: current.masterSeed,
              },
              skip.daysAdvanced,
              current.players,
            ),
            youthCamps: tickCampLeaderHires(current.youthCamps, now),
            scoutBoard: advanceScoutBoardForSession(current, skip.weekday),
          };
          next = tickMedicalSessionDays(next, skip.daysAdvanced);
          next = applyWeeklyKickerDelivery(next);
          return next;
        });
        if (landOnKickerDay) {
          const treterId = kickerItemId(session.season, session.week);
          setPostfachItemId(treterId);
          setProfileId(null);
          setForeignPlayerId(null);
          setProfileFeedback(null);
          if (!MANAGER_DESK_HUB_ENABLED) {
            setScreen("postfach");
          } else {
            setScreen("hub");
          }
        }
      }
    },
    [
      careerMatchFlowRef,
      careerMatchSetup,
      careerMatchUiVisible,
      flashNotice,
      openPostfach,
      patchSession,
      players,
      screen,
      session,
      setCareerMatchSetup,
      setCareerMatchUiVisible,
      setForeignPlayerId,
      setPostfachItemId,
      setProfileFeedback,
      setProfileId,
      setScreen,
      setTrainingAutoNext,
      simulating,
      simulateWeek,
      trainingAutoNext,
      youthInbox,
    ],
  );

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  return {
    handleNext,
    handleNextRef,
    handleFastForwardToMonth,
    finishWeekSimulation,
    simulateWeek,
  };
}
