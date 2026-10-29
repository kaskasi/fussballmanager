/**
 * F2.4 — Mentoring (Routinier → Talent).
 * A mentor needs a few pro seasons behind him. Each week the pairing lifts the talent's
 * morale and form and pulls his attributes towards the mentor's, but only where the
 * mentor is better. After ~6 months with a high-drive mentor it also feeds PRD 06.2
 * `mentor_ignition`. Pairs run in slots (`mentoring-capacity.ts`).
 */
import { BREAKOUT_SIGNAL } from "./breakouts.ts";
import { careerProYears } from "./experience.ts";
import type { Attributes, Player } from "../types/player.ts";
import type { MentorshipState } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";

export const MENTEE_MAX_AGE = 23;
/** "Einige Jahre": seasons with at least one pro appearance. */
export const MENTOR_MIN_PRO_YEARS = 5;
export const MENTOR_MIN_DRIVE = 1.3;
/** ~6 calendar months at one sim week per week. */
export const MENTORSHIP_WEEKS_FOR_SIGNAL = 26;

/** The mentor must lead by at least this much before an attribute counts as teachable. */
export const MENTOR_ATTRIBUTE_MIN_GAP = 3;
/** A gap this large or more teaches at full speed. */
const MENTOR_ATTRIBUTE_FULL_GAP = 15;
/** Attribute points per week a top mentor passes on, spread across all teachable attributes. */
export const MENTOR_WEEKLY_ATTRIBUTE_BUDGET = 0.25;
/** At most this many attributes are taught at once (the biggest gaps). */
const MENTOR_MAX_TAUGHT = 4;
export const MENTOR_WEEKLY_MORALE = 0.6;
/** Mentoring lifts morale up to here; above it the talent is already fine. */
export const MENTOR_MORALE_CEILING = 80;
export const MENTOR_WEEKLY_FORM = 0.08;
/** Form runs −4…4. A mentor steadies the talent up to a small positive value. */
export const MENTOR_FORM_CEILING = 1;

const TEACHABLE: readonly (keyof Attributes)[] = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "weak_foot",
  "gk_handling",
];

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
  if (player.state.mentorship) return false;
  return careerProYears(player) >= MENTOR_MIN_PRO_YEARS;
}

export function isMenteeCandidate(player: Player, clubId: string): boolean {
  return (
    player.club_id === clubId &&
    player.squad_status === "pro" &&
    player.age <= MENTEE_MAX_AGE
  );
}

/**
 * 0.4–1.0 — how well this mentor passes things on. Leadership carries most of it,
 * experience the rest. Scales every weekly effect.
 */
export function mentorQuality(mentor: Player): number {
  const leadership = Math.min(1, Math.max(0, (mentor.attributes.leadership - 40) / 50));
  const years = Math.min(1, careerProYears(mentor) / 12);
  return 0.4 + 0.6 * (0.75 * leadership + 0.25 * years);
}

export interface TaughtAttribute {
  attribute: keyof Attributes;
  gap: number;
}

/** Attributes the mentor is clearly better at, biggest gap first. Keepers only learn handling from keepers. */
export function teachableAttributes(mentee: Player, mentor: Player): TaughtAttribute[] {
  return TEACHABLE.filter(
    (key) => key !== "gk_handling" || (mentee.position === "GK" && mentor.position === "GK"),
  )
    .map((attribute) => ({ attribute, gap: mentor.attributes[attribute] - mentee.attributes[attribute] }))
    .filter((entry) => entry.gap >= MENTOR_ATTRIBUTE_MIN_GAP)
    .sort((left, right) => right.gap - left.gap)
    .slice(0, MENTOR_MAX_TAUGHT);
}

/** Who already mentors someone (mentor id → mentee id). */
function mentorLoad(players: readonly Player[]): Map<string, string> {
  const load = new Map<string, string>();
  for (const player of players) {
    const mentorId = player.state.mentorship?.mentor_player_id;
    if (mentorId) load.set(mentorId, player.id);
  }
  return load;
}

export function eligibleMentors(
  players: readonly Player[],
  mentee: Player,
  clubId: string,
): Player[] {
  const busy = mentorLoad(players);
  return players
    .filter((player) => {
      if (player.id === mentee.id || !isMentorCandidate(player, clubId)) return false;
      const mentoring = busy.get(player.id);
      return mentoring === undefined || mentoring === mentee.id;
    })
    .sort(
      (left, right) =>
        mentorQuality(right) - mentorQuality(left) ||
        right.hidden.drive - left.hidden.drive,
    );
}

export interface AssignMentorOptions {
  /** Squad, to check the mentor is free and a slot is open. */
  players?: readonly Player[];
  maxSlots?: number;
}

export function assignMentor(
  mentee: Player,
  mentor: Player,
  season: number,
  week: number,
  options: AssignMentorOptions = {},
): { player: Player; message: string } | { error: string } {
  if (!isMenteeCandidate(mentee, mentee.club_id ?? "")) {
    return { error: "Nur Profis bis 23 können ein Mentoring erhalten." };
  }
  if (!isMentorCandidate(mentor, mentor.club_id ?? "")) {
    return {
      error: `Ein Mentor braucht mindestens ${MENTOR_MIN_PRO_YEARS} Profi-Jahre und darf selbst keinen Mentor haben.`,
    };
  }
  if (mentee.club_id !== mentor.club_id) {
    return { error: "Mentor und Talent müssen im selben Verein sein." };
  }
  if (options.players) {
    const busyWith = mentorLoad(options.players).get(mentor.id);
    if (busyWith && busyWith !== mentee.id) {
      return { error: `${formatPlayerName(mentor)} betreut schon ein anderes Talent.` };
    }
    if (options.maxSlots !== undefined && !mentee.state.mentorship) {
      const used = options.players.filter(
        (player) => player.club_id === mentee.club_id && player.state.mentorship,
      ).length;
      if (used >= options.maxSlots) {
        return { error: "Alle Mentoring-Plätze sind belegt." };
      }
    }
  }

  const next: Player = {
    ...mentee,
    state: {
      ...mentee.state,
      mentorship: {
        mentor_player_id: mentor.id,
        since_season: season,
        since_week: week,
        gained: 0,
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

function attributeCap(key: keyof Attributes): number {
  return key === "weak_foot" ? 100 : 199;
}

/** One week of mentoring: morale, form and the mentor's stronger attributes. */
export function applyMentorshipWeek(mentee: Player, mentor: Player): Player {
  const quality = mentorQuality(mentor);
  const taught = teachableAttributes(mentee, mentor);
  const weightSum = taught.reduce(
    (sum, entry) => sum + Math.min(1, entry.gap / MENTOR_ATTRIBUTE_FULL_GAP),
    0,
  );

  const attributes = { ...mentee.attributes };
  let gained = 0;
  for (const entry of taught) {
    const weight = Math.min(1, entry.gap / MENTOR_ATTRIBUTE_FULL_GAP);
    const share = weightSum > 0 ? weight / Math.max(1, weightSum) : 0;
    const anlage = mentee.hidden.anlage?.[entry.attribute] ?? 1;
    const delta = MENTOR_WEEKLY_ATTRIBUTE_BUDGET * quality * share * anlage;
    // Never past the mentor: he can only pass on what he has.
    const ceiling = Math.min(attributeCap(entry.attribute), mentor.attributes[entry.attribute]);
    const nextValue = Math.min(ceiling, attributes[entry.attribute] + delta);
    gained += nextValue - attributes[entry.attribute];
    attributes[entry.attribute] = nextValue;
  }

  const morale =
    mentee.state.morale < MENTOR_MORALE_CEILING
      ? Math.min(MENTOR_MORALE_CEILING, mentee.state.morale + MENTOR_WEEKLY_MORALE * quality)
      : mentee.state.morale;
  const form =
    mentee.state.form < MENTOR_FORM_CEILING
      ? Math.min(MENTOR_FORM_CEILING, mentee.state.form + MENTOR_WEEKLY_FORM * quality)
      : mentee.state.form;
  const link = mentee.state.mentorship!;

  return {
    ...mentee,
    attributes,
    state: {
      ...mentee.state,
      morale,
      form,
      mentorship: { ...link, gained: (link.gained ?? 0) + gained },
    },
  };
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
    if (
      !mentor ||
      mentor.club_id !== player.club_id ||
      mentor.squad_status === "loaned_out" ||
      player.squad_status === "loaned_out"
    ) {
      return clearMentor(player);
    }

    const mentored = applyMentorshipWeek(player, mentor);
    const ready = mentorSignalActive(mentored, mentor, season, week);
    const hasSignal = mentored.state.modifiers.some(
      (modifier) => modifier.source_event_id === BREAKOUT_SIGNAL.mentorReady,
    );

    if (ready && !hasSignal) {
      return {
        ...mentored,
        state: {
          ...mentored.state,
          modifiers: [
            ...mentored.state.modifiers,
            { source_event_id: BREAKOUT_SIGNAL.mentorReady },
          ],
        },
      };
    }

    if (!ready && hasSignal) {
      return {
        ...mentored,
        state: {
          ...mentored.state,
          modifiers: mentored.state.modifiers.filter(
            (modifier) => modifier.source_event_id !== BREAKOUT_SIGNAL.mentorReady,
          ),
        },
      };
    }

    return mentored;
  });
}

export type MentorshipProgress =
  | { kind: "none" }
  | { kind: "unavailable" }
  | { kind: "active" }
  | { kind: "building"; weeks: number; target: number; drive: number };

/** Breakout-signal state for the UI; the Squad → Mentoring tab formats it per locale. */
export function mentorshipProgress(
  mentee: Player,
  mentor: Player | undefined,
  season: number,
  week: number,
): MentorshipProgress {
  const link = mentee.state.mentorship;
  if (!link) return { kind: "none" };
  if (!mentor) return { kind: "unavailable" };
  const weeks = mentorshipWeeks(link, season, week);
  const target = MENTORSHIP_WEEKS_FOR_SIGNAL;
  if (weeks >= target && mentor.hidden.drive >= MENTOR_MIN_DRIVE) {
    return { kind: "active" };
  }
  return { kind: "building", weeks, target, drive: mentor.hidden.drive };
}
