/**
 * PRD 05 — curated opening transfer board (Sommerfenster / Karrierestart).
 * Archetypes: Oberliga-Aufsteiger, Veteran, Gehalts-Unzufriedenheit, Camp-Export-Juwel.
 */
import type { TeamId } from "@fussballmanager/shared";
import { withClubEvent, type ClubEvent } from "../inbox/club-events.ts";
import { inboxEmojiLine } from "../inbox/postfach-emoji.ts";
import { isTransferWindowOpen } from "../sim/transfer-windows.ts";
import { addPlayersToPool, ensureTargetsForPool } from "../scouting/scout-discovery.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { normalizeDiscovery } from "../scouting/scout-discovery.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  worldCareerClubId,
  type WorldClub,
  type WorldDivisionId,
} from "../world/world-generator.ts";
import { estimateCa } from "./market-value.ts";
import { sellerAskingPrice, type TransferState } from "./negotiations.ts";
import type { TransferListing } from "./transfer-listings.ts";
import { YOUTH_CAMP_NATIONS } from "../youth/satellite-camps.ts";

export interface OpeningMarketArchetype {
  id: "oberliga_step_up" | "veteran_challenge" | "wage_unrest_star" | "camp_export_gem";
  playerId: string;
  /** Inbox teaser when the board is seeded. */
  teaser: string;
}

const OPENING_TEASER_EMOJI: Record<OpeningMarketArchetype["id"], string> = {
  oberliga_step_up: "🚀",
  veteran_challenge: "🎯",
  wage_unrest_star: "💸",
  camp_export_gem: "🌱",
};

export interface OpeningTransferMarketResult {
  listings: TransferListing[];
  opening_market_player_ids: string[];
  rivalPlayers: Player[];
  scoutBoard: ScoutBoard;
  clubEvents: ClubEvent[];
  archetypes: OpeningMarketArchetype[];
}

function openingRng(masterSeed: number, salt: string): () => number {
  let state = masterSeed ^ salt.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ca(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

function clubDivision(clubs: readonly WorldClub[], careerClubId: string): WorldDivisionId | null {
  const worldId = clubs.find((c) => worldCareerClubId(c.id) === careerClubId)?.id;
  const club = clubs.find((c) => c.id === worldId || worldCareerClubId(c.id) === careerClubId);
  return club?.division_id ?? null;
}

function clubLabel(clubs: readonly WorldClub[], careerClubId: string): string {
  const club = clubs.find((c) => worldCareerClubId(c.id) === careerClubId);
  return club?.short_name ?? careerClubId;
}

function listingFor(
  player: Player,
  season: number,
  week: number,
  priceFactor: number,
): TransferListing {
  const base = sellerAskingPrice(player, season);
  return {
    player_id: player.id,
    club_id: player.club_id ?? "",
    asking_price: Math.max(50_000, Math.round(base * priceFactor)),
    listed_season: season,
    listed_week: week,
  };
}

function pickBest(
  pool: Player[],
  score: (player: Player) => number,
  rng: () => number,
  take = 1,
): Player[] {
  if (pool.length === 0) return [];
  const ranked = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  if (take === 1) {
    const top = Math.min(3, ranked.length);
    return [ranked[Math.floor(rng() * top)]!];
  }
  return ranked.slice(0, take);
}

function patchPlayer(player: Player, statePatch: Partial<Player["state"]>): Player {
  return {
    ...player,
    state: { ...player.state, ...statePatch },
  };
}

export function buildOpeningTransferMarket(input: {
  rivalPlayers: readonly Player[];
  worldClubs: readonly WorldClub[];
  userClubId: string;
  season: number;
  week: number;
  masterSeed: number;
  scoutBoard: ScoutBoard;
  clubEvents: ClubEvent[];
}): OpeningTransferMarketResult | null {
  if (!isTransferWindowOpen(input.week)) return null;

  const rng = openingRng(input.masterSeed, "opening-transfer-market");
  const pros = input.rivalPlayers.filter(
    (player) => player.squad_status === "pro" && player.club_id && player.club_id !== input.userClubId,
  );
  if (pros.length < 8) return null;

  const byDivision = (division: WorldDivisionId) =>
    pros.filter((player) => clubDivision(input.worldClubs, player.club_id!) === division);

  const oberliga = byDivision("oberliga-nord");
  const regionalliga = byDivision("regionalliga-nord");

  const archetypes: OpeningMarketArchetype[] = [];
  const pickedIds = new Set<string>();
  const listings: TransferListing[] = [];
  let rivalPlayers = [...input.rivalPlayers];

  const commit = (
    player: Player,
    archetype: OpeningMarketArchetype["id"],
    teaser: string,
    priceFactor: number,
    mutate?: (p: Player) => Player,
  ) => {
    if (pickedIds.has(player.id)) return;
    pickedIds.add(player.id);
    const next = mutate ? mutate(player) : player;
    rivalPlayers = rivalPlayers.map((row) => (row.id === player.id ? next : row));
    listings.push(listingFor(next, input.season, input.week, priceFactor));
    archetypes.push({
      id: archetype,
      playerId: player.id,
      teaser: inboxEmojiLine(OPENING_TEASER_EMOJI[archetype], teaser),
    });
  };

  const stepUpPool = oberliga.filter((player) => player.age >= 20 && player.age <= 26);
  const stepUpPick = pickBest(stepUpPool, (player) => ca(player) + (player.age <= 23 ? 8 : 0), rng)[0];
  if (stepUpPick) {
    const club = clubLabel(input.worldClubs, stepUpPick.club_id!);
    commit(
      stepUpPick,
      "oberliga_step_up",
      `${club}: ${formatPlayerName(stepUpPick)} will raus aus der Oberliga — ambitioniert, listenpreis freundlich.`,
      0.9,
      (p) =>
        patchPlayer(p, {
          desire_to_leave: true,
          morale: Math.min(p.state.morale, 48),
        }),
    );
  }

  const veteranPool = regionalliga.filter((player) => player.age >= 32 && ca(player) >= 68);
  const veteran = pickBest(veteranPool, (player) => ca(player) - player.age * 0.2, rng)[0];
  if (veteran) {
    const club = clubLabel(input.worldClubs, veteran.club_id!);
    commit(
      veteran,
      "veteran_challenge",
      `${club}: ${formatPlayerName(veteran)} (${veteran.age}) sucht noch eine große Aufgabe.`,
      0.82,
    );
  }

  const starPool = [...regionalliga].sort((a, b) => ca(b) - ca(a)).slice(0, 6);
  const star = starPool[Math.floor(rng() * Math.min(4, starPool.length))];
  if (star && !pickedIds.has(star.id)) {
    const club = clubLabel(input.worldClubs, star.club_id!);
    commit(
      star,
      "wage_unrest_star",
      `${club}: ${formatPlayerName(star)} unzufrieden — Gehalt zu niedrig, Verein will trotzdem Top-Ablöse.`,
      1.08,
      (p) =>
        patchPlayer(p, {
          desire_to_leave: true,
          morale: 32,
          contract_underpaid_since_day: 1,
        }),
    );
  }

  const campIds = YOUTH_CAMP_NATIONS.map((n) => n.id);
  const youngPool = pros.filter((player) => player.age >= 17 && player.age <= 20 && ca(player) >= 62);
  const campGems = pickBest(youngPool, (player) => ca(player) + (20 - player.age), rng, 2).filter(
    (player, index, arr) =>
      arr.findIndex((other) => other.club_id === player.club_id) === index,
  );
  for (let index = 0; index < campGems.length; index += 1) {
    const gem = campGems[index]!;
    const campId = campIds[index % campIds.length] ?? "camp_br";
    const club = clubLabel(input.worldClubs, gem.club_id!);
    commit(
      gem,
      "camp_export_gem",
      `${club}: ${formatPlayerName(gem)} aus dem Satelliten-Camp — Cash-out-Listing.`,
      0.78,
      (p) =>
        patchPlayer(p, {
          youth_site: campId,
          camp_opening_headline: true,
        }),
    );
  }

  if (listings.length === 0) return null;

  let discovery = addPlayersToPool(normalizeDiscovery(input.scoutBoard.discovery), [...pickedIds]);
  const targets = ensureTargetsForPool(input.scoutBoard.targets, discovery, rivalPlayers);
  const scoutBoard: ScoutBoard = {
    ...input.scoutBoard,
    discovery,
    targets,
  };

  let clubEvents = input.clubEvents;
  for (const row of archetypes) {
    clubEvents = withClubEvent(clubEvents, input.season, input.week, "inbox", row.teaser);
  }

  return {
    listings,
    opening_market_player_ids: [...pickedIds],
    rivalPlayers,
    scoutBoard,
    clubEvents,
    archetypes,
  };
}

export function applyOpeningTransferMarket(session: GameSession): GameSession {
  if ((session.transferState.opening_market_player_ids?.length ?? 0) > 0) {
    return session;
  }
  if ((session.transferState.listings?.length ?? 0) > 0) {
    return session;
  }
  const built = buildOpeningTransferMarket({
    rivalPlayers: session.rivalPlayers,
    worldClubs: session.world.clubs,
    userClubId: session.clubId,
    season: session.season,
    week: session.week,
    masterSeed: session.masterSeed,
    scoutBoard: session.scoutBoard,
    clubEvents: session.clubEvents,
  });
  if (!built) return session;
  return {
    ...session,
    rivalPlayers: built.rivalPlayers,
    scoutBoard: built.scoutBoard,
    clubEvents: built.clubEvents,
    transferState: {
      ...session.transferState,
      listings: built.listings,
      opening_market_player_ids: built.opening_market_player_ids,
    },
  };
}

/** Keep curated opening listings while weekly AI refresh runs. */
export function openingMarketListings(
  state: TransferState,
  players: readonly Player[],
  userClubId: string,
): TransferListing[] {
  const ids = new Set(state.opening_market_player_ids ?? []);
  if (ids.size === 0) return [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  return (state.listings ?? []).filter((row) => {
    if (!ids.has(row.player_id)) return false;
    if (row.club_id === userClubId) return false;
    const player = playerById.get(row.player_id);
    return player != null && player.squad_status === "pro" && player.club_id === row.club_id;
  });
}

export function leagueClubIdsIncludingPools(input: {
  leagueClubIds: readonly TeamId[];
  worldClubs: readonly WorldClub[];
}): TeamId[] {
  const fromWorld = input.worldClubs.map((club) => worldCareerClubId(club.id) as TeamId);
  const merged = new Set<TeamId>([...input.leagueClubIds, ...fromWorld]);
  return [...merged];
}
