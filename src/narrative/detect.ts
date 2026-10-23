import type { FixtureResult } from "@fussballmanager/shared";
import type { BoardState } from "../board/board-state.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import type { Player } from "../types/player.ts";
import type { WorldState } from "../world/world-generator.ts";
import { clubShortName, lastPlayerResult, leagueTable, playerFixture } from "../sim/league-week.ts";
import { proSquad } from "./captain.ts";
import { isInRelegationZone, RELEGATION_ZONE_PLACE } from "./season-objectives.ts";
import { hospitalityDocked } from "../stadium/hospitality.ts";
import { shouldRepeatRestaurantWedding } from "../stadium/precinct-campus-events.ts";
import type { StoryState } from "./story-state.ts";

export type NarrativeBeatKind = "fan_feed" | "inbox";

export interface DetectedBeat {
  beatId: string;
  kind: NarrativeBeatKind;
  fanbaseDelta?: number;
  context?: Record<string, string | number>;
}

function playerTablePlace(league: LeagueState): number {
  const index = leagueTable(league).findIndex((row) => row.teamId === league.player_club_id);
  return index >= 0 ? index + 1 : 0;
}

function lossStreak(league: LeagueState, clubId: string): number {
  const results = [...league.results].reverse();
  let streak = 0;
  for (const result of results) {
    if (result.homeTeamId !== clubId && result.awayTeamId !== clubId) continue;
    const home = result.homeTeamId === clubId;
    const gf = home ? result.homeGoals : result.awayGoals;
    const ga = home ? result.awayGoals : result.homeGoals;
    if (gf < ga) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function unbeatenStreak(league: LeagueState, clubId: string): number {
  const results = [...league.results].reverse();
  let streak = 0;
  for (const result of results) {
    if (result.homeTeamId !== clubId && result.awayTeamId !== clubId) continue;
    const home = result.homeTeamId === clubId;
    const gf = home ? result.homeGoals : result.awayGoals;
    const ga = home ? result.awayGoals : result.homeGoals;
    if (gf >= ga) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function avgProMorale(players: readonly Player[], clubId: string): number {
  const pros = proSquad(players, clubId);
  if (pros.length === 0) return 50;
  return pros.reduce((sum, player) => sum + player.state.morale, 0) / pros.length;
}

function lowFormCount(players: readonly Player[], clubId: string): number {
  return proSquad(players, clubId).filter((player) => player.state.form < -2).length;
}

function isDerbyWeek(league: LeagueState, world: WorldState): boolean {
  const fixture = playerFixture(league, league.matchday);
  if (!fixture) return false;
  const opponentId =
    fixture.homeTeamId === league.player_club_id ? fixture.awayTeamId : fixture.homeTeamId;
  const club = world.clubs.find((entry) => entry.id === league.player_club_id);
  if (!club) return false;
  return club.rivalry_ids.includes(opponentId);
}

function derbyOpponentName(league: LeagueState): string | undefined {
  const fixture = playerFixture(league, league.matchday);
  if (!fixture) return undefined;
  const opponentId =
    fixture.homeTeamId === league.player_club_id ? fixture.awayTeamId : fixture.homeTeamId;
  return clubShortName(opponentId);
}

function matchWasLoss(result: FixtureResult, clubId: string): boolean {
  const home = result.homeTeamId === clubId;
  const gf = home ? result.homeGoals : result.awayGoals;
  const ga = home ? result.awayGoals : result.homeGoals;
  return gf < ga;
}

function matchWasWin(result: FixtureResult, clubId: string): boolean {
  const home = result.homeTeamId === clubId;
  const gf = home ? result.homeGoals : result.awayGoals;
  const ga = home ? result.awayGoals : result.homeGoals;
  return gf > ga;
}

function ticketBacklash(stadium: ClubStadium): boolean {
  const standingBlocks = stadium.blocks.filter((block) => block.tier === "standing");
  const standingPrice =
    standingBlocks.length > 0
      ? standingBlocks.reduce((sum, block) => sum + block.ticket_price_eur, 0) / standingBlocks.length
      : 18;
  const fanbase = stadium.fanbase ?? 50;
  return standingPrice >= 18 && fanbase < 52;
}

function narrativeRoll(masterSeed: number, season: number, week: number, beatId: string): number {
  let hash = masterSeed ^ season ^ week;
  for (const ch of beatId) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

export interface DetectContext {
  story: StoryState;
  league: LeagueState;
  board: BoardState;
  stadium: ClubStadium;
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  world: WorldState;
  playerFixture: FixtureResult | null;
  recentSale?: boolean;
}

export function detectWeeklyBeats(context: DetectContext): DetectedBeat[] {
  if (!context.story.opening_complete) return [];

  const hospitality = detectHospitalityBeats(context);
  const arc = context.story.active_arc;
  if (arc !== "relegation_battle" && arc !== "promotion_push") return hospitality;
  const survivalArc = arc === "relegation_battle";

  const beats: DetectedBeat[] = [...hospitality];
  const fired = new Set(context.story.beats_fired);
  const place = playerTablePlace(context.league);
  const roll = (beatId: string) => narrativeRoll(context.masterSeed, context.season, context.week, beatId);

  if (survivalArc && !fired.has("board_survival_intro") && context.week <= 2) {
    beats.push({ beatId: "board_survival_intro", kind: "inbox" });
  }

  if (
    survivalArc &&
    !fired.has("arc_climax_week30") &&
    context.week >= 30 &&
    place >= RELEGATION_ZONE_PLACE - 1
  ) {
    beats.push({ beatId: "arc_climax_week30", kind: "inbox" });
  }

  if (!fired.has("derby_week") && isDerbyWeek(context.league, context.world) && roll("derby_week") < 0.85) {
    beats.push({
      beatId: "derby_week",
      kind: "inbox",
      context: { opponent: derbyOpponentName(context.league) ?? "" },
    });
  }

  const losses = lossStreak(context.league, context.clubId);
  if (losses >= 3 && !fired.has(`fan_worry_loss_streak_s${context.season}`)) {
    beats.push({
      beatId: `fan_worry_loss_streak_s${context.season}`,
      kind: "fan_feed",
      fanbaseDelta: -0.5,
    });
  }

  const unbeaten = unbeatenStreak(context.league, context.clubId);
  if (unbeaten >= 3 && !fired.has(`fan_hope_unbeaten_s${context.season}`)) {
    beats.push({
      beatId: `fan_hope_unbeaten_s${context.season}`,
      kind: "fan_feed",
      fanbaseDelta: 0.7,
    });
  }

  if (ticketBacklash(context.stadium) && !fired.has(`fan_ticket_backlash_s${context.season}`)) {
    beats.push({
      beatId: `fan_ticket_backlash_s${context.season}`,
      kind: "fan_feed",
      fanbaseDelta: -0.4,
    });
  }

  if (
    context.playerFixture &&
    matchWasWin(context.playerFixture, context.clubId) &&
    context.playerFixture.homeTeamId === context.clubId &&
    roll("fan_home_win") < 0.35
  ) {
    beats.push({
      beatId: `fan_home_win_${context.week}`,
      kind: "fan_feed",
      fanbaseDelta: 0.35,
    });
  }

  if (
    context.playerFixture &&
    matchWasLoss(context.playerFixture, context.clubId) &&
    isDerbyWeek(context.league, context.world)
  ) {
    beats.push({
      beatId: `fan_derby_loss_${context.week}`,
      kind: "fan_feed",
      fanbaseDelta: -0.6,
      context: { opponent: derbyOpponentName(context.league) ?? "" },
    });
  }

  if (
    context.week >= 20 &&
    context.story.media_hype >= 55 &&
    !fired.has(`fan_supporters_bus_s${context.season}`) &&
    roll("fan_supporters_bus") < 0.4
  ) {
    beats.push({
      beatId: `fan_supporters_bus_s${context.season}`,
      kind: "fan_feed",
      fanbaseDelta: 0.5,
    });
  }

  if (
    context.board.pressure >= 40 &&
    (losses >= 1 || (context.playerFixture && matchWasLoss(context.playerFixture, context.clubId))) &&
    !fired.has(`press_hostile_${context.week}`) &&
    roll("press_hostile_bad_week") < 0.55
  ) {
    beats.push({ beatId: "press_hostile_bad_week", kind: "inbox" });
  }

  if (
    context.story.media_hype >= 48 &&
    unbeaten >= 2 &&
    !fired.has(`press_ally_${context.season}`) &&
    roll("press_ally_support") < 0.35
  ) {
    beats.push({ beatId: "press_ally_support", kind: "inbox" });
  }

  if (
    avgProMorale(context.players, context.clubId) < 45 &&
    !fired.has(`assistant_low_morale_${context.week}`) &&
    roll("assistant_low_morale") < 0.5
  ) {
    beats.push({ beatId: "assistant_low_morale", kind: "inbox" });
  }

  if (
    context.story.cast.captain_player_id &&
    (lowFormCount(context.players, context.clubId) >= 3 || losses >= 2) &&
    !fired.has(`captain_speak_${context.week}`) &&
    roll("captain_speak") < 0.45
  ) {
    const captain = context.players.find((player) => player.id === context.story.cast.captain_player_id);
    beats.push({
      beatId: "captain_speak",
      kind: "inbox",
      context: { captainName: captain ? `${captain.name.first ?? ""} ${captain.name.last ?? ""}`.trim() : "" },
    });
  }

  if (context.recentSale && !fired.has(`sell_star_press_${context.week}`)) {
    beats.push({ beatId: "sell_star_press", kind: "inbox" });
  }

  if (survivalArc && isInRelegationZone(place) && context.week >= 10 && roll("fan_worry_table") < 0.25) {
    beats.push({
      beatId: `fan_table_worry_${context.week}`,
      kind: "fan_feed",
      fanbaseDelta: -0.2,
    });
  }

  const last = lastPlayerResult(context.league);
  if (last && losses >= 2 && context.story.fan_feed.length < 2 && roll("ambient_fan") < 0.2) {
    beats.push({
      beatId: `fan_ambient_${context.week}`,
      kind: "fan_feed",
    });
  }

  return beats.filter((beat) => !fired.has(beat.beatId));
}

function detectHospitalityBeats(context: DetectContext): DetectedBeat[] {
  const precinct = context.stadium.precinct;
  const fired = new Set(context.story.beats_fired);
  const beats: DetectedBeat[] = [];

  if (
    context.season >= 3 &&
    hospitalityDocked(precinct, "hotel") &&
    !fired.has("empire_hotel_vs_pitch")
  ) {
    beats.push({ beatId: "empire_hotel_vs_pitch", kind: "inbox" });
  }

  if (!hospitalityDocked(precinct, "restaurant")) return beats;
  const weddingRepeatId = `hospitality_wedding_s${context.season}`;
  if (shouldRepeatRestaurantWedding(context.stadium, context.season) && !fired.has(weddingRepeatId)) {
    beats.push({ beatId: weddingRepeatId, kind: "fan_feed", fanbaseDelta: 0.7 });
  }
  const legacyStory = context.stadium.restaurant_story_last_season == null;
  if (legacyStory && !fired.has("hospitality_engagement") && context.week >= 6) {
    beats.push({ beatId: "hospitality_engagement", kind: "fan_feed", fanbaseDelta: 0.4 });
  }
  if (
    fired.has("hospitality_engagement") &&
    !fired.has("hospitality_overtime") &&
    context.week >= 14
  ) {
    beats.push({ beatId: "hospitality_overtime", kind: "fan_feed" });
  }
  return beats;
}
