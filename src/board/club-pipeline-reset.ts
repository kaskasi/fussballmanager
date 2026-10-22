import type { TeamId } from "@fussballmanager/shared";
import { divisionEconomy, normalizeFinances, type ClubFinances } from "../economy/club-finances.ts";
import { defaultFinancingState, normalizeFinancingState } from "../economy/financing.ts";
import { defaultClubMedicalState } from "../medical/diagnosis-queue.ts";
import { defaultOrthopedistHireState } from "../medical/orthopedist-hire.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { createScoutBoard } from "../scouting/scout-board.ts";
import { defaultScoutNetwork } from "../scouting/scout-network.ts";
import { defaultCoachingStaff } from "../staff/coaching-staff.ts";
import { defaultMedicalStaff } from "../staff/medical-staff.ts";
import { buildClubProfile, divisionForClub } from "../sim/club-profiles.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import {
  defaultClubStadium,
  normalizeClubStadium,
  stadiumTotalCapacity,
  STADIUM_BASE_BLOCKS,
  type ClubStadium,
} from "../stadium/club-stadium.ts";
import { emptyTransferState } from "../transfers/negotiations.ts";
import { buildAcademyCohort } from "../youth/intake-generator.ts";
import { emptyInbox } from "../youth/decision-inbox.ts";
import { normalizeYouthCamps } from "../youth/satellite-camps.ts";
import type { WorldClub } from "../world/world-generator.ts";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextPlayerIdStart(players: readonly { id: string }[]): number {
  let max = 0;
  for (const player of players) {
    const match = /^pl_(\d+)$/.exec(player.id);
    if (match) max = Math.max(max, Number.parseInt(match[1]!, 10));
  }
  return max + 1;
}

export function stadiumForTeam(teamId: TeamId, session: Pick<GameSession, "league" | "world">): ClubStadium {
  const pools = session.league.league_pools ?? defaultLeaguePools();
  const divisionId = divisionForClub(pools, teamId);
  const economy = divisionEconomy(divisionId);
  const profile = buildClubProfile(teamId, {
    pools,
    worldClubs: session.world.clubs,
    playerClubId: teamId,
  });
  const targetCapacity = profile?.stadiumCapacity ?? economy.stadium_defaults.capacity;
  const base = defaultClubStadium();
  const baseCapacity = stadiumTotalCapacity(base);
  const scale = baseCapacity > 0 ? targetCapacity / baseCapacity : 1;
  const scaledBlocks = STADIUM_BASE_BLOCKS.map((block) => ({
    ...block,
    capacity: Math.max(100, Math.round(block.capacity * scale)),
    ticket_price_eur: economy.stadium_defaults.avg_ticket_eur,
    fill_rate: economy.stadium_defaults.fill_rate,
  }));
  return normalizeClubStadium({
    name: profile?.stadiumName ?? base.name,
    fanbase: profile?.fanbase ?? base.fanbase,
    blocks: scaledBlocks,
    upgrade_levels: {},
    block_expansion: undefined,
    sponsor_deals: [],
    precinct: undefined,
    merchandising: undefined,
  });
}

export function financesForTeam(
  teamId: TeamId,
  session: Pick<GameSession, "league">,
): ClubFinances {
  const pools = session.league.league_pools ?? defaultLeaguePools();
  const divisionId = divisionForClub(pools, teamId);
  const economy = divisionEconomy(divisionId);
  const tierScale = economy.tier === 4 ? 0.55 : 1;
  const cash = Math.round(5_500_000 * tierScale);
  const transferBudget = Math.round(2_200_000 * tierScale);
  const wageBudget = Math.round(85_000 * tierScale);
  return normalizeFinances({
    cash,
    transfer_budget: transferBudget,
    wage_budget_weekly: wageBudget,
    last_closed_month: 0,
    ledger: [],
    pending_lines: [],
    month_opening_cash: cash,
  });
}

export function seedYouthSquad(
  teamId: TeamId,
  session: Pick<GameSession, "season" | "masterSeed" | "players">,
): GameSession["players"] {
  const clubId = careerTeamId(teamId);
  const random = mulberry32(hashString(`${session.masterSeed}:youth:${teamId}:${session.season}`));
  const baseId = nextPlayerIdStart(session.players);
  const idOffset = (hashString(`${teamId}:${session.season}:youth`) % 2_000) + 1;
  let idStart = baseId + idOffset;
  if (idStart + 24 > 99_999) {
    idStart = 10_000 + (hashString(`${session.masterSeed}:${teamId}`) % 80_000);
  }
  const cohort = buildAcademyCohort({
    season: session.season,
    week: 1,
    seasonYear: session.season + 2025,
    clubId,
    nationality: "DE",
    region: "Schleswig-Holstein",
    facility: "academy_basic",
    idStart,
    random,
    count: 24,
  });
  return cohort.map((player, index) => {
    if (index < 12) return player;
    return {
      ...player,
      squad_status: "u19" as const,
      age: 16,
    };
  });
}

function worldClubForTeam(
  teamId: TeamId,
  worldClubs: readonly WorldClub[],
): WorldClub | null {
  return worldClubs.find((club) => club.id === teamId) ?? null;
}

/** Replace manager-scoped pipeline state when joining a new employer club. */
export function resetClubPipelineForTeam(session: GameSession, teamId: TeamId): GameSession {
  const playerClub = worldClubForTeam(teamId, session.world.clubs);
  const stadium = stadiumForTeam(teamId, session);
  const finances = financesForTeam(teamId, session);

  return {
    ...session,
    stadium,
    finances,
    scoutBoard: createScoutBoard(session.rivalPlayers, playerClub),
    scoutNetwork: defaultScoutNetwork(session.season, session.masterSeed ^ hashString(teamId)),
    medicalStaff: defaultMedicalStaff(),
    medicalState: defaultClubMedicalState(),
    orthopedistHire: defaultOrthopedistHireState(),
    transferState: emptyTransferState(),
    youthCamps: normalizeYouthCamps([]),
    academyFacility: "academy_basic",
    individualPrograms: [],
    individualHistory: [],
    matchLineup: undefined,
    youthInbox: emptyInbox(session.week),
    coachingStaff: defaultCoachingStaff(session.season),
    financing: normalizeFinancingState(defaultFinancingState()),
    trainingUnitsCompleted: 0,
    trainingUnitOutcomes: [],
    trainingCalendarGateDone: true,
  };
}
