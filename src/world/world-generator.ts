import { asTeamId, type TeamId } from "@fussballmanager/shared";
import { applyVeteranBackstory, peakCaBaseAdjustment } from "../player/veteran-backstory.ts";
import { seedPhaseStamps } from "../development/ability-stamps.ts";
import { estimateCa, marketValue } from "../transfers/market-value.ts";
import type { Attributes, Player, PlayerName, PositionPrimary } from "../types/player.ts";
import { deriveClubKitColors } from "./club-kit.ts";
import { realCityForWorldRegion } from "./real-cities.ts";
import { applyClubCameoPlayers, unionRendsburgClub } from "./world-cameos.ts";

export const WORLD_GENERATION_VERSION = 1;
export const CLUBS_PER_DIVISION = 18;
export const PLAYERS_PER_CLUB = 22;
export const GENERATED_CLUB_COUNT = CLUBS_PER_DIVISION * 2;
export const GENERATED_PLAYER_COUNT = GENERATED_CLUB_COUNT * PLAYERS_PER_CLUB;
export const NORDSTERN_TEAM_ID: TeamId = asTeamId("fc-nordstern");
export const NORDSTERN_CLUB_ID = "cl_fc_nordstern";

export type WorldDivisionId = "regionalliga-nord" | "oberliga-nord";
export type ClubIdentity =
  | "community"
  | "workers"
  | "academy"
  | "traditional"
  | "ambitious";

export interface WorldClub {
  id: string;
  name: string;
  short_name: string;
  /** Real-world city label (WGS84 catalog in `real-cities.ts`). */
  place: string;
  region: string;
  division_id: WorldDivisionId;
  identity: ClubIdentity;
  reputation: number;
  rivalry_ids: string[];
  /** PRD 26 — home shirt color on bust portraits (+ secondary for future crest/away). */
  kit: {
    primary: string;
    secondary: string;
  };
}

export interface WorldState {
  generation_version: 0 | typeof WORLD_GENERATION_VERSION;
  /** Roster seed — squads, talents, ids. Equals the save's master seed. */
  world_seed: number;
  /** Club layer seed (names, ids, divisions); absent = same as world_seed. */
  club_seed?: number;
  clubs: WorldClub[];
}

/**
 * Production club layer: every career plays the same 36 clubs (names, ids, divisions), so
 * module-level club lookups stay valid; the save's master seed only varies the rosters.
 */
export const WORLD_CLUB_SEED = 2026;

export interface GeneratedWorld extends WorldState {
  generation_version: typeof WORLD_GENERATION_VERSION;
  league_pools: Record<WorldDivisionId, string[]>;
  players: Player[];
}

const CLUB_PREFIXES = [
  "FC",
  "VfB",
  "TSV",
  "SV",
  "Union",
  "Eintracht",
  "Fortuna",
  "SC",
] as const;

const CLUB_SUFFIXES = ["", "", "", "04", "1912", "Nord", "Hafen"] as const;

const PLACES = [
  "Auenhafen",
  "Birkenwatt",
  "Bramstedt",
  "Deichholm",
  "Dünenrade",
  "Eichenkoog",
  "Elmsbrook",
  "Falkenwerder",
  "Föhrensiel",
  "Geesthagen",
  "Hafenstedt",
  "Heidebrück",
  "Holmenrade",
  "Kanalstedt",
  "Kiefernau",
  "Kronswatt",
  "Marschhude",
  "Möwenhagen",
  "Norderfleet",
  "Nordhain",
  "Osterkoog",
  "Regenbrook",
  "Rosenfleet",
  "Salzwiek",
  "Schleiholm",
  "Seedorf",
  "Steenbek",
  "Sturmhaven",
  "Süderkoog",
  "Tannensiel",
  "Uhlenfleet",
  "Waldhude",
  "Wellenrade",
  "Westerhagen",
  "Wiesensiel",
  "Windholm",
  "Wulfsbek",
  "Ziegelhafen",
  "Finkenmarsch",
  "Küstenrade",
] as const;

const REGIONS = [
  "Nordküste",
  "Elbmarsch",
  "Heideland",
  "Fördeküste",
  "Moorland",
  "Hansebogen",
] as const;

const IDENTITIES: readonly ClubIdentity[] = [
  "community",
  "workers",
  "academy",
  "traditional",
  "ambitious",
];

const FIRST_NAMES = [
  "Aaron",
  "Adrian",
  "Anton",
  "Arne",
  "Bennet",
  "Can",
  "David",
  "Elias",
  "Emil",
  "Erik",
  "Fabian",
  "Felix",
  "Finn",
  "Florian",
  "Hannes",
  "Henrik",
  "Jakob",
  "Jan",
  "Jannik",
  "Jonas",
  "Julian",
  "Kai",
  "Lars",
  "Leon",
  "Levin",
  "Liam",
  "Luca",
  "Luis",
  "Mads",
  "Marek",
  "Mats",
  "Max",
  "Mika",
  "Moritz",
  "Nico",
  "Noah",
  "Oskar",
  "Paul",
  "Sven",
  "Theo",
  "Adam",
  "Alexander",
  "Ali",
  "Amir",
  "Andrej",
  "Bastian",
  "Bilal",
  "Bruno",
  "Cem",
  "Christian",
  "Daniel",
  "Deniz",
  "Dominik",
  "Edin",
  "Enno",
  "Fiete",
  "Frederik",
  "Georg",
  "Gerrit",
  "Hamza",
  "Hauke",
  "Ibrahim",
  "Ilja",
  "Jasper",
  "Jens",
  "Joost",
  "Karim",
  "Kevin",
  "Kilian",
  "Leandro",
  "Lennard",
  "Linus",
  "Malik",
  "Marcel",
  "Marvin",
  "Mattis",
  "Mehmet",
  "Milan",
  "Mohamed",
  "Nils",
  "Ole",
  "Pascal",
  "Patrick",
  "Philipp",
  "Rafael",
  "Robin",
  "Samir",
  "Simon",
  "Tarek",
  "Thies",
  "Tim",
  "Timo",
  "Tom",
  "Yannik",
  "Yusuf",
] as const;

const LAST_NAMES = [
  "Ahlers",
  "Becker",
  "Bergmann",
  "Brandt",
  "Braun",
  "Bruns",
  "Ehlers",
  "Fischer",
  "Franke",
  "Grabow",
  "Hansen",
  "Harms",
  "Hein",
  "Hoffmann",
  "Jansen",
  "Klein",
  "Koch",
  "Krause",
  "Kröger",
  "Kruse",
  "Lenz",
  "Martens",
  "Meyer",
  "Möller",
  "Neumann",
  "Pape",
  "Peters",
  "Reimers",
  "Richter",
  "Rohde",
  "Schmidt",
  "Schneider",
  "Schröder",
  "Schulz",
  "Schwarz",
  "Steen",
  "Thomsen",
  "Voss",
  "Wagner",
  "Weber",
  "Wessel",
  "Witt",
  "Wolff",
  "Zimmermann",
  "Abraham",
  "Aksoy",
  "Albrecht",
  "Arslan",
  "Aydin",
  "Bachmann",
  "Bartels",
  "Bauer",
  "Behrens",
  "Bender",
  "Berger",
  "Böhm",
  "Böttcher",
  "Çelik",
  "Dahl",
  "Demir",
  "Dietrich",
  "Engel",
  "Franz",
  "Friedrich",
  "Gärtner",
  "Gerber",
  "Götz",
  "Grimm",
  "Güler",
  "Günther",
  "Hartmann",
  "Henning",
  "Jürgens",
  "Kaya",
  "Keller",
  "König",
  "Kramer",
  "Kühn",
  "Lorenz",
  "Lüders",
  "Maier",
  "Meier",
  "Nowak",
  "Öztürk",
  "Pohl",
  "Reuter",
  "Sahin",
  "Schäfer",
  "Schreiber",
  "Seidel",
  "Sommer",
  "Thiel",
  "Ulrich",
  "Voigt",
  "Walter",
  "Werner",
  "Yilmaz",
  "Zander",
  "Ziegler",
] as const;

const ROSTER_POSITIONS = [
  "GK",
  "GK",
  "CB",
  "CB",
  "CB",
  "CB",
  "LB",
  "RB",
  "LB",
  "RB",
  "DM",
  "CM",
  "CM",
  "CM",
  "AM",
  "AM",
  "LW",
  "RW",
  "RM",
  "CF",
  "CF",
  "CF",
] as const satisfies readonly PositionPrimary[];

const ATTRIBUTE_KEYS = [
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
] as const satisfies readonly (keyof Attributes)[];

const POSITION_BONUSES: Record<PositionPrimary, Partial<Record<keyof Attributes, number>>> = {
  GK: { gk_handling: 38, concentration: 14, positioning: 16, shooting: -42, dribbling: -26 },
  CB: { positioning: 20, strength: 18, concentration: 14, shooting: -24, dribbling: -14, pace: -6 },
  LB: { pace: 18, stamina: 16, passing: 9, positioning: 8, shooting: -14 },
  RB: { pace: 18, stamina: 16, passing: 9, positioning: 8, shooting: -14 },
  DM: { positioning: 16, passing: 14, teamwork: 14, strength: 9, shooting: -10, dribbling: -6 },
  CM: { passing: 18, vision: 16, stamina: 12, teamwork: 12 },
  AM: { vision: 20, technique: 18, passing: 14, dribbling: 12, positioning: -8 },
  LM: { pace: 16, dribbling: 14, passing: 10, stamina: 9 },
  RM: { pace: 16, dribbling: 14, passing: 10, stamina: 9 },
  LW: { pace: 22, dribbling: 20, technique: 12, strength: -14 },
  RW: { pace: 22, dribbling: 20, technique: 12, strength: -14 },
  CF: { shooting: 24, composure: 18, positioning: 16, strength: 9, passing: -12 },
};

/**
 * Generate the complete M1 starting world. This function is pure: callers
 * persist its output and never regenerate an existing save on load.
 */
/** `clubSeed` defaults to `masterSeed` (fully seeded world); careers pass {@link WORLD_CLUB_SEED}. */
export function generateWorld(masterSeed: number, clubSeed = masterSeed): GeneratedWorld {
  if (!Number.isSafeInteger(masterSeed) || !Number.isSafeInteger(clubSeed)) {
    throw new Error("World seed must be a safe integer");
  }

  const clubs = generateClubs(clubSeed);
  const league_pools = divisionPools(clubs);
  const players = clubs.flatMap((club, clubIndex) =>
    generateClubRoster(masterSeed, club, clubIndex),
  );

  return {
    generation_version: WORLD_GENERATION_VERSION,
    world_seed: masterSeed,
    ...(clubSeed !== masterSeed ? { club_seed: clubSeed } : {}),
    clubs,
    league_pools,
    players,
  };
}

export function persistedWorldState(world: GeneratedWorld): WorldState {
  return {
    generation_version: world.generation_version,
    world_seed: world.world_seed,
    ...(world.club_seed !== undefined ? { club_seed: world.club_seed } : {}),
    clubs: world.clubs,
  };
}

export function legacyWorldState(masterSeed: number): WorldState {
  return {
    generation_version: 0,
    world_seed: masterSeed,
    clubs: [],
  };
}

function clubShortNameFromPlace(place: string, used: Set<string>, index: number): string {
  const letters = place.replace(/[^a-zA-ZäöüÄÖÜß]/g, "");
  let base = letters.slice(0, 3).toUpperCase();
  if (base.length < 3) {
    base = `C${String(index + 1).padStart(2, "0")}`;
  }
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 2)}${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function generateClubs(masterSeed: number): WorldClub[] {
  const regionOrder = shuffled(REGIONS, deriveWorldSeed(masterSeed, "club-regions", 0));
  const regionPickIndex = new Map<string, number>();
  const clubs: WorldClub[] = [];
  const usedShortNames = new Set<string>(["NOR"]);

  for (let index = 0; index < GENERATED_CLUB_COUNT; index++) {
    const division_id: WorldDivisionId =
      index < CLUBS_PER_DIVISION ? "regionalliga-nord" : "oberliga-nord";

    if (index === 0) {
      clubs.push({
        id: NORDSTERN_TEAM_ID,
        name: "Kieler FC",
        short_name: "KFC",
        place: "Kiel",
        region: "Fördeküste",
        division_id,
        identity: "community",
        reputation: 35,
        rivalry_ids: [],
        kit: deriveClubKitColors(masterSeed, NORDSTERN_TEAM_ID, index),
      });
      continue;
    }

    if (index === CLUBS_PER_DIVISION) {
      usedShortNames.add("URD");
      clubs.push(unionRendsburgClub(masterSeed, index));
      continue;
    }

    const random = mulberry32(deriveWorldSeed(masterSeed, "club", index));
    const region = regionOrder[(index - 1) % regionOrder.length] ?? "Fördeküste";
    const regionIndex = regionPickIndex.get(region) ?? 0;
    regionPickIndex.set(region, regionIndex + 1);
    let city = realCityForWorldRegion(region, regionIndex);
    if (city?.name === "Rendsburg") {
      city = undefined;
    }
    const place = city?.name ?? PLACES[(index - 1) % PLACES.length] ?? `Nordort ${index}`;
    const prefix = pick(CLUB_PREFIXES, random);
    const suffix = pick(CLUB_SUFFIXES, random);
    const idHash = deriveWorldSeed(masterSeed, "club-id", index).toString(16).padStart(8, "0");
    const reputationBase = division_id === "regionalliga-nord" ? 40 : 24;

    const teamId = `world-${idHash}-${index}`;
    clubs.push({
      id: teamId,
      name: `${prefix} ${place}${suffix ? ` ${suffix}` : ""}`,
      short_name: clubShortNameFromPlace(place, usedShortNames, index),
      place,
      region,
      division_id,
      identity: pick(IDENTITIES, random),
      reputation: reputationBase + Math.floor(random() * 21),
      rivalry_ids: [],
      kit: deriveClubKitColors(masterSeed, teamId, index),
    });
  }

  return assignLocalRivalries(clubs);
}

export function generateClubRoster(
  masterSeed: number,
  club: WorldClub,
  clubIndex: number,
): Player[] {
  const clubStrength = startingClubStrength(masterSeed, club, clubIndex);
  const ageSlots = shuffled(
    Array.from({ length: PLAYERS_PER_CLUB }, (_, index) => index),
    deriveWorldSeed(masterSeed, "roster-age-order", clubIndex),
  );
  const roster = ROSTER_POSITIONS.map((position, playerIndex) =>
    generateProfessional(
      masterSeed,
      club,
      clubIndex,
      playerIndex,
      position,
      clubStrength,
      ageSlots[playerIndex] ?? playerIndex,
    ),
  );
  return applyClubCameoPlayers(roster, club, masterSeed, clubIndex);
}

export function deriveWorldSeed(
  masterSeed: number,
  entityKind: string,
  stableIndex: number,
): number {
  let hash = 0x811c9dc5;
  const input = `${masterSeed}:${WORLD_GENERATION_VERSION}:${entityKind}:${stableIndex}`;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function assignLocalRivalries(clubs: readonly WorldClub[]): WorldClub[] {
  return clubs.map((club) => {
    const sameDivision = clubs.filter(
      (candidate) =>
        candidate.id !== club.id &&
        candidate.division_id === club.division_id &&
        candidate.region === club.region,
    );
    const divisionFallback = clubs.filter(
      (candidate) => candidate.id !== club.id && candidate.division_id === club.division_id,
    );
    const candidates = sameDivision.length > 0 ? sameDivision : divisionFallback;
    const sorted = [...candidates].sort((left, right) => left.id.localeCompare(right.id));
    return { ...club, rivalry_ids: sorted.slice(0, 2).map((candidate) => candidate.id) };
  });
}

function divisionPools(clubs: readonly WorldClub[]): Record<WorldDivisionId, string[]> {
  return {
    "regionalliga-nord": clubs
      .filter((club) => club.division_id === "regionalliga-nord")
      .map((club) => club.id),
    "oberliga-nord": clubs
      .filter((club) => club.division_id === "oberliga-nord")
      .map((club) => club.id),
  };
}

/** Club strength the roster was generated at (attribute base scale). */
export function startingClubStrength(masterSeed: number, club: WorldClub, clubIndex: number): number {
  if (club.id === NORDSTERN_TEAM_ID) return 68.5;
  if (club.name === "Union Rendsburg") return 71;
  const random = mulberry32(deriveWorldSeed(masterSeed, "club-strength", clubIndex));
  if (club.division_id === "oberliga-nord") return 60 + random() * 14;
  // Three nearby survival rivals keep the underdog start difficult but playable.
  if (clubIndex <= 3) return 69.5 + random() * 2;
  return 78 + random() * 5;
}

function generateProfessional(
  masterSeed: number,
  club: WorldClub,
  clubIndex: number,
  playerIndex: number,
  position: PositionPrimary,
  clubStrength: number,
  ageSlot: number,
): Player {
  const stableIndex = clubIndex * PLAYERS_PER_CLUB + playerIndex;
  const random = mulberry32(deriveWorldSeed(masterSeed, "player", stableIndex));
  const age = rosterAge(ageSlot, random);
  const player = buildGeneratedPro({
    id: generatedPlayerId(masterSeed, stableIndex),
    name: generatedPlayerName(masterSeed, stableIndex),
    club,
    position,
    clubStrength,
    age,
    birthYearAnchor: 2026,
    joinedSeason: 1,
    contractFromSeason: 1,
    starter: playerIndex < 11,
    random,
    hiddenRandom: mulberry32(deriveWorldSeed(masterSeed, "player-hidden", stableIndex)),
    contractRandom: mulberry32(deriveWorldSeed(masterSeed, "contract", stableIndex)),
    portraitSeed: deriveWorldSeed(masterSeed, "portrait", stableIndex),
  });
  const withStory = applyVeteranBackstory(
    player,
    deriveWorldSeed(masterSeed, "veteran-backstory", stableIndex),
  );
  return seedPhaseStamps(withStory, 1, 1);
}

interface GeneratedProSpec {
  id: string;
  name: PlayerName;
  club: WorldClub;
  position: PositionPrimary;
  clubStrength: number;
  age: number;
  /** Calendar year the age is counted from (2026 = season 1). */
  birthYearAnchor: number;
  joinedSeason: number;
  /** Contract length is drawn from this season on (`+1…+4`). */
  contractFromSeason: number;
  starter: boolean;
  random: () => number;
  hiddenRandom: () => number;
  contractRandom: () => number;
  portraitSeed: number;
}

/** One professional from seeded streams; draw order is fixed (existing worlds must not change). */
function buildGeneratedPro(spec: GeneratedProSpec): Player {
  const { club, position, age, random, hiddenRandom, contractRandom } = spec;
  const playerBase = spec.clubStrength + sampleStandardNormal(random) * 6 + peakCaBaseAdjustment(age);
  const attributes = generateAttributes(position, playerBase, random);
  const ca = estimateCa(attributes, position);
  const contractYears = 1 + Math.floor(contractRandom() * 4);
  const untilSeason = spec.contractFromSeason + contractYears;
  const wage = Math.max(
    250,
    Math.round((350 + Math.pow(Math.max(30, ca) / 60, 3.1) * 700) / 25) * 25,
  );
  const value = marketValue({
    ca,
    age,
    monthsRemaining: contractYears * 12,
    wage,
    marketWage: wage,
    demandFactor: 1,
    reputationFactor: 1,
  });

  return {
    id: spec.id,
    name: spec.name,
    birth: {
      date: birthDate(age, random, spec.birthYearAnchor),
      place: club.region,
      region: club.region,
    },
    nationality: "DE",
    age,
    club_id: worldCareerClubId(club.id),
    squad_status: "pro",
    position,
    flexibility: secondaryPositions(position, random),
    contract: {
      wage_weekly: wage,
      bonus_goal: position === "CF" ? Math.round(wage * 0.2) : Math.round(wage * 0.08),
      bonus_appearance: Math.round(wage * 0.1),
      until_season: untilSeason,
      guaranteed_minutes_promise: spec.starter ? "starter" : "rotation",
    },
    market_value: value,
    attributes,
    hidden: {
      anlage: Object.fromEntries(
        ATTRIBUTE_KEYS.map((key) => [key, 0.85 + hiddenRandom() * 0.65]),
      ) as Player["hidden"]["anlage"],
      drive: sampleTriangular(0.6, 1, 1.5, hiddenRandom),
      maturity_offset: Math.max(
        -5,
        Math.min(5, Math.round((hiddenRandom() + hiddenRandom() - 1) * 5)),
      ),
      breakout_flags: [],
    },
    state: {
      fitness: 88 + Math.floor(random() * 13),
      injury: null,
      form: 0,
      morale: 55 + Math.floor(random() * 31),
      weekly_minutes: 0,
      season_minutes: 0,
      season_apps: 0,
      season_goals: 0,
      season_assists: 0,
      season_yellow_cards: 0,
      season_tackles: 0,
      season_headers: 0,
      recent_growth_26w: 0,
      recent_weekly_minutes: [],
      modifiers: [],
    },
    history: {
      growth: [],
      clubs: [
        {
          club_id: worldCareerClubId(club.id),
          from_season: spec.joinedSeason,
          to_season: null,
          apps: 0,
          goals: 0,
        },
      ],
      achievements: [],
      milestones: [],
    },
    stamps: [],
    portrait_seed: spec.portraitSeed,
  };
}

export interface JourneymanSpec {
  /** Season the player joins at its end (contracts start the season after). */
  season: number;
  /** Stable index of the club in `world.clubs` (or the sorted club list). */
  clubIndex: number;
  /** Running number of this club's new players this season end. */
  slot: number;
  position: PositionPrimary;
  /** Same scale as the generator's club strength ({@link startingClubStrength}). */
  clubStrength: number;
  /** Age in the ending season; season-end aging adds the year after. */
  age: number;
}

/**
 * PRD 31 — new id namespace for players created after world generation
 * (AI youth, roster refill): `pl_s<season>c<club>n<slot>`. Never collides with
 * the five-digit generated or academy ids.
 */
export function laterPlayerId(season: number, clubIndex: number, slot: number): string {
  return `pl_s${season}c${clubIndex}n${slot}`;
}

/** PRD 31 — refill professional for an AI club; seeds never touch existing entities. */
export function generateJourneyman(masterSeed: number, club: WorldClub, spec: JourneymanSpec): Player {
  const key = `journeyman:${spec.season}:${spec.clubIndex}`;
  const random = mulberry32(deriveWorldSeed(masterSeed, key, spec.slot));
  const nameRandom = mulberry32(deriveWorldSeed(masterSeed, `${key}:name`, spec.slot));
  const player = buildGeneratedPro({
    id: laterPlayerId(spec.season, spec.clubIndex, spec.slot),
    name: { first: pick(FIRST_NAMES, nameRandom), last: pick(LAST_NAMES, nameRandom) },
    club,
    position: spec.position,
    clubStrength: spec.clubStrength,
    age: spec.age,
    birthYearAnchor: 2025 + spec.season,
    joinedSeason: spec.season + 1,
    contractFromSeason: spec.season,
    starter: false,
    random,
    hiddenRandom: mulberry32(deriveWorldSeed(masterSeed, `${key}:hidden`, spec.slot)),
    contractRandom: mulberry32(deriveWorldSeed(masterSeed, `${key}:contract`, spec.slot)),
    portraitSeed: deriveWorldSeed(masterSeed, `${key}:portrait`, spec.slot),
  });
  return seedPhaseStamps(player, spec.season + 1, 1);
}

function generateAttributes(
  position: PositionPrimary,
  base: number,
  random: () => number,
): Attributes {
  const bonuses = POSITION_BONUSES[position];
  return Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => {
      const weakFootAdjustment = key === "weak_foot" ? -25 : 0;
      const nonKeeperHandling = key === "gk_handling" && position !== "GK" ? -58 : 0;
      const raw =
        base +
        (bonuses[key] ?? 0) +
        weakFootAdjustment +
        nonKeeperHandling +
        sampleStandardNormal(random) * 12;
      const value = clampAttribute(Math.round(raw));
      return [key, key === "weak_foot" ? Math.min(100, value) : value];
    }),
  ) as unknown as Attributes;
}

function rosterAge(ageSlot: number, random: () => number): number {
  if (ageSlot < 5) return 18 + Math.floor(random() * 4);
  if (ageSlot < 15) return 22 + Math.floor(random() * 6);
  if (ageSlot < 20) return 28 + Math.floor(random() * 5);
  return 33 + Math.floor(random() * 4);
}

function birthDate(age: number, random: () => number, anchorYear = 2026): string {
  const year = anchorYear - age;
  const month = 1 + Math.floor(random() * 12);
  const day = 1 + Math.floor(random() * 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generatedPlayerName(masterSeed: number, stableIndex: number): PlayerName {
  const random = mulberry32(deriveWorldSeed(masterSeed, "player-name", stableIndex));
  return {
    first: pick(FIRST_NAMES, random),
    last: pick(LAST_NAMES, random),
  };
}

function generatedPlayerId(masterSeed: number, stableIndex: number): string {
  const base = deriveWorldSeed(masterSeed, "player-id-base", 0) % 100_000;
  // 7,919 is coprime with 100,000, so every stable index maps to a unique id.
  const numericId = (base + stableIndex * 7_919) % 100_000;
  return `pl_${String(numericId).padStart(5, "0")}`;
}

export function worldCareerClubId(teamId: string): string {
  return `cl_${teamId.replace(/-/g, "_")}`;
}

function secondaryPositions(
  position: PositionPrimary,
  random: () => number,
): Player["flexibility"] {
  if (random() >= 0.35) return [];
  const alternatives: Partial<Record<PositionPrimary, PositionPrimary>> = {
    CB: "DM",
    LB: "LM",
    RB: "RM",
    DM: "CM",
    CM: "AM",
    AM: "CM",
    LM: "LW",
    RM: "RW",
    LW: "RW",
    RW: "LW",
    CF: "AM",
  };
  const trained_as = alternatives[position];
  return trained_as
    ? [{ trained_as, proficiency: 0.35 + random() * 0.5, weeks_trained: 0 }]
    : [];
}

function sampleTriangular(
  min: number,
  mode: number,
  max: number,
  random: () => number,
): number {
  const draw = random();
  const split = (mode - min) / (max - min);
  if (draw < split) return min + Math.sqrt(draw * (max - min) * (mode - min));
  return max - Math.sqrt((1 - draw) * (max - min) * (max - mode));
}

function sampleStandardNormal(random: () => number): number {
  let first = 0;
  let second = 0;
  while (first === 0) first = random();
  while (second === 0) second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function shuffled<T>(values: readonly T[], seed: number): T[] {
  const result = [...values];
  const random = mulberry32(seed);
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

function pick<T>(values: readonly T[], random: () => number): T {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) throw new Error("Cannot pick from an empty collection");
  return value;
}

function clampAttribute(value: number): number {
  return Math.min(199, Math.max(0, value));
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
