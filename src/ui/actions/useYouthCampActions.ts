import { useCallback, type MutableRefObject } from "react";
import { withClubEvent } from "../../inbox/club-events.ts";
import { spendClubCash } from "../../economy/club-finances.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import {
  buyYouthCamp,
  campNationById,
  canBuyYouthCamp,
  isCampUnderConstruction,
  pullCampPlayerToHq,
  type YouthCamp,
} from "../../youth/satellite-camps.ts";
import { CAMP_BUILD_WEEKS, constructionCapReason } from "../../sim/advance-construction.ts";
import {
  CAMP_LEADER_AGENCY_NOTICE,
  commissionCampLeaderAgency,
  dismissCampLeader,
  hireCampLeader,
  type CampLeaderCandidate,
} from "../../youth/camp-leader-hire.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;

type RequestClubSpend = (
  cost: number,
  title: string,
  apply: (current: GameSession) => GameSession,
  options?: { infrastructure?: boolean },
) => void;

export function useYouthCampActions(args: {
  youthCamps: YouthCamp[];
  finances: ClubFinances;
  campLeaderDismissCampId: string | null;
  setCampLeaderDismissCampId: (id: string | null) => void;
  patchSession: PatchSession;
  requestClubSpend: RequestClubSpend;
  flashNotice: (message: string, tone?: "ok" | "warn") => void;
  campDebutAfterSpendRef: MutableRefObject<{ campId: string; playerId: string } | null>;
}) {
  const {
    youthCamps,
    finances,
    campLeaderDismissCampId,
    setCampLeaderDismissCampId,
    patchSession,
    requestClubSpend,
    flashNotice,
    campDebutAfterSpendRef,
  } = args;

  const handleBuyYouthCamp = useCallback(
    (nationId: string) => {
      const check = canBuyYouthCamp(youthCamps, nationId, finances.cash);
      if (!check.ok) return;
      const nation = campNationById(nationId);
      requestClubSpend(
        check.cost,
        nation ? `${nation.flag} Camp ${nation.label}` : "Jugend-Camp",
        (current) => {
          const next = canBuyYouthCamp(current.youthCamps, nationId, current.finances.cash);
          if (!next.ok) return current;
          if (
            constructionCapReason({
              precinct: current.stadium.precinct,
              stadium: current.stadium,
              camps: current.youthCamps,
              academyProject: current.academyProject,
              season: current.season,
              week: current.week,
            })
          ) {
            return current;
          }
          const youthCampsNext = buyYouthCamp(
            current.youthCamps,
            nationId,
            current.season,
            current.week,
            CAMP_BUILD_WEEKS,
          );
          const clubEvents = nation
            ? withClubEvent(
                current.clubEvents,
                current.season,
                current.week,
                "info",
                `Camp ${nation.label} wird gebaut — fertig in ${CAMP_BUILD_WEEKS} Wochen.`,
              )
            : current.clubEvents;
          return {
            ...current,
            youthCamps: youthCampsNext,
            clubEvents,
            finances: spendClubCash(current.finances, next.cost, current.week),
          };
        },
      );
    },
    [campDebutAfterSpendRef, finances.cash, requestClubSpend, youthCamps],
  );

  const handleCommissionCampLeader = useCallback(
    (nationId: string) => {
      const owned = youthCamps.find((camp) => camp.id === nationId);
      if (!owned || isCampUnderConstruction(owned) || owned.leader_hire === "hired" || owned.leader_hire === "candidates_ready") {
        return;
      }
      if (owned.leader_hire === "agency_pending") {
        flashNotice(CAMP_LEADER_AGENCY_NOTICE, "ok");
        return;
      }
      patchSession((current) => ({
        ...current,
        youthCamps: commissionCampLeaderAgency(current.youthCamps, nationId, {
          season: current.season,
          week: current.week,
          weekday: current.weekday,
        }),
      }));
      flashNotice(CAMP_LEADER_AGENCY_NOTICE, "ok");
    },
    [flashNotice, patchSession, youthCamps],
  );

  const handleRequestDismissCampLeader = useCallback(
    (nationId: string) => {
      setCampLeaderDismissCampId(nationId);
    },
    [setCampLeaderDismissCampId],
  );

  const handleConfirmDismissCampLeader = useCallback(() => {
    if (!campLeaderDismissCampId) return;
    const nationId = campLeaderDismissCampId;
    setCampLeaderDismissCampId(null);
    patchSession((current) => ({
      ...current,
      youthCamps: dismissCampLeader(current.youthCamps, nationId),
    }));
  }, [campLeaderDismissCampId, patchSession, setCampLeaderDismissCampId]);

  const handleHireCampLeader = useCallback(
    (campId: string, candidate: CampLeaderCandidate) => {
      patchSession((current) => ({
        ...current,
        youthCamps: hireCampLeader(current.youthCamps, campId, candidate),
      }));
    },
    [patchSession],
  );

  const handlePullCampPlayer = useCallback(
    (playerId: string) => {
      patchSession((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === playerId ? pullCampPlayerToHq(player) : player,
        ),
      }));
    },
    [patchSession],
  );

  return {
    handleBuyYouthCamp,
    handleCommissionCampLeader,
    handleRequestDismissCampLeader,
    handleConfirmDismissCampLeader,
    handleHireCampLeader,
    handlePullCampPlayer,
  };
}

export type YouthCampActionHandlers = ReturnType<typeof useYouthCampActions>;
