import { ACHIEVEMENT, grantAchievement } from "../player/achievements.ts";
import type { Player } from "../types/player.ts";
import { canPromotePlayer } from "./promotion-gate.ts";

export const PRO_TRIAL_WEEKS = 1;

export function isOnProTrial(player: Player, season: number, week: number): boolean {
  const trial = player.state.pro_trial;
  if (!trial || trial.season !== season) return false;
  return week >= trial.started_week && week <= trial.ends_week;
}

export function hasActiveProTrial(player: Player): boolean {
  return player.state.pro_trial != null;
}

export function startProTrial(player: Player, season: number, week: number): Player {
  const endsWeek = week + PRO_TRIAL_WEEKS;
  return grantAchievement(
    {
      ...player,
      state: {
        ...player.state,
        morale: Math.min(100, player.state.morale + 6),
        pro_trial: {
          season,
          started_week: week,
          ends_week: endsWeek,
        },
        modifiers: [
          ...player.state.modifiers.filter((mod) => !mod.source_event_id.startsWith("pro_trial_")),
          {
            source_event_id: `pro_trial_${week}`,
            fitness_regen_multiplier: 1.05,
            until_week: endsWeek,
          },
        ],
      },
    },
    ACHIEVEMENT.proTrialWeek,
  );
}

function clearProTrial(player: Player): Player {
  return {
    ...player,
    state: {
      ...player.state,
      pro_trial: undefined,
      modifiers: player.state.modifiers.filter((mod) => !mod.source_event_id.startsWith("pro_trial_")),
    },
  };
}

export interface ProTrialAdvanceResult {
  players: Player[];
  promotedIds: string[];
  failedIds: string[];
}

/** End trials that finish this week — promote if gate allows, else morale hit. */
export function advanceProTrials(
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
): ProTrialAdvanceResult {
  const promotedIds: string[] = [];
  const failedIds: string[] = [];

  const nextPlayers = players.map((player) => {
    const trial = player.state.pro_trial;
    if (!trial || trial.season !== season || week !== trial.ends_week) {
      return player;
    }

    const cleared = clearProTrial(player);
    if (canPromotePlayer(players, clubId, player).allowed) {
      promotedIds.push(player.id);
      return grantAchievement({ ...cleared, squad_status: "pro" }, ACHIEVEMENT.promotedPro);
    }

    failedIds.push(player.id);
    return {
      ...cleared,
      state: {
        ...cleared.state,
        morale: Math.max(0, cleared.state.morale - 10),
      },
    };
  });

  return { players: nextPlayers, promotedIds, failedIds };
}

export function proTrialLabel(player: Player, season: number, week: number): string | null {
  const trial = player.state.pro_trial;
  if (!trial || trial.season !== season) return null;
  if (week > trial.ends_week) return null;
  const remaining = trial.ends_week - week + 1;
  if (remaining <= 0) return null;
  return remaining === 1
    ? "Probewoche im Profiteam"
    : `Probewoche · noch ${remaining} Woche(n)`;
}
