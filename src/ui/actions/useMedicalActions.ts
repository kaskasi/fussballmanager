import { useCallback } from "react";
import { t } from "../../i18n/index.ts";
import {
  applyPendingRowToPlayer,
  applyRehabMinigameBonus,
  extendInjuryWeeks,
  reduceInjuryWeeks,
} from "../../medical/diagnosis-queue.ts";
import {
  completeDoctorExam,
  completeInHouseSurgery,
  ensurePhysioWeek,
  markPhysioManualDone,
} from "../../medical/injury-care.ts";
import {
  clearOrthopedistHireAfterPick,
  orthopedistFromCandidate,
  type OrthopedistCandidate,
} from "../../medical/orthopedist-hire.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { ClubEventKind } from "../../inbox/club-events.ts";
import { precinctMedicalCenterLevel } from "../../stadium/precinct-effects.ts";
import {
  hireMedicalDoctor,
  hireMedicalOrthopedist,
  hireMedicalPhysio,
  medicalModifiers,
  normalizeMedicalStaff,
  type MedicalMember,
} from "../../staff/medical-staff.ts";
type PatchSession = (updater: (current: GameSession) => GameSession) => void;
type SessionWithEvent = (
  current: GameSession,
  kind: ClubEventKind,
  message: string,
) => GameSession;

export function useMedicalActions(args: {
  patchSession: PatchSession;
  sessionWithEvent: SessionWithEvent;
  flashNotice: (message: string, tone?: "ok" | "warn") => void;
}) {
  const { patchSession, sessionWithEvent, flashNotice } = args;

  const handleHireMedicalDoctor = useCallback(
    (member: MedicalMember) => {
      patchSession((current) => {
        if (current.finances.cash < member.wage_weekly * 4) {
          return sessionWithEvent(current, "finance", t("medical.event.insufficientCash"));
        }
        if (current.medicalStaff.doctor) {
          return sessionWithEvent(current, "info", t("medical.event.doctorSlotFull"));
        }
        return {
          ...current,
          medicalStaff: hireMedicalDoctor(current.medicalStaff, member),
        };
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleHireMedicalPhysio = useCallback(
    (member: MedicalMember) => {
      patchSession((current) => {
        if (current.finances.cash < member.wage_weekly * 4) {
          return sessionWithEvent(current, "finance", t("medical.event.insufficientCash"));
        }
        return {
          ...current,
          medicalStaff: hireMedicalPhysio(current.medicalStaff, member),
        };
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleHireOrthopedist = useCallback(
    (candidate: OrthopedistCandidate) => {
      patchSession((current) => {
        const member = orthopedistFromCandidate(candidate, current.season);
        return {
          ...current,
          medicalStaff: hireMedicalOrthopedist(current.medicalStaff, member),
          orthopedistHire: clearOrthopedistHireAfterPick(),
        };
      });
      flashNotice(t("medical.event.orthoHired", { name: candidate.name }), "ok");
    },
    [flashNotice, patchSession],
  );

  const handleDoctorExamComplete = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const row = current.medicalState.pending_diagnoses.find(
          (entry) => entry.player_id === playerId,
        );
        if (!row) return current;
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const mods = medicalModifiers(normalizeMedicalStaff(current.medicalStaff), level, 1);
        const exam = completeDoctorExam(
          current.medicalState,
          row,
          level,
          current.medicalStaff,
          current.masterSeed,
        );
        let next: typeof current = { ...current, medicalState: exam.state };
        if (exam.nextPhase === "rehab") {
          next = {
            ...next,
            players: applyPendingRowToPlayer(next.players, row, mods.recoveryMultiplier, false),
          };
        }
        return next;
      });
    },
    [patchSession],
  );

  const handleSurgery = useCallback(
    (playerId: string) => {
      patchSession((current) => {
        const row = current.medicalState.pending_diagnoses.find(
          (entry) => entry.player_id === playerId && entry.phase === "awaiting_surgery",
        );
        if (!row) return current;
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const mods = medicalModifiers(normalizeMedicalStaff(current.medicalStaff), level, 1);
        return {
          ...current,
          medicalState: completeInHouseSurgery(current.medicalState, row),
          players: applyPendingRowToPlayer(current.players, row, mods.recoveryMultiplier, true),
        };
      });
      flashNotice(t("medical.event.surgeryDone"), "ok");
    },
    [flashNotice, patchSession],
  );

  const handlePhysioManual = useCallback(
    (playerId: string, success: boolean) => {
      patchSession((current) => {
        const level = precinctMedicalCenterLevel(current.stadium.precinct);
        const medicalState = markPhysioManualDone(
          ensurePhysioWeek(
            current.medicalState,
            current.players,
            current.season,
            current.week,
            level,
          ),
          playerId,
          success,
        );
        return {
          ...current,
          medicalState,
          players: current.players.map((player) => {
            if (player.id !== playerId) return player;
            return success ? reduceInjuryWeeks(player, 0.2) : extendInjuryWeeks(player, 1);
          }),
        };
      });
      flashNotice(
        t(success ? "medical.physio.manualDone" : "medical.physio.manualFail"),
        success ? "ok" : "warn",
      );
    },
    [flashNotice, patchSession],
  );

  const handleRehabMinigameComplete = useCallback(
    (playerId: string, success: boolean) => {
      patchSession((current) => {
        const applied = applyRehabMinigameBonus(
          current.medicalState,
          current.players,
          current.season,
          current.week,
          playerId,
          success,
        );
        return {
          ...current,
          medicalState: applied.medicalState,
          players: applied.players,
        };
      });
      flashNotice(
        success ? t("medical.rehab.success") : t("medical.rehab.fail"),
        success ? "ok" : "warn",
      );
    },
    [flashNotice, patchSession],
  );

  return {
    handleHireMedicalDoctor,
    handleHireMedicalPhysio,
    handleHireOrthopedist,
    handleDoctorExamComplete,
    handleSurgery,
    handlePhysioManual,
    handleRehabMinigameComplete,
  };
}

export type MedicalActionHandlers = ReturnType<typeof useMedicalActions>;
