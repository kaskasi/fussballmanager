import { useCallback, type MutableRefObject } from "react";
import { t } from "../../i18n/index.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import { createScoutAssignment } from "../../scouting/scout-assignments.ts";
import {
  addScoutAssignment,
  activeScoutCount,
  assignScout,
  getBoardTarget,
  toggleScoutAssignment,
  listBoardTargets,
} from "../../scouting/scout-board.ts";
import {
  requestScoutWorkCancel,
  type ScoutWorkCancelTarget,
} from "../../scouting/scout-work-cancel.ts";
import {
  addPlayersToPool,
  canStartRegionScout,
  ensureTargetsForPool,
  isInScoutPool,
  normalizeDiscovery,
  startRegionScoutJob,
} from "../../scouting/scout-discovery.ts";
import {
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
} from "../../scouting/scout-network.ts";
import { isPlayerListed } from "../../transfers/transfer-listings.ts";
import { applyTransferListScoutOnAssign, mergeListedEstimate } from "../../transfers/transfer-list-scout.ts";
import { buildZoneMapNodes, layoutForZone } from "../../scouting/scout-map-layout.ts";
import { buildScoutDiscoveryMapModel } from "../../scouting/scout-region-map.ts";
import {
  canEnqueueScoutTrip,
  dispatchQueuedScoutTrips,
  enqueueScoutTrip,
} from "../../scouting/scout-trip-queue.ts";
import type { ScoutRouteScore } from "../../scouting/scout-route-puzzle.ts";
import {
  consumeScoutJobNotice,
  scoutJobNoticeById,
} from "../../scouting/scout-job-postfach.ts";
import { scoutJobDismissOneLiner } from "../../inbox/postfach-archive.ts";
import {
  fireScout,
  canHireScout,
  hireScout,
  type HiredScout,
} from "../../scouting/scout-network.ts";
import { prepareUpcomingCareerMatch } from "../../sim/career-match-setup.ts";
import { startOpponentScoutJob } from "../../scouting/opponent-scout-job.ts";
import { applyScoutPlanToMatchLineup } from "../../match/lineup-board.ts";
import { careerTeamId } from "../../sim/rival-growth.ts";
import type { SandboxPlan } from "@fussballmanager/shared";
import { worldCareerClubId } from "../../world/world-generator.ts";
import type { ClubEventKind } from "../../inbox/club-events.ts";
import type { MarketFilters } from "../../scouting/market-list.ts";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import { trackEvent } from "../../telemetry/analytics.ts";
import { DEFAULT_DIVISION_ID } from "../../sim/league-pyramid.ts";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;
type SessionWithEvent = (
  current: GameSession,
  kind: ClubEventKind,
  message: string,
) => GameSession;

export function useScoutingActions(args: {
  session: GameSession;
  patchSession: PatchSession;
  sessionWithEvent: SessionWithEvent;
  marketFilters: MarketFilters;
  flashNotice: (message: string, tone?: "ok" | "warn") => void;
  careerMatchSetup: CareerMatchSetup | null;
  careerMatchUiVisible: boolean;
  setCareerMatchUiVisible: (visible: boolean) => void;
  /** Opponent analysis reports live on the Tactics screen, not in the inbox. */
  openTactics: () => void;
  scoutMapDetailBackRef: MutableRefObject<(() => void) | null>;
  setScoutMapDetailNav: (
    value: { onBack: () => void; title: string } | null,
  ) => void;
}) {
  const {
    session,
    patchSession,
    sessionWithEvent,
    marketFilters,
    flashNotice,
    careerMatchSetup,
    careerMatchUiVisible,
    setCareerMatchUiVisible,
    openTactics,
    scoutMapDetailBackRef,
    setScoutMapDetailNav,
  } = args;

  const handleDismissScoutJob = useCallback(
    (itemId: string) => {
      patchSession((current) => {
        const notice = scoutJobNoticeById(current.scoutBoard, itemId);
        const next = {
          ...current,
          scoutBoard: consumeScoutJobNotice(current.scoutBoard, itemId),
        };
        const message = notice
          ? scoutJobDismissOneLiner(notice)
          : "Scout-Bericht geschlossen";
        return sessionWithEvent(next, "info", message);
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleStartOpponentScout = useCallback(() => {
    const setup = prepareUpcomingCareerMatch(session);
    if (!setup) {
      flashNotice(t("scouting.opponent.notMatchWeek"));
      return;
    }
    const { board, reason } = startOpponentScoutJob(
      session.scoutBoard,
      session.scoutNetwork,
      setup,
      session.season,
      session.week,
    );
    if (reason !== "ok") {
      const message =
        reason === "no_scout"
          ? t("scouting.opponent.noScout")
          : reason === "job_active"
            ? t("scouting.opponent.jobElsewhere")
            : t("scouting.opponent.notMatchWeek");
      flashNotice(message);
      return;
    }
    patchSession((current) => ({ ...current, scoutBoard: board }));
    flashNotice(t("scouting.opponent.started"), "ok");
  }, [flashNotice, patchSession, session]);

  const handleOpenOpponentScoutReport = useCallback(
    (_itemId: string) => {
      if (careerMatchSetup && careerMatchUiVisible) {
        setCareerMatchUiVisible(false);
      }
      openTactics();
    },
    [careerMatchSetup, careerMatchUiVisible, openTactics, setCareerMatchUiVisible],
  );

  const handleApplyOpponentScoutPlan = useCallback(
    (plan: SandboxPlan) => {
      const managerClubId = careerTeamId(session.league.player_club_id);
      patchSession((current) => ({
        ...current,
        matchLineup: applyScoutPlanToMatchLineup(
          current.matchLineup,
          plan,
          current.players,
          managerClubId,
          current.league.player_club_id,
        ),
      }));
      flashNotice(t("postfach.opponentScout.applied"), "ok");
    },
    [flashNotice, patchSession, session.league.player_club_id],
  );

  const handleAssignScout = useCallback(
    (playerId: string) => {
      let queued = false;
      let atCapacity = false;
      patchSession((current) => {
        const player = current.rivalPlayers.find((entry) => entry.id === playerId);
        if (!player) return current;

        let scoutBoard = current.scoutBoard;
        const discovery = normalizeDiscovery(scoutBoard.discovery);
        const nextDiscovery = isInScoutPool(discovery, playerId)
          ? discovery
          : addPlayersToPool(discovery, [playerId]);
        let targets = ensureTargetsForPool(scoutBoard.targets, nextDiscovery, current.rivalPlayers);
        if (isPlayerListed(current.transferState, playerId)) {
          const row = targets[playerId];
          if (row) {
            targets = {
              ...targets,
              [playerId]: { ...row, estimate: mergeListedEstimate(row.estimate, player) },
            };
          }
        }
        scoutBoard = { ...scoutBoard, discovery: nextDiscovery, targets };

        const existing = getBoardTarget(scoutBoard, playerId, current.rivalPlayers);
        if (existing?.assigned) return { ...current, scoutBoard };

        const capacity = scoutNetworkCapacity(current.scoutNetwork);
        if (activeScoutCount(scoutBoard) >= capacity) {
          atCapacity = true;
          return { ...current, scoutBoard };
        }

        const wasAssigned = Boolean(existing?.assigned);
        let nextBoard = assignScout(scoutBoard, playerId, current.scoutNetwork, capacity);
        const nowAssigned = Boolean(
          getBoardTarget(nextBoard, playerId, current.rivalPlayers)?.assigned,
        );
        queued = !wasAssigned && nowAssigned;
        if (queued) {
          nextBoard = applyTransferListScoutOnAssign(
            nextBoard,
            playerId,
            player,
            current.transferState,
            scoutNetworkAccuracyModifier(current.scoutNetwork),
          );
        }
        return { ...current, scoutBoard: nextBoard };
      });
      if (atCapacity) {
        flashNotice(t("scouting.hits.scoutCapacity"), "warn");
        return;
      }
      if (queued) {
        trackEvent("scout_assigned");
        flashNotice(t("scouting.hits.scoutQueued"), "ok");
      }
    },
    [flashNotice, patchSession],
  );

  const handleEnqueueScoutTrip = useCallback(
    (
      zoneId: string,
      input: {
        pathNodeIds: string[];
        targetClubId: string;
        score: ScoutRouteScore;
      },
    ) => {
      patchSession((current) => {
        const club = current.world.clubs.find(
          (entry) => worldCareerClubId(entry.id) === input.targetClubId,
        );
        if (!club) return current;
        const division =
          current.world.clubs.find((entry) => worldCareerClubId(entry.id) === current.clubId)
            ?.division_id ?? DEFAULT_DIVISION_ID;
        const discovery = normalizeDiscovery(current.scoutBoard.discovery);
        if (!canEnqueueScoutTrip(club, division, discovery, current.world.clubs)) {
          return current;
        }
        const layout = layoutForZone(zoneId);
        if (!layout) return current;
        const zoneModel = buildScoutDiscoveryMapModel({
          clubs: current.world.clubs,
          targets: listBoardTargets(current.scoutBoard, current.rivalPlayers, current.world.clubs),
          rivalPlayers: current.rivalPlayers,
          discovery,
          playerDivisionId: division,
          activeClubScout: current.scoutBoard.active_scout_trip
            ? { club_id: current.scoutBoard.active_scout_trip.target_club_id, progress: 0 }
            : current.scoutBoard.active_club_scout,
        }).zones.find((zone) => zone.id === zoneId);
        if (!zoneModel) return current;
        const mapNodes = buildZoneMapNodes(layout, zoneModel.clubs, input.targetClubId);
        return {
          ...current,
          scoutBoard: enqueueScoutTrip(current.scoutBoard, {
            zoneId,
            pathNodeIds: input.pathNodeIds,
            mapNodes,
            targetClubId: input.targetClubId,
            routeScore: input.score,
            week: current.week,
            scouts: current.scoutNetwork,
          }),
        };
      });
    },
    [patchSession],
  );

  const handleScoutMapDetailChange = useCallback(
    (open: boolean, onBack: () => void, title?: string) => {
      scoutMapDetailBackRef.current = open ? onBack : null;
      setScoutMapDetailNav(
        open
          ? {
              onBack: () => scoutMapDetailBackRef.current?.(),
              title: title ?? "",
            }
          : null,
      );
    },
    [scoutMapDetailBackRef, setScoutMapDetailNav],
  );

  const handleScoutRegion = useCallback(
    (zoneId: string) => {
      patchSession((current) => {
        const discovery = normalizeDiscovery(current.scoutBoard.discovery);
        if (!canStartRegionScout(zoneId, discovery, current.scoutBoard.active_region_scout)) {
          return current;
        }
        return {
          ...current,
          scoutBoard: startRegionScoutJob(current.scoutBoard, zoneId),
        };
      });
      trackEvent("scout_region_started", { zone: zoneId });
    },
    [patchSession],
  );

  const handleHireScout = useCallback(
    (scout: HiredScout) => {
      patchSession((current) => {
        if (current.scoutNetwork.scouts.some((existing) => existing.id === scout.id)) {
          return current;
        }
        if (!canHireScout(current.scoutNetwork)) {
          return sessionWithEvent(current, "info", t("scouting.network.rosterFull"));
        }
        if (current.finances.cash < scout.wage_weekly * 4) {
          return sessionWithEvent(
            current,
            "finance",
            t("clubEvent.scoutHireInsufficientCash", { name: scout.name }),
          );
        }
        const scoutNetwork = hireScout(current.scoutNetwork, scout);
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork,
            scoutBoard: dispatchQueuedScoutTrips(current.scoutBoard, scoutNetwork),
          },
          "info",
          t("clubEvent.scoutHired", { name: scout.name }),
        );
      });
      trackEvent("scout_hired");
    },
    [patchSession, sessionWithEvent],
  );

  const handleFireScout = useCallback(
    (scoutId: string) => {
      patchSession((current) => {
        const scout = current.scoutNetwork.scouts.find((entry) => entry.id === scoutId);
        if (!scout) return current;
        if (current.scoutNetwork.scouts.length <= 1) {
          return sessionWithEvent(current, "info", t("clubEvent.scoutNetworkMinimum"));
        }
        return sessionWithEvent(
          {
            ...current,
            scoutNetwork: fireScout(current.scoutNetwork, scoutId),
          },
          "info",
          t("clubEvent.scoutFired", { name: scout.name }),
        );
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleAddScoutAssignment = useCallback(() => {
    patchSession((current) => {
      const assignment = createScoutAssignment(
        `assign_${current.week}_${(current.scoutBoard.assignments ?? []).length + 1}`,
        {
          position: marketFilters.position,
          age: marketFilters.age,
          query: marketFilters.query,
          confidence: marketFilters.confidence,
        },
        undefined,
        { kind: "filter_sweep", weeksRemaining: 1 },
      );
      return {
        ...current,
        scoutBoard: addScoutAssignment(current.scoutBoard, assignment),
      };
    });
  }, [marketFilters, patchSession]);

  const handleCancelScoutWork = useCallback(
    (target: ScoutWorkCancelTarget) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: requestScoutWorkCancel(current.scoutBoard, target, {
          season: current.season,
          week: current.week,
          weekday: current.weekday,
        }),
      }));
    },
    [patchSession],
  );

  const handleToggleScoutAssignment = useCallback(
    (assignmentId: string) => {
      patchSession((current) => ({
        ...current,
        scoutBoard: toggleScoutAssignment(current.scoutBoard, assignmentId),
      }));
    },
    [patchSession],
  );

  return {
    handleDismissScoutJob,
    handleStartOpponentScout,
    handleOpenOpponentScoutReport,
    handleApplyOpponentScoutPlan,
    handleAssignScout,
    handleEnqueueScoutTrip,
    handleScoutMapDetailChange,
    handleScoutRegion,
    handleHireScout,
    handleFireScout,
    handleAddScoutAssignment,
    handleCancelScoutWork,
    handleToggleScoutAssignment,
  };
}

export type ScoutingActionHandlers = ReturnType<typeof useScoutingActions>;
