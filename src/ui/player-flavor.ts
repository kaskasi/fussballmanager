import type { Player } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel, roundStat } from "../types/player-display.ts";
import { attributeLabel, profileAttributeKeys } from "./player-profile.ts";
import { careerSeasonStats } from "../player/season-stats.ts";
import { defaultYouthContract } from "../player/youth-contract.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutReveal } from "../scouting/scout-visibility.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";

export type FlavorTraitTone = "positive" | "negative" | "neutral";

export interface FlavorTrait {
  label: string;
  tone: FlavorTraitTone;
}

export interface PlayerFlavor {
  headline: string;
  body: string;
  traits: FlavorTrait[];
}

export interface SeasonStatsStub {
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  rating: string;
}

export interface ContractView {
  status: string;
  wageWeekly: string;
  untilSeason: string;
  clauses: string[];
  minutesPromise: string;
}

const HEADLINES = [
  "Ruhiges Auftreten, laute Wirkung",
  "Rohdiamant mit Tempo im Gepäck",
  "Kopf oben, Ball sicher",
  "Arbeitstier mit Spielintelligenz",
  "Unbekannt, aber interessant",
  "Talent mit Fragezeichen",
] as const;

const BODIES = [
  "Scouts beschreiben {name} als Spieler, der in {region} aufgewachsen ist und dort schon früh auffiel.",
  "In der {position}-Rolle wirkt {name} wachgerümt — vor allem wenn der Ball schnell läuft.",
  "{name} gilt in {region} als einer, der Training ernst nimmt und im Teamgefüge mitwächst.",
  "Der erste Eindruck: viel Potenzial, wenig Show — genau der Typ, den man später bereut, nicht früher gesehen zu haben.",
  "Berichte aus {region} sind gemischt: mal brillant, mal unaufmerksam — {name} bleibt schwer einzuordnen.",
] as const;

const POSITIVE_TRAITS = [
  "Starker erster Kontakt",
  "Liest Räume früh",
  "Zweikampffreudig",
  "Bleibt nach Fehlern ruhig",
  "Überzeugt im Training",
] as const;

const AMBIVALENT_TRAITS = [
  "Noch unberechenbar",
  "Braucht klare Rollenvorgabe",
] as const;

interface NegativeTraitRule {
  label: string;
  matches: (player: Player, options: FlavorOptions) => boolean;
}

const NEGATIVE_TRAIT_RULES: NegativeTraitRule[] = [
  {
    label: "Launisch unter Druck",
    matches: (player) => player.state.morale < 42,
  },
  {
    label: "Unzufrieden mit Spielzeit",
    matches: (player) =>
      (player.squad_status === "u17" || player.squad_status === "u19") && player.state.weekly_minutes < 45,
  },
  {
    label: "Formtief",
    matches: (player) => player.state.form < -1,
  },
  {
    label: "Trainingsmotivation schwankt",
    matches: (player, options) => options.includeHiddenSignals && player.hidden.drive < 0.75,
  },
  {
    label: "Einzelgänger-Tendenzen",
    matches: (player) => player.attributes.teamwork < 45,
  },
  {
    label: "Nervös in entscheidenden Momenten",
    matches: (player) => player.attributes.composure < 40,
  },
  {
    label: "Aktuell verletzt",
    matches: (player) => player.state.injury !== null,
  },
  {
    label: "Körperlich noch hinterher",
    matches: (player) => player.attributes.stamina < 38 && player.age <= 17,
  },
];

interface FlavorOptions {
  includeHiddenSignals: boolean;
}

function negativeTraitsFor(player: Player, options: FlavorOptions): FlavorTrait[] {
  return NEGATIVE_TRAIT_RULES.filter((rule) => rule.matches(player, options)).map((rule) => ({
    label: rule.label,
    tone: "negative",
  }));
}

export function generatePlayerTraits(player: Player, options: FlavorOptions = { includeHiddenSignals: true }): FlavorTrait[] {
  const random = mulberry32(player.portrait_seed);
  const topKey = profileAttributeKeys(player.position)[0] ?? "passing";
  const traits: FlavorTrait[] = [
    { label: `${attributeLabel(topKey)} im Fokus`, tone: "positive" },
    { label: pick(POSITIVE_TRAITS, random), tone: "positive" },
  ];

  const negatives = negativeTraitsFor(player, options);
  const primaryNegative = negatives[0];
  if (primaryNegative) {
    traits.push(primaryNegative);
  } else {
    traits.push({ label: pick(AMBIVALENT_TRAITS, random), tone: "neutral" });
  }

  traits.push({
    label:
      player.squad_status === "u17" || player.squad_status === "u19" ? "Akademie-Background" : "Profil-Erfahrung",
    tone: "neutral",
  });

  if (player.hidden.breakout_flags.includes("prodigy_foundation")) {
    traits.push({ label: "Frühes Talent-Signal", tone: "positive" });
  }

  return traits.slice(0, 4);
}

export function generatePlayerFlavor(player: Player, options: FlavorOptions = { includeHiddenSignals: true }): PlayerFlavor {
  const random = mulberry32(player.portrait_seed);
  const headline = pick(HEADLINES, random);
  const bodyTemplate = pick(BODIES, random);
  const body = bodyTemplate
    .replaceAll("{name}", formatPlayerName(player))
    .replaceAll("{region}", player.birth.region)
    .replaceAll("{position}", player.position);
  return { headline, body, traits: generatePlayerTraits(player, options) };
}

export function flavorForScout(player: Player, owned: boolean, estimate?: AbilityEstimate): PlayerFlavor | null {
  if (owned || !estimate) {
    return generatePlayerFlavor(player, { includeHiddenSignals: true });
  }
  const reveal = scoutReveal(estimate.uncertaintyRange);
  if (estimate.uncertaintyRange >= 40) return null;
  if (estimate.uncertaintyRange >= 20) {
    return {
      headline: "Gerüchte aus dem Markt",
      body: `Über ${formatPlayerName(player)} kursieren nur vage Hinweise aus ${player.birth.region}. Position: ${formatPlayerPositionLabel(player)}.`,
      traits: [{ label: "Noch wenig belastbare Details", tone: "neutral" }],
    };
  }
  const full = generatePlayerFlavor(player, { includeHiddenSignals: reveal.showExactSkills });
  if (reveal.showExactSkills) return full;
  return {
    headline: full.headline,
    body: full.body,
    traits: full.traits.filter((trait) => trait.tone !== "negative").slice(0, 2),
  };
}

export function achievementBadges(player: Player, owned: boolean, estimate?: AbilityEstimate): string[] {
  if (!owned && estimate && estimate.uncertaintyRange >= 20) return [];
  return [...player.history.achievements];
}

export function seasonStatsStub(player: Player, owned: boolean, estimate?: AbilityEstimate): SeasonStatsStub | null {
  return careerSeasonStats(player, owned, estimate);
}

export function contractView(player: Player, owned: boolean, estimate?: AbilityEstimate): ContractView {
  if (!owned && estimate && estimate.uncertaintyRange >= 20) {
    return {
      status: "Unbekannt",
      wageWeekly: "?",
      untilSeason: "?",
      clauses: ["Scouts haben noch keine Vertragsdetails"],
      minutesPromise: "?",
    };
  }
  if (player.squad_status === "u17" || player.squad_status === "u19") {
    const youth = player.contract ?? defaultYouthContract(player.age, 1);
    return {
      status: player.contract ? "Jugendvertrag" : "Kein Vertrag",
      wageWeekly: player.contract
        ? `€ ${youth.wage_weekly.toLocaleString("de-DE")} / Woche`
        : "Noch nicht unterzeichnet",
      untilSeason: player.contract ? formatSeasonLabel(youth.until_season) : "—",
      clauses: player.contract
        ? [
            youth.bonus_appearance > 0
              ? `Einsatzbonus € ${youth.bonus_appearance}`
              : "Kein Einsatzbonus",
            youth.guaranteed_minutes_promise === "rotation"
              ? "Rotation in der Akademie versprochen"
              : "Akademie-Einsätze nach Sim",
          ]
        : ["Ohne Vertrag droht Abgang ab 17", "Inbox oder ⋮-Menü: Jugendvertrag"],
      minutesPromise: minutesLabel(youth.guaranteed_minutes_promise ?? "none"),
    };
  }
  if (player.contract) {
    return {
      status: "Profivertrag",
      wageWeekly: `€ ${player.contract.wage_weekly.toLocaleString("de-DE")} / Woche`,
      untilSeason: formatSeasonLabel(player.contract.until_season),
      clauses: [
        player.contract.buyout_clause ? `Ausstiegsklausel € ${player.contract.buyout_clause.toLocaleString("de-DE")}` : "Keine Ausstiegsklausel",
        player.contract.sell_on_percentage ? `Weiterverkaufsbeteiligung ${player.contract.sell_on_percentage}%` : "Keine Sell-on-Klausel",
      ],
      minutesPromise: minutesLabel(player.contract.guaranteed_minutes_promise ?? "none"),
    };
  }
  return {
    status: owned ? "Verhandlung offen" : "Fremdclub · unbekannt",
    wageWeekly: owned ? "€ — (noch nicht vereinbart)" : "?",
    untilSeason: owned ? "—" : "?",
    clauses: owned ? ["Vertragsgespräch über Inbox oder Profil"] : ["Keine belastbaren Infos"],
    minutesPromise: owned ? "Offen" : "?",
  };
}

function minutesLabel(promise: "none" | "rotation" | "starter"): string {
  if (promise === "starter") return "Starter-Garantie";
  if (promise === "rotation") return "Rotation versprochen";
  return "Keine Minuten-Garantie";
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0]!;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
