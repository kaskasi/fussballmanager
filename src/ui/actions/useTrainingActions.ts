import { individualTrainingSlots } from "../../development/individual-training-capacity.ts";
import { useCallback } from "react";
import { assignMentor, clearMentor } from "../../development/mentoring.ts";
import { mentoringSlots } from "../../development/mentoring-capacity.ts";
import type { TrainingPlanPresetSlot } from "../../development/training-plan-presets.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { assignIndividualProgram } from "../../development/individual-training.ts";
import type { IndividualProgram } from "../../development/individual-training.ts";
import {
  COACH_ROLE_LABELS,
  hireCoach,
  type Coach,
} from "../../staff/coaching-staff.ts";
import {
  normalizeAssistantDelegation,
  type AssistantDelegationTask,
} from "../../staff/assistant-delegation.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { ClubEventKind } from "../../inbox/club-events.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { t } from "../../i18n/index.ts";

type PatchSession = (updater: (current: GameSession) => GameSession) => void;
type SessionWithEvent = (
  current: GameSession,
  kind: ClubEventKind,
  message: string,
) => GameSession;

export function useTrainingActions(args: {
  patchSession: PatchSession;
  sessionWithEvent: SessionWithEvent;
}) {
  const { patchSession, sessionWithEvent } = args;

  const handleTrainingPlanChange = useCallback(
    (plan: TrainingSlot[]) => {
      patchSession((current) => ({ ...current, trainingPlan: plan }));
    },
    [patchSession],
  );

  const handleTrainingPlanPresetsChange = useCallback(
    (presets: TrainingPlanPresetSlot[]) => {
      patchSession((current) => ({ ...current, trainingPlanPresets: presets }));
    },
    [patchSession],
  );

  const handleTrainingIntensityChange = useCallback(
    (intensity: number) => {
      patchSession((current) => ({ ...current, trainingIntensity: intensity }));
    },
    [patchSession],
  );

  const handleIndividualProgramsChange = useCallback(
    (programs: IndividualProgram[]) => {
      patchSession((current) => ({ ...current, individualPrograms: programs }));
    },
    [patchSession],
  );

  const handleAssistantDelegationChange = useCallback(
    (task: AssistantDelegationTask, enabled: boolean) => {
      patchSession((current) => ({
        ...current,
        assistantDelegation: normalizeAssistantDelegation({
          ...current.assistantDelegation,
          [task]: enabled,
        }),
      }));
    },
    [patchSession],
  );

  const handleHireCoach = useCallback(
    (coach: Coach) => {
      patchSession((current) => {
        if (current.finances.cash < coach.wage_weekly * 2) {
          return sessionWithEvent(
            current,
            "finance",
            t("clubEvent.coachInsufficientCash", {
              name: coach.name,
              amount: formatClubCash(coach.wage_weekly * 2),
            }),
          );
        }
        const currentCoach = current.coachingStaff[coach.role];
        if (currentCoach && coach.quality <= currentCoach.quality) {
          return sessionWithEvent(current, "info", t("clubEvent.coachNotBetter"));
        }
        return sessionWithEvent(
          {
            ...current,
            coachingStaff: hireCoach(current.coachingStaff, coach),
          },
          "info",
          t("clubEvent.coachHired", {
            role: COACH_ROLE_LABELS[coach.role],
            name: coach.name,
            quality: coach.quality,
          }),
        );
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleAssignMentor = useCallback(
    (menteeId: string, mentorId: string) => {
      patchSession((current) => {
        const mentee = current.players.find((player) => player.id === menteeId);
        const mentor = current.players.find((player) => player.id === mentorId);
        if (!mentee || !mentor) return current;
        const result = assignMentor(mentee, mentor, current.season, current.week, {
          players: current.players,
          maxSlots: mentoringSlots(current.stadium.precinct).total,
        });
        if ("error" in result) {
          return sessionWithEvent(current, "info", result.error);
        }
        return sessionWithEvent(
          {
            ...current,
            players: current.players.map((player) =>
              player.id === menteeId ? result.player : player,
            ),
          },
          "profile",
          result.message,
        );
      });
    },
    [patchSession, sessionWithEvent],
  );

  const handleClearMentor = useCallback(
    (menteeId: string) => {
      patchSession((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === menteeId ? clearMentor(player) : player,
        ),
      }));
    },
    [patchSession],
  );

  const handleStartStampProgram = useCallback(
    (playerId: string, stampId: string) => {
      patchSession((current) => {
        const player = current.players.find((entry) => entry.id === playerId);
        if (!player) return current;
        try {
          return {
            ...current,
            individualPrograms: assignIndividualProgram(
              current.individualPrograms,
              player,
              "stamp",
              8,
              current.season,
              current.week,
              undefined,
              stampId,
              undefined,
              individualTrainingSlots(current.stadium.precinct, current.coachingStaff).total,
            ),
          };
        } catch {
          return current;
        }
      });
    },
    [patchSession],
  );

  return {
    handleTrainingPlanChange,
    handleTrainingPlanPresetsChange,
    handleTrainingIntensityChange,
    handleIndividualProgramsChange,
    handleAssistantDelegationChange,
    handleHireCoach,
    handleAssignMentor,
    handleClearMentor,
    handleStartStampProgram,
  };
}

export type TrainingActionHandlers = Omit<
  ReturnType<typeof useTrainingActions>,
  "handleStartStampProgram"
>;
