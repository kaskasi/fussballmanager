import type { Player } from "../types/player.ts";
import { formatPlayerName, roundStat } from "../types/player-display.ts";
import { attributeLabel, profileAttributeKeys } from "./player-profile.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutReveal } from "../scouting/scout-visibility.ts";

export interface PlayerFlavor {
  headline: string;
  body: string;
  traits: string[];
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
] as const;

const BODIES = [
  "Scouts beschreiben {name} als Spieler, der in {region} aufgewachsen ist und dort schon früh auffiel.",
  "In der {position}-Rolle wirkt {name} wachgerümt — vor allem wenn der Ball schnell läuft.",
  "{name} gilt in {region} als einer, der Training ernst nimmt und im Teamgefüge mitwächst.",
  "Der erste Eindruck: viel Potenzial, wenig Show — genau der Typ, den man später bereut, nicht früher gesehen zu haben.",
] as const;

const TRAIT_LINES = [
  "Starker erster Kontakt",
  "Liest Räume früh",
  "Zweikampffreudig",
  "Bleibt nach Fehlern ruhig",
  "Überzeugt im Training",
  "Noch unberechenbar",
] as const;

const ACHIEVEMENT_STUBS = [
  "🏆 Kreispokal-Junior",
  "⭐ Trainingsgruppe A",
  "🎯 5 Tore in Folge (Jugend)",
  "🧤 Clean Sheet Serie",
  "📋 Nationalmannschaft U15 Beobachtung",
] as const;

export function generatePlayerFlavor(player: Player): PlayerFlavor {
  const random = mulberry32(player.portrait_seed);
  const topKey = profileAttributeKeys(player.position)[0] ?? "passing";
  const headline = pick(HEADLINES, random);
  const bodyTemplate = pick(BODIES, random);
  const body = bodyTemplate
    .replaceAll("{name}", formatPlayerName(player))
    .replaceAll("{region}", player.birth.region)
    .replaceAll("{position}", player.position);
  const traits = [
    `${attributeLabel(topKey)} im Fokus`,
    pick(TRAIT_LINES, random),
    player.squad_status === "u17" || player.squad_status === "u19" ? "Akademie-Background" : "Profil-Erfahrung",
  ];
  if (player.hidden.breakout_flags.includes("prodigy_foundation")) {
    traits.push("Frühes Talent-Signal");
  }
  return { headline, body, traits: traits.slice(0, 3) };
}

export function flavorForScout(player: Player, owned: boolean, estimate?: AbilityEstimate): PlayerFlavor | null {
  if (owned || !estimate) return generatePlayerFlavor(player);
  const reveal = scoutReveal(estimate.uncertaintyRange);
  if (estimate.uncertaintyRange >= 40) return null;
  if (estimate.uncertaintyRange >= 20) {
    return {
      headline: "Gerüchte aus dem Markt",
      body: `Über ${formatPlayerName(player)} kursieren nur vage Hinweise aus ${player.birth.region}. Position: ${player.position}.`,
      traits: ["Noch wenig belastbare Details"],
    };
  }
  const full = generatePlayerFlavor(player);
  if (reveal.showExactSkills) return full;
  return {
    headline: full.headline,
    body: full.body,
    traits: full.traits.slice(0, 2),
  };
}

export function achievementBadges(player: Player, owned: boolean, estimate?: AbilityEstimate): string[] {
  const stored = player.history.achievements;
  if (stored.length > 0) return stored;
  if (!owned && estimate && estimate.uncertaintyRange >= 20) return [];
  const random = mulberry32(player.portrait_seed ^ 0x9e37);
  const count = player.age <= 16 ? 1 : 1 + Math.floor(random() * 2);
  const picks: string[] = [];
  for (let index = 0; index < count; index++) {
    picks.push(pick(ACHIEVEMENT_STUBS, random));
  }
  return picks;
}

export function seasonStatsStub(player: Player, owned: boolean, estimate?: AbilityEstimate): SeasonStatsStub | null {
  if (!owned && estimate && estimate.uncertaintyRange >= 20) return null;
  const random = mulberry32(player.portrait_seed ^ 0x517c);
  const apps = 4 + Math.floor(random() * 18);
  const goals =
    player.position === "GK"
      ? 0
      : player.position === "CF"
        ? Math.floor(random() * 12)
        : Math.floor(random() * 6);
  const assists = player.position === "GK" ? 0 : Math.floor(random() * 8);
  const minutes = apps * (55 + Math.floor(random() * 25));
  const rating = String(roundStat(6.2 + random() * 1.6));
  return { apps, goals, assists, minutes, rating };
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
  if (player.contract) {
    return {
      status: "Profivertrag",
      wageWeekly: `€ ${player.contract.wage_weekly.toLocaleString("de-DE")} / Woche`,
      untilSeason: String(player.contract.until_season),
      clauses: [
        player.contract.buyout_clause ? `Ausstiegsklausel € ${player.contract.buyout_clause.toLocaleString("de-DE")}` : "Keine Ausstiegsklausel",
        player.contract.sell_on_percentage ? `Weiterverkaufsbeteiligung ${player.contract.sell_on_percentage}%` : "Keine Sell-on-Klausel",
      ],
      minutesPromise: minutesLabel(player.contract.guaranteed_minutes_promise ?? "none"),
    };
  }
  if (player.squad_status === "u17" || player.squad_status === "u19") {
    return {
      status: "Jugendvertrag",
      wageWeekly: "€ 0 / Woche (Stub)",
      untilSeason: "Automatische Verlängerung (Stub)",
      clauses: ["Kein Profivertrag unter 16", "Ausstiegsklausel nicht hinterlegt"],
      minutesPromise: "Akademie-Minuten (Stub)",
    };
  }
  return {
    status: owned ? "Verhandlung offen" : "Fremdclub · unbekannt",
    wageWeekly: owned ? "€ — (Stub)" : "?",
    untilSeason: owned ? "—" : "?",
    clauses: owned ? ["Vertragsgespräch noch nicht abgeschlossen"] : ["Keine belastbaren Infos"],
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
