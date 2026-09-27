import type { FormationId } from "./formations.ts";
import { asTeamId, type TeamId } from "./ids.ts";
import type { Team } from "./player.ts";
import type { Squad } from "./squad.ts";
import type { TeamTactics } from "./tactics.ts";
import { FORMATION_PRESETS } from "./tactics.ts";
import { fillSquad } from "./seed-clubs.ts";

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
    fluidity: preset.fluidity,
    keeperDuty: preset.keeperDuty,
    fullbackDuty: preset.fullbackDuty,
    dmDuty: preset.dmDuty,
    cmDuty: preset.cmDuty,
    wideDuty: preset.wideDuty,
    strikerDuty: preset.strikerDuty,
  };
}

const altenbruchTeam = club("sv-altenbruch", "SV Altenbruch", "ALT");
const brookfeldTeam = club("fc-brookfeld", "FC Brookfeld", "BRK");
const deichhausenTeam = club("tsg-deichhausen", "TSG Deichhausen", "DEI");
const hafenlohTeam = club("sc-hafenloh", "SC Hafenloh", "HAF");
const marschdorfTeam = club("vfr-marschdorf", "VfR Marschdorf", "MAR");
const wiesmoorTeam = club("spvgg-wiesmoor", "SpVgg Wiesmoor", "WIE");

export const altenbruchSquad: Squad = fillSquad({
  team: altenbruchTeam,
  prefix: "alt",
  tactics: tactics(altenbruchTeam.id, "4-4-2", {
    mentality: 40,
    width: 44,
    tempo: 38,
    marking: "man",
  }),
  skillShift: -10,
  names: [
    "Uwe Dierks",
    "Ralf Koop",
    "Heiko Lange",
    "Bernd Mohr",
    "Jens Plath",
    "Marco Rehder",
    "Sven Sander",
    "Dirk Thies",
    "Andre Ubben",
    "Maik Voss",
    "Torben Wulf",
    "Peter Ahrens",
    "Olaf Bode",
    "Gerd Clausen",
    "Holger Dose",
    "Kai Ehlers",
    "Nico Fock",
    "Jan-Ole Grote",
  ],
});

export const brookfeldSquad: Squad = fillSquad({
  team: brookfeldTeam,
  prefix: "brk",
  tactics: tactics(brookfeldTeam.id, "4-3-3", {
    mentality: 46,
    width: 52,
    tempo: 44,
    marking: "zonal",
  }),
  skillShift: -8,
  names: [
    "Mika Behrens",
    "Luis Claus",
    "Jonas Dierks",
    "Finn Ehlers",
    "Theo Fock",
    "Emile Grote",
    "Levi Harms",
    "Noel Heuer",
    "Jaro Holst",
    "Mats Jansen",
    "Kian Kroger",
    "Bennet Lange",
    "Tjark Mohr",
    "Hannes Plath",
    "Ole Rehder",
    "Milan Sander",
    "Soren Thies",
    "Keno Ubben",
  ],
});

export const deichhausenSquad: Squad = fillSquad({
  team: deichhausenTeam,
  prefix: "dei",
  tactics: tactics(deichhausenTeam.id, "4-4-2", {
    mentality: 38,
    width: 42,
    tempo: 36,
    marking: "man",
  }),
  skillShift: -12,
  names: [
    "Hinrich Ahrens",
    "Onno Bode",
    "Folkert Clausen",
    "Enno Dose",
    "Tammo Ehlers",
    "Gerrit Fock",
    "Harm Grote",
    "Luder Harms",
    "Sonke Heuer",
    "Meinert Holst",
    "Aiko Jansen",
    "Rolf Kroger",
    "Johann Lange",
    "Heiko Mohr",
    "Wilke Plath",
    "Ede Rehder",
    "Fokko Sander",
    "Berend Thies",
  ],
});

export const hafenlohSquad: Squad = fillSquad({
  team: hafenlohTeam,
  prefix: "haf",
  tactics: tactics(hafenlohTeam.id, "4-3-3", {
    mentality: 44,
    width: 50,
    tempo: 42,
    marking: "zonal",
  }),
  skillShift: -9,
  names: [
    "Lars Ubben",
    "Tim Voss",
    "Pascal Wulf",
    "Kevin Ahrens",
    "Dennis Bode",
    "Patrick Clausen",
    "Christian Dose",
    "Michael Ehlers",
    "Stefan Fock",
    "Daniel Grote",
    "Andreas Harms",
    "Martin Heuer",
    "Tobias Holst",
    "Benjamin Jansen",
    "Sebastian Kroger",
    "Florian Lange",
    "Alexander Mohr",
    "Christoph Plath",
  ],
});

export const marschdorfSquad: Squad = fillSquad({
  team: marschdorfTeam,
  prefix: "mar",
  tactics: tactics(marschdorfTeam.id, "2-3-5", {
    mentality: 52,
    width: 58,
    tempo: 40,
    marking: "zonal",
  }),
  skillShift: -7,
  names: [
    "Hinrich Rehder",
    "Onno Sander",
    "Folkert Thies",
    "Enno Ubben",
    "Tammo Voss",
    "Gerrit Wulf",
    "Harm Ahrens",
    "Luder Bode",
    "Sonke Clausen",
    "Meinert Dose",
    "Aiko Ehlers",
    "Rolf Fock",
    "Johann Grote",
    "Heiko Harms",
    "Wilke Heuer",
    "Ede Holst",
    "Fokko Jansen",
    "Berend Kroger",
  ],
});

export const wiesmoorSquad: Squad = fillSquad({
  team: wiesmoorTeam,
  prefix: "wie",
  tactics: tactics(wiesmoorTeam.id, "4-4-2", {
    mentality: 36,
    width: 40,
    tempo: 34,
    marking: "man",
  }),
  skillShift: -11,
  names: [
    "Lars Lange",
    "Tim Mohr",
    "Pascal Plath",
    "Kevin Rehder",
    "Dennis Sander",
    "Patrick Thies",
    "Christian Ubben",
    "Michael Voss",
    "Stefan Wulf",
    "Daniel Ahrens",
    "Andreas Bode",
    "Martin Clausen",
    "Tobias Dose",
    "Benjamin Ehlers",
    "Sebastian Fock",
    "Florian Grote",
    "Alexander Harms",
    "Christoph Heuer",
  ],
});

/** Six-club Oberliga Nord — promotion pool below Regionalliga Nord. */
export const SEED_OBERLIGA: readonly Squad[] = [
  marschdorfSquad,
  brookfeldSquad,
  hafenlohSquad,
  altenbruchSquad,
  wiesmoorSquad,
  deichhausenSquad,
];
