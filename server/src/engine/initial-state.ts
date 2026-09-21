import {
  asMatchId,
  createRng,
  kickoffLineup,
  type MatchId,
  type MatchState,
  type Player,
  type PlayerMatchStatus,
  type Squad,
  type TeamId,
} from "@fussballmanager/shared";

function toStatus(
  player: Player,
  position: { x: number; y: number },
  onPitch: boolean,
  slot?: PlayerMatchStatus["slot"],
): PlayerMatchStatus {
  return {
    playerId: player.id,
    teamId: player.teamId,
    role: player.role,
    position,
    onPitch,
    attributes: player.attributes,
    fatigue: player.fatigue,
    form: player.form,
    yellowCards: 0,
    sentOff: false,
    ...(slot ? { slot } : {}),
  };
}

export function createInitialState(input: {
  home: Squad;
  away: Squad;
  seed: number;
  matchId?: MatchId;
  kickingTeamId?: TeamId;
  /** Player club; omit or null for AI vs AI. */
  humanTeamId?: TeamId | null;
}): MatchState {
  const homeLineup = kickoffLineup(input.home, "home");
  const awayLineup = kickoffLineup(input.away, "away");
  const kickingTeamId = input.kickingTeamId ?? input.home.team.id;

  const players: PlayerMatchStatus[] = [
    ...homeLineup.map((place) =>
      toStatus(place.player, place.position, true, place.slot),
    ),
    ...awayLineup.map((place) =>
      toStatus(place.player, place.position, true, place.slot),
    ),
    ...input.home.bench.map((player) =>
      toStatus(player, { x: 2, y: 2 }, false),
    ),
    ...input.away.bench.map((player) =>
      toStatus(player, { x: 98, y: 98 }, false),
    ),
  ];

  const kicker =
    players.find(
      (player) =>
        player.teamId === kickingTeamId &&
        player.onPitch &&
        player.role === "ST",
    ) ??
    players.find((player) => player.teamId === kickingTeamId && player.onPitch);

  if (!kicker) {
    throw new Error("No on-pitch player for kickoff");
  }

  return {
    matchId: input.matchId ?? asMatchId("seed-match"),
    homeTeamId: input.home.team.id,
    awayTeamId: input.away.team.id,
    clock: {
      period: "first_half",
      minute: 0,
      second: 0,
      stoppageMinute: 0,
    },
    phase: "pre_match",
    score: { home: 0, away: 0 },
    ball: { x: 50, y: 50 },
    ballCarrierId: kicker.playerId,
    possessionTeamId: kickingTeamId,
    players,
    homeTactics: input.home.tactics,
    awayTactics: input.away.tactics,
    rng: createRng(input.seed),
    lastPasserId: null,
    pending: null,
    periodElapsedSeconds: 0,
    stoppageAllowanceSeconds: 0,
    firstKickoffTeamId: kickingTeamId,
    substitutionsUsed: { home: 0, away: 0 },
    humanTeamId: input.humanTeamId ?? null,
    transitionGainedTeamId: null,
    transitionUntilElapsed: null,
    duelCooldownUntil: null,
    ballInAir: false,
    nextSeq: 0,
  };
}
