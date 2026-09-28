/**
 * F2.4 — Mentoring (Routinier → Talent). Drive breakout via PRD 06.2 `mentor_ignition`.
 */
import { BREAKOUT_SIGNAL } from "./breakouts.ts";
import type { Player } from "../types/player.ts";
import type { MentorshipState } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export const MENTEE_MAX_AGE = 23;
export const MENTOR_MIN_AGE = 28;
export const MENTOR_MIN_LEADERSHIP = 68;
export const MENTOR_MIN_DRIVE = 1.3;
/** ~6 calendar months at one sim week per week. */
export const MENTORSHIP_WEEKS_FOR_SIGNAL = 26;

export function mentorshipWeeks(
  mentorship: MentorshipState,
  season: number,
  week: number,
): number {
  const seasonOffset = Math.max(0, season - mentorship.since_season) * 52;
  const weekOffset = week >= mentorship.since_week
    ? week - mentorship.since_week
    : week + (52 - mentorship.since_week);
  return seasonOffset + weekOffset;
}

export function isMentorCandidate(player: Player, clubId: string): boolean {
  if (player.club_id !== clubId || player.squad_status !== "pro") return false;
  if (player.age < MENTOR_MIN_AGE && player.attributes.leadership < MENTOR_MIN_LEADERSHIP) {
    return false;
  }
  return true;
}

export function isMenteeCandidate(player: Player, clubId: string): boolean {
  return (
    player.club_id === clubId &&
    player.squad_status === "pro" &&
    player.age <= MENTEE_MAX_AGE
  );
}

export function eligibleMentors(
  players: readonly Player[],
  mentee: Player,
  clubId: string,
): Player[] {
  return players
    .filter(
      (player) =>
        player.id !== mentee.id &&
        isMentorCandidate(player, clubId) &&
        player.hidden.drive >= MENTOR_MIN_DRIVE - 0.05,
    )
    .sort(
      (left, right) =>
        right.attributes.leadership - left.attributes.leadership ||
        right.hidden.drive - left.hidden.drive,
    );
}

export function assignMentor(
  mentee: Player,
  mentor: Player,
  season: number,
  week: number,
): { player: Player; message: string } | { error: string } {
  if (!isMenteeCandidate(mentee, mentee.club_id ?? "")) {
    return { error: "Nur Profis bis 23 können ein Mentoring erhalten." };
  }
  if (!isMentorCandidate(mentor, mentor.club_id ?? "")) {
    return { error: "Der Mentor ist nicht geeignet (Alter, Führung oder Drive)." };
  }
  if (mentee.club_id !== mentor.club_id) {
    return { error: "Mentor und Talent müssen im selben Verein sein." };
  }

  const next: Player = {
    ...mentee,
    state: {
      ...mentee.state,
      mentorship: {
        mentor_player_id: mentor.id,
        since_season: season,
        since_week: week,
      },
      modifiers: mentee.state.modifiers.filter(
        (modifier) => modifier.source_event_id !== BREAKOUT_SIGNAL.mentorReady,
      ),
    },
  };

  return {
    player: next,
    message: `${formatPlayerName(mentee)} wird von ${formatPlayerName(mentor)} begleitet.`,
  };
}

export function clearMentor(mentee: Player): Player {
  const { mentorship: _removed, ...restState } = mentee.state;
  return {
    ...mentee,
    state: {
      ...restState,
      modifiers: mentee.state.modifiers.filter(
        (modifier) => modifier.source_event_id !== BREAKOUT_SIGNAL.mentorReady,
      ),
    },
  };
}

function mentorSignalActive(
  mentee: Player,
  mentor: Player | undefined,
  season: number,
  week: number,
): boolean {
  const link = mentee.state.mentorship;
  if (!link || !mentor) return false;
  if (mentor.club_id !== mentee.club_id) return false;
  if (mentor.hidden.drive < MENTOR_MIN_DRIVE) return false;
  return mentorshipWeeks(link, season, week) >= MENTORSHIP_WEEKS_FOR_SIGNAL;
}

export function advanceMentorshipWeek(
  players: readonly Player[],
  season: number,
  week: number,
): Player[] {
  const byId = new Map(players.map((player) => [player.id, player] as const));

  return players.map((player) => {
    const link = player.state.mentorship;
    if (!link) return player;

    const mentor = byId.get(link.mentor_player_id);
    if (!mentor || mentor.club_id !== player.club_id) {
      return clearMentor(player);
    }

    const ready = mentorSignalActive(player, mentor, season, week);
    const hasSignal = player.state.modifiers.some(
      (modifier) => modifier.source_event_id === BREAKOUT_SIGNAL.mentorReady,
    );

    if (ready && !hasSignal) {
      return {
        ...player,
        state: {
          ...player.state,
          modifiers: [
            ...player.state.modifiers,
            { source_event_id: BREAKOUT_SIGNAL.mentorReady },
          ],
        },
      };
    }

    if (!ready && hasSignal) {
      return {
        ...player,
        state: {
          ...player.state,
          modifiers: player.state.modifiers.filter(
            (modifier) => modifier.source_event_id !== BREAKOUT_SIGNAL.mentorReady,
          ),
        },
      };
    }

    return player;
  });
}

export function mentorshipProgressLabel(
  mentee: Player,
  mentor: Player | undefined,
  season: number,
  week: number,
): string {
  const link = mentee.state.mentorship;
  if (!link) return "Kein Mentor";
  if (!mentor) return "Mentor nicht verfügbar";
  const weeks = mentorshipWeeks(link, season, week);
  const target = MENTORSHIP_WEEKS_FOR_SIGNAL;
  if (weeks >= target && mentor.hidden.drive >= MENTOR_MIN_DRIVE) {
    return "✨ Mentor-Effekt aktiv";
  }
  return `${weeks}/${target} Wochen · Drive ${mentor.hidden.drive.toFixed(2)}`;
}
