import type { TransferRecord } from "../transfers/transfer-history.ts";
import { displayTransferOtherClubs, isClubTransferRecord } from "../transfers/transfer-history.ts";
import type { WorldClub } from "../world/world-generator.ts";
import type { Player } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { divisionStandings, divisionLeaderLists } from "../sim/league-standings.ts";
import { teamForm, formSparkline } from "../sim/league-form.ts";
import { civilDateFromSession } from "../sim/session-civil-date.ts";
import { formatCalendarWeek } from "../sim/game-calendar.ts";
import { campNationById } from "../youth/satellite-camps.ts";
import { listActiveScoutTrips } from "../scouting/scout-trip-queue.ts";
import { normalizeClubMerchandising } from "../economy/merchandising.ts";
import { clubNameFromWorld } from "../world/club-display.ts";
import type { TeamId } from "@fussballmanager/shared";
import {
  TRETER_MASTHEAD,
  TRETER_IMAGE,
  treterBoardCopy,
  treterCampHeroCopy,
  treterCampImage,
  treterFormCopy,
  treterGoalOfMonthCopy,
  treterMerchCopy,
  treterScoutCopy,
  treterStadiumCopy,
} from "./treter-copy.ts";

export type TreterArticleKind =
  | "camp"
  | "transfer_user"
  | "transfer_ai"
  | "table"
  | "scorers"
  | "scout"
  | "goal_month"
  | "form"
  | "board"
  | "stadium"
  | "merch";

export interface TreterArticle {
  id: string;
  kind: TreterArticleKind;
  headline: string;
  kicker?: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  layout: "hero" | "column";
  priority: number;
  playerId?: string;
}

export interface TreterEdition {
  season: number;
  week: number;
  masthead: string;
  articles: TreterArticle[];
}

/** @deprecated use TreterEdition */
export type KickerEdition = TreterEdition;

/** @deprecated legacy line shape — rebuilt from articles in UI if missing */
export interface KickerStoryLine {
  id: string;
  headline: string;
  teaser: string;
  playerId: string;
  fee?: number;
  clubsLabel: string;
}

const TRETER_ARTICLE_LIMIT = 5;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

function pickTemplate(templates: readonly string[], seed: string): string {
  const index = Math.abs(hashString(seed)) % templates.length;
  return templates[index] ?? templates[0]!;
}

function managerClubLabel(session: GameSession): string {
  const fromWorld = clubNameFromWorld(session.league.player_club_id as TeamId, session.world.clubs);
  if (fromWorld) return fromWorld;
  const local = session.world.clubs.find((club) => club.id === session.clubId);
  return local?.name ?? "Dein Verein";
}

function transfersForWeek(
  history: readonly TransferRecord[],
  season: number,
  week: number,
): TransferRecord[] {
  return history.filter((record) => record.season === season && record.week === week);
}

function lossStreak(form: readonly ("W" | "D" | "L")[]): number {
  let streak = 0;
  for (let index = form.length - 1; index >= 0; index -= 1) {
    if (form[index] === "L") streak += 1;
    else break;
  }
  return streak;
}

function isGoalOfMonthIssue(session: GameSession): boolean {
  const civil = civilDateFromSession(session.season, session.week, session.weekday);
  return session.weekday === 2 && civil.day <= 14;
}

function goalOfMonthArticle(session: GameSession, clubLabel: string): TreterArticle | null {
  if (!isGoalOfMonthIssue(session)) return null;
  const teamId = session.league.player_club_id as TeamId;
  const results = session.league.results.filter(
    (result) => result.homeTeamId === teamId || result.awayTeamId === teamId,
  );
  const last = results[results.length - 1];
  if (!last) return null;
  const isHome = last.homeTeamId === teamId;
  const scored = isHome ? last.homeGoals : last.awayGoals;
  if (scored <= 0) return null;
  const scoreline = `${last.homeGoals}:${last.awayGoals}`;
  const stat = session.league.player_stats
    .filter((row) => row.goals > 0)
    .sort((left, right) => right.goals - left.goals)[0];
  const scorer =
    session.players.find((p) => p.id === stat?.playerId)?.name.first ??
    stat?.name ??
    clubLabel;
  const copy = treterGoalOfMonthCopy(scorer, "Live", scoreline);
  return {
    id: `treter-goal-${session.season}-${session.week}`,
    kind: "goal_month",
    headline: copy.headline,
    body: copy.body,
    imageSrc: TRETER_IMAGE.moodCrowd,
    imageAlt: "Torjubel",
    layout: "column",
    priority: 85,
  };
}

function collectCampArticles(session: GameSession, clubLabel: string): TreterArticle[] {
  const articles: TreterArticle[] = [];
  for (const camp of session.youthCamps) {
    if (camp.purchased_season !== session.season) continue;
    const purchaseWeek = camp.purchased_week ?? session.week;
    if (purchaseWeek !== session.week) continue;
    const copy = treterCampHeroCopy(camp.id, clubLabel);
    articles.push({
      id: `treter-camp-${camp.id}-${session.season}-${session.week}`,
      kind: "camp",
      kicker: copy.kicker,
      headline: copy.headline,
      body: copy.body,
      imageSrc: treterCampImage(camp.id),
      imageAlt: campNationById(camp.id)?.label ?? "Camp",
      layout: "hero",
      priority: 100,
    });
  }
  return articles;
}

function collectTransferArticles(
  session: GameSession,
  clubLabel: string,
  weekRecords: TransferRecord[],
): TreterArticle[] {
  const articles: TreterArticle[] = [];
  for (const record of weekRecords) {
    const isUser = isClubTransferRecord(record);
    const fee =
      record.fee != null && record.fee > 0
        ? `€ ${Math.round(record.fee).toLocaleString("de-DE")}`
        : "ablösefrei";
    const clubsLabel = displayTransferOtherClubs(record.other_club_name, session.world.clubs);
    const seedBase = `${session.masterSeed}:${record.id}`;
    const tone = isUser
      ? record.kind === "in"
        ? `${clubLabel} holt ${record.player_name} (${fee}) — «Pflichttermin erfüllt», mauern Kritiker.`
        : `${clubLabel} lässt ${record.player_name} ziehen (${fee}). «Verkauf oder Fehlgriff?» — Der Treter bleibt skeptisch.`
      : pickTemplate(
          [
            `Liga-Deal: ${record.player_name} wechselt (${clubsLabel}, ${fee}). Markt beobachtet.`,
            `${record.player_name} für ${fee} — KI-Clubs handeln laut.`,
          ],
          seedBase,
        );
    articles.push({
      id: `treter-tr-${record.id}`,
      kind: isUser ? "transfer_user" : "transfer_ai",
      headline: isUser
        ? record.kind === "in"
          ? `${clubLabel} verpflichtet ${record.player_name}`
          : `Abgang: ${record.player_name}`
        : `Transfer: ${record.player_name}`,
      kicker: isUser ? "Eigener Klub" : "Liga-Markt",
      body: `${tone} ${clubsLabel}.`,
      imageSrc: TRETER_IMAGE.stadion,
      imageAlt: "Stadion",
      layout: "column",
      priority: isUser ? 90 : 50,
      playerId: record.player_id,
    });
  }
  return articles;
}

function collectTableArticle(session: GameSession, clubLabel: string): TreterArticle | null {
  const standings = divisionStandings(
    session.league,
    session.league.division_id,
    session.masterSeed,
    session.season,
    session.rivalPlayers,
  );
  const top = standings.table.slice(0, 4);
  if (top.length === 0) return null;
  const lines = top.map((row, index) => {
    const name =
      clubNameFromWorld(row.teamId, session.world.clubs) ?? row.teamId;
    return `${index + 1}. ${name} (${row.points} Pkt)`;
  });
  const own = standings.table.find((row) => row.teamId === session.league.player_club_id);
  return {
    id: `treter-table-${session.season}-${session.week}`,
    kind: "table",
    headline: "Tabellenführung",
    kicker: "Liga",
    body: `${lines.join(" · ")}${own ? ` — ${clubLabel} auf Platz ${standings.table.indexOf(own) + 1}.` : ""}`,
    imageSrc: TRETER_IMAGE.moodCrowd,
    imageAlt: "Liga",
    layout: "column",
    priority: 45,
  };
}

function collectScorersArticle(session: GameSession): TreterArticle | null {
  const standings = divisionStandings(
    session.league,
    session.league.division_id,
    session.masterSeed,
    session.season,
    session.rivalPlayers,
  );
  const leaders = divisionLeaderLists(
    session.league,
    standings,
    session.masterSeed,
    session.season,
    session.rivalPlayers,
    3,
  );
  if (leaders.scorers.length === 0) return null;
  const lines = leaders.scorers.map((row, index) => `${index + 1}. ${row.name} (${row.goals})`);
  return {
    id: `treter-scorers-${session.season}-${session.week}`,
    kind: "scorers",
    headline: "Torschützen",
    kicker: "Statistik",
    body: lines.join(" · "),
    layout: "column",
    priority: 40,
  };
}

function collectScoutArticles(session: GameSession, clubLabel: string): TreterArticle[] {
  const trips = listActiveScoutTrips(session.scoutBoard);
  const started = trips.filter((trip) => trip.queued_at_week === session.week);
  return started.slice(0, 2).map((trip, index) => {
    const copy = treterScoutCopy(clubLabel, trip.zone_id ?? "Ausland");
    return {
      id: `treter-scout-${trip.id ?? index}`,
      kind: "scout",
      headline: copy.headline,
      body: copy.body,
      imageSrc: TRETER_IMAGE.precinct,
      imageAlt: "Scout",
      layout: "column",
      priority: 60,
    };
  });
}

function collectFormArticle(session: GameSession, clubLabel: string): TreterArticle | null {
  const form = teamForm(session.league, session.league.player_club_id as TeamId, 5);
  if (form.length === 0) return null;
  const losses = lossStreak(form);
  if (losses < 2 && form.filter((r) => r === "W").length < 2) return null;
  const copy = treterFormCopy(clubLabel, losses, formSparkline(form));
  return {
    id: `treter-form-${session.season}-${session.week}`,
    kind: "form",
    headline: copy.headline,
    body: copy.body,
    imageSrc: losses >= 3 ? TRETER_IMAGE.moodRain : TRETER_IMAGE.moodCrowd,
    imageAlt: "Form",
    layout: "column",
    priority: losses >= 3 ? 75 : 55,
  };
}

function collectBoardArticle(session: GameSession, clubLabel: string): TreterArticle | null {
  const pressure = session.board.pressure ?? 0;
  if (pressure < 25) return null;
  const copy = treterBoardCopy(clubLabel, pressure);
  return {
    id: `treter-board-${session.season}-${session.week}`,
    kind: "board",
    headline: copy.headline,
    body: copy.body,
    layout: "column",
    priority: pressure >= 50 ? 80 : 65,
  };
}

function collectStadiumArticles(session: GameSession, clubLabel: string): TreterArticle[] {
  const events = session.clubEvents.filter(
    (event) => event.season === session.season && event.week === session.week,
  );
  const infra = events.filter(
    (event) =>
      /Parzelle|Gelände|Ausbau|Imbiss|Fanshop|Hotel|Restaurant|Training|Merch/i.test(event.message),
  );
  return infra.slice(0, 1).map((event, index) => {
    const copy = treterStadiumCopy(clubLabel, event.message);
    return {
      id: `treter-stadium-${session.season}-${session.week}-${index}`,
      kind: "stadium",
      headline: copy.headline,
      body: copy.body,
      imageSrc: TRETER_IMAGE.precinct,
      imageAlt: "Gelände",
      layout: "column",
      priority: 65,
    };
  });
}

function collectMerchArticle(session: GameSession, clubLabel: string): TreterArticle | null {
  const merch = normalizeClubMerchandising(session.stadium.merchandising);
  const sale = merch.last_week_sale;
  if (!sale) return null;
  const units = Object.values(sale.units).reduce((sum, value) => sum + (value ?? 0), 0);
  const revenue = Object.values(sale.gross).reduce((sum, value) => sum + (value ?? 0), 0);
  if (units <= 0) return null;
  const copy = treterMerchCopy(clubLabel, revenue, units);
  return {
    id: `treter-merch-${session.season}-${session.week}`,
    kind: "merch",
    headline: copy.headline,
    body: copy.body,
    imageSrc: TRETER_IMAGE.stadion,
    imageAlt: "Shop",
    layout: "column",
    priority: 55,
  };
}

function pickArticles(candidates: TreterArticle[]): TreterArticle[] {
  const sorted = [...candidates].sort((left, right) => right.priority - left.priority);
  const picked: TreterArticle[] = [];
  const usedKind = new Set<TreterArticleKind>();

  for (const article of sorted) {
    if (picked.length >= TRETER_ARTICLE_LIMIT) break;
    if (article.kind !== "transfer_ai" && usedKind.has(article.kind)) continue;
    picked.push(article);
    usedKind.add(article.kind);
  }

  for (const article of sorted) {
    if (picked.length >= TRETER_ARTICLE_LIMIT) break;
    if (picked.some((entry) => entry.id === article.id)) continue;
    picked.push(article);
  }

  const hero = picked.find((entry) => entry.layout === "hero");
  if (hero) {
    return [hero, ...picked.filter((entry) => entry.id !== hero.id)].slice(0, TRETER_ARTICLE_LIMIT);
  }
  return picked.slice(0, TRETER_ARTICLE_LIMIT);
}

export function buildTreterEdition(session: GameSession): TreterEdition {
  const clubLabel = managerClubLabel(session);
  const weekRecords = transfersForWeek(session.transferState.history ?? [], session.season, session.week);
  const candidates: TreterArticle[] = [
    ...collectCampArticles(session, clubLabel),
    ...collectTransferArticles(session, clubLabel, weekRecords),
    ...collectScoutArticles(session, clubLabel),
    ...collectStadiumArticles(session, clubLabel),
  ];
  const optional = [
    goalOfMonthArticle(session, clubLabel),
    collectFormArticle(session, clubLabel),
    collectBoardArticle(session, clubLabel),
    collectMerchArticle(session, clubLabel),
    collectTableArticle(session, clubLabel),
    collectScorersArticle(session),
  ];
  for (const article of optional) {
    if (article) candidates.push(article);
  }

  let articles = pickArticles(candidates);
  if (articles.length < TRETER_ARTICLE_LIMIT) {
    const fillers = [collectTableArticle(session, clubLabel), collectScorersArticle(session)].filter(
      (entry): entry is TreterArticle => entry != null,
    );
    for (const filler of fillers) {
      if (articles.length >= TRETER_ARTICLE_LIMIT) break;
      if (!articles.some((entry) => entry.kind === filler.kind)) articles.push(filler);
    }
  }
  if (articles.length === 0 && weekRecords.length === 0) {
    articles = [
      {
        id: `treter-quiet-${session.season}-${session.week}`,
        kind: "table",
        headline: "Ruhige Woche",
        body: `${clubLabel} dominiert keine Schlagzeilen — Der Treter füllt die Seite mit Tabellenkante und Statistik.`,
        layout: "column",
        priority: 1,
      },
    ];
  }
  articles = articles.slice(0, TRETER_ARTICLE_LIMIT);
  const masthead = `${TRETER_MASTHEAD} · ${formatCalendarWeek(session.week)} · ${clubLabel}`;

  return {
    season: session.season,
    week: session.week,
    masthead,
    articles,
  };
}

/** @deprecated use buildTreterEdition */
export function buildKickerEdition(input: {
  history: readonly TransferRecord[];
  season: number;
  week: number;
  masterSeed: number;
  rivalPlayers: readonly Player[];
  worldClubs?: readonly WorldClub[];
}): TreterEdition {
  const stub = {
    season: input.season,
    week: input.week,
    weekday: 2,
    masterSeed: input.masterSeed,
    clubId: "",
    transferState: { history: [...input.history], pending_transfers: [], shortlist: [] },
    rivalPlayers: [...input.rivalPlayers],
    world: { clubs: input.worldClubs ?? [] },
    youthCamps: [],
    league: { player_club_id: "fc-nordstern", results: [], player_season_stats: [] },
    players: [],
    scoutBoard: { targets: {} },
    board: { pressure: 0, objectives: [], employer_club_id: "fc-nordstern", job_status: "employed", promotions_this_season: 0 },
    stadium: {},
    clubEvents: [],
  } as unknown as GameSession;
  return buildTreterEdition(stub);
}

export function aiTransfersForKickerWeek(
  history: readonly TransferRecord[],
  season: number,
  week: number,
  limit = 6,
): TransferRecord[] {
  return history
    .filter((record) => record.kind === "ai" && record.season === season && record.week === week)
    .slice(0, limit);
}
