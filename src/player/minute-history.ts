import type { Player } from "../types/player.ts";

/** PRD 03.5 — departure trigger window. */
export const MINUTE_WINDOW_WEEKS = 4;

export function normalizeMinuteState(state: Player["state"]): Player["state"] {
  return {
    ...state,
    recent_weekly_minutes: state.recent_weekly_minutes ?? [],
    recent_growth_26w: state.recent_growth_26w ?? 0,
  };
}

export function pushWeeklyMinutes(player: Player, minutes: number): Player {
  const state = normalizeMinuteState(player.state);
  const history = [...state.recent_weekly_minutes, minutes].slice(-MINUTE_WINDOW_WEEKS);
  return {
    ...player,
    state: {
      ...state,
      weekly_minutes: minutes,
      season_minutes: state.season_minutes + minutes,
      recent_weekly_minutes: history,
    },
  };
}

export function minutesLast4Weeks(player: Player): number {
  const state = normalizeMinuteState(player.state);
  return state.recent_weekly_minutes.reduce((sum, entry) => sum + entry, 0);
}

export function resetSeasonMinutes(player: Player): Player {
  const state = normalizeMinuteState(player.state);
  return {
    ...player,
    state: {
      ...state,
      weekly_minutes: 0,
      season_minutes: 0,
      season_apps: 0,
      season_goals: 0,
      season_assists: 0,
      season_yellow_cards: 0,
      season_tackles: 0,
      season_headers: 0,
      recent_weekly_minutes: [],
    },
  };
}
