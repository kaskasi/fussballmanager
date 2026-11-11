import type { Player } from "../types/player.ts";

/** PRD 34 — `"league"` today; cup ids arrive with PRD 30 phase 5. */
export type CompetitionId = string;
export const LEAGUE_COMPETITION: CompetitionId = "league";

export const YELLOWS_PER_BAN = 5;
export const BAN_MATCHES = { yellows: 1, second_yellow: 1, red: 2 } as const;

export type BanReason = keyof typeof BAN_MATCHES;

export interface CompetitionDiscipline {
  /** Yellows that count towards the next ban; back to zero at season end. */
  yellows: number;
  /** Matches of this competition the player still has to sit out. */
  ban_matches: number;
  reason?: BanReason;
}

/** One player's cards from a single match. */
export interface MatchCards {
  yellowCards: number;
  redCards?: number;
}

export interface MatchDisciplineOutcome {
  player: Player;
  /** Ban matches added by this match (0 = none). */
  banAdded: number;
  reason?: BanReason;
  /** True when this match took the player to one yellow short of a ban. */
  yellowWarning: boolean;
}

const CLEAN: CompetitionDiscipline = { yellows: 0, ban_matches: 0 };

/**
 * A one-match row is unambiguous: both yellows of a yellow-red are counted,
 * so two yellows plus a red is a second yellow and any other red is straight.
 */
export function sentOffReason(cards: MatchCards): "second_yellow" | "red" | null {
  if ((cards.redCards ?? 0) <= 0) return null;
  return cards.yellowCards >= 2 ? "second_yellow" : "red";
}

export function competitionDiscipline(
  player: Player,
  competition: CompetitionId = LEAGUE_COMPETITION,
): CompetitionDiscipline {
  return player.state.discipline?.[competition] ?? CLEAN;
}

export function isSuspended(
  player: Player,
  competition: CompetitionId = LEAGUE_COMPETITION,
): boolean {
  return competitionDiscipline(player, competition).ban_matches > 0;
}

/** One more yellow in this competition means a ban. */
export function isOneYellowFromBan(
  player: Player,
  competition: CompetitionId = LEAGUE_COMPETITION,
): boolean {
  return competitionDiscipline(player, competition).yellows % YELLOWS_PER_BAN === YELLOWS_PER_BAN - 1;
}

function withDiscipline(
  player: Player,
  competition: CompetitionId,
  entry: CompetitionDiscipline,
  redCards = 0,
): Player {
  return {
    ...player,
    state: {
      ...player.state,
      ...(redCards > 0
        ? { season_red_cards: (player.state.season_red_cards ?? 0) + redCards }
        : {}),
      discipline: { ...player.state.discipline, [competition]: entry },
    },
  };
}

/** Book one match's cards: tally yellows, add bans (PRD 34 §2). */
export function applyMatchCards(
  player: Player,
  cards: MatchCards,
  competition: CompetitionId = LEAGUE_COMPETITION,
): MatchDisciplineOutcome {
  const redCards = cards.redCards ?? 0;
  if (cards.yellowCards <= 0 && redCards <= 0) {
    return { player, banAdded: 0, yellowWarning: false };
  }

  const before = competitionDiscipline(player, competition);
  const sentOff = sentOffReason(cards);
  // The yellows of a yellow-red match do not count towards the tally.
  const counted = sentOff === "second_yellow" ? 0 : cards.yellowCards;
  const yellows = before.yellows + counted;
  const yellowBans =
    Math.floor(yellows / YELLOWS_PER_BAN) - Math.floor(before.yellows / YELLOWS_PER_BAN);

  const banAdded =
    (sentOff ? BAN_MATCHES[sentOff] : 0) + yellowBans * BAN_MATCHES.yellows;
  const reason: BanReason | undefined = sentOff ?? (yellowBans > 0 ? "yellows" : undefined);
  const ban_matches = before.ban_matches + banAdded;

  const entry: CompetitionDiscipline = {
    yellows,
    ban_matches,
    ...(ban_matches > 0 ? { reason: reason ?? before.reason } : {}),
  };
  const next = withDiscipline(player, competition, entry, redCards);
  return {
    player: next,
    banAdded,
    ...(banAdded > 0 && reason ? { reason } : {}),
    yellowWarning: counted > 0 && banAdded === 0 && isOneYellowFromBan(next, competition),
  };
}

/** The club played a match in this competition: one ban match is served. */
export function serveBanMatch(
  player: Player,
  competition: CompetitionId = LEAGUE_COMPETITION,
): Player {
  const entry = player.state.discipline?.[competition];
  if (!entry || entry.ban_matches <= 0) return player;
  const ban_matches = entry.ban_matches - 1;
  return withDiscipline(player, competition, {
    yellows: entry.yellows,
    ban_matches,
    ...(ban_matches > 0 && entry.reason ? { reason: entry.reason } : {}),
  });
}

/** Season end: tallies back to zero, open bans carry over. */
export function resetSeasonDiscipline(state: Player["state"]): Player["state"] {
  const { discipline, season_red_cards: _reds, ...rest } = state;
  if (!discipline) return rest;
  const open: Record<CompetitionId, CompetitionDiscipline> = {};
  for (const [competition, entry] of Object.entries(discipline)) {
    if (entry.ban_matches > 0) open[competition] = { ...entry, yellows: 0 };
  }
  return Object.keys(open).length > 0 ? { ...rest, discipline: open } : rest;
}
