import type { FormationId } from "./formations.ts";
import { asTeamId, type TeamId } from "./ids.ts";
import type { Team } from "./player.ts";
import type { Squad } from "./squad.ts";
import type { TeamTactics } from "./tactics.ts";
import { FORMATION_PRESETS } from "./tactics.ts";
import {
  fillSquad,
  nordsternSquad,
  rheinwachtSquad,
} from "./seed-clubs.ts";

function club(id: string, name: string, shortName: string): Team {
  return { id: asTeamId(id), name, shortName };
}

function tactics(
  teamId: TeamId,
  formation: FormationId,
  extras: {
    mentality: number;
    width: number;
    tempo: number;
    marking: TeamTactics["marking"];
  },
): TeamTactics {
  const preset = FORMATION_PRESETS[formation];
  return {
    teamId,
    formation,
    mentality: extras.mentality,
    width: extras.width,
    tempo: extras.tempo,
    marking: extras.marking,
    pressing: preset.pressing,
    lineHeight: preset.lineHeight,
    intensity: preset.intensity,
    keeperDuty: preset.keeperDuty,
    fullbackDuty: preset.fullbackDuty,
    dmDuty: preset.dmDuty,
    cmDuty: preset.cmDuty,
    wideDuty: preset.wideDuty,
    strikerDuty: preset.strikerDuty,
  };
}

const holzwegTeam = club("tsv-holzweg", "TSV Holzweg", "HOL");
const elbstrandTeam = club("union-elbstrand", "Union Elbstrand", "ELB");
const moorsielTeam = club("vfb-moorsiel", "VfB Moorsiel", "MOO");
const kuestenholzTeam = club("spvgg-kuestenholz", "SpVgg Küstenholz", "KUS");

export const holzwegSquad: Squad = fillSquad({
  team: holzwegTeam,
  prefix: "holz",
  tactics: tactics(holzwegTeam.id, "4-4-2", {
    mentality: 42,
    width: 46,
    tempo: 40,
    marking: "man",
  }),
  skillShift: -4,
  names: [
    "Uwe Grabow",
    "Ralf Steen",
    "Heiko Voss",
    "Bernd Luttmann",
    "Jens Pape",
    "Marco Ehlers",
    "Sven Rohde",
    "Dirk Wessel",
    "Andre Kuhl",
    "Maik Schutt",
    "Torben Harms",
    "Peter Kruse",
    "Olaf Meine",
    "Gerd Timm",
    "Holger Sass",
    "Kai Lembke",
    "Nico Bruns",
    "Jan-Ole Wrede",
  ],
});

export const elbstrandSquad: Squad = fillSquad({
  team: elbstrandTeam,
  prefix: "elb",
  tactics: tactics(elbstrandTeam.id, "4-3-3", {
    mentality: 54,
    width: 60,
    tempo: 55,
    marking: "zonal",
  }),
  skillShift: 1,
  names: [
    "Mika Senne",
    "Luis Habben",
    "Jonas Witt",
    "Finn Reimers",
    "Theo Caspers",
    "Emile Daud",
    "Levi Timmermann",
    "Noel Habermann",
    "Jaro Steen",
    "Mats Eldagsen",
    "Kian Fock",
    "Bennet Rabe",
    "Tjark Wohlers",
    "Hannes Luhrs",
    "Ole Carstens",
    "Milan Gatje",
    "Soren Eicke",
    "Keno Bruns",
  ],
});

export const moorsielSquad: Squad = fillSquad({
  team: moorsielTeam,
  prefix: "moor",
  tactics: tactics(moorsielTeam.id, "2-3-5", {
    mentality: 60,
    width: 68,
    tempo: 48,
    marking: "zonal",
  }),
  skillShift: -1,
  names: [
    "Hinrich Eilers",
    "Onno Janssen",
    "Folkert Ubben",
    "Enno Schmidt",
    "Tammo de Vries",
    "Gerrit Wilken",
    "Harm Sievers",
    "Luder Kroger",
    "Sonke Buss",
    "Meinert Claassen",
    "Aiko Poppinga",
    "Rolf Habbena",
    "Johann Ehmen",
    "Heiko Saathoff",
    "Wilke Focken",
    "Ede Swyter",
    "Fokko Itjeshorst",
    "Berend Albers",
  ],
});

export const kuestenholzSquad: Squad = fillSquad({
  team: kuestenholzTeam,
  prefix: "kust",
  tactics: tactics(kuestenholzTeam.id, "4-4-2", {
    mentality: 50,
    width: 52,
    tempo: 46,
    marking: "man",
  }),
  skillShift: -2,
  names: [
    "Lars Buchholz",
    "Tim Overbeck",
    "Pascal Wiese",
    "Kevin Dunker",
    "Dennis Krohn",
    "Patrick Evers",
    "Christian Tiede",
    "Michael Ahrens",
    "Stefan Cohrs",
    "Daniel Wede",
    "Andreas Riedel",
    "Martin Geist",
    "Tobias Kahle",
    "Benjamin Flohr",
    "Sebastian Dettmer",
    "Florian Kuhlmann",
    "Alexander Buss",
    "Christoph Niemann",
  ],
});

/** Six-club Regionalliga Nord. Nordstern is the human club in persisted fixtures. */
export const SEED_DIVISION: readonly Squad[] = [
  nordsternSquad,
  rheinwachtSquad,
  holzwegSquad,
  elbstrandSquad,
  moorsielSquad,
  kuestenholzSquad,
];
