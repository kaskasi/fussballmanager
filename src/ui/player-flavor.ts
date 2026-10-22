import type { Player } from "../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel, roundStat } from "../types/player-display.ts";
import { attributeLabel, profileAttributeKeys } from "./player-profile.ts";
import { careerSeasonStats } from "../player/season-stats.ts";
import { defaultYouthContract } from "../player/youth-contract.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { scoutReveal } from "../scouting/scout-visibility.ts";
import { formatSeasonLabel } from "../sim/season-label.ts";
import { t } from "../i18n/index.ts";
import { formatEuroWhole } from "../i18n/number-display.ts";

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

/** i18n keys; the pick stays deterministic per portrait seed because only the index is drawn. */
const HEADLINES = [
  "profile.flavor.headline.calm",
  "profile.flavor.headline.roughDiamond",
  "profile.flavor.headline.headUp",
  "profile.flavor.headline.workhorse",
  "profile.flavor.headline.unknown",
  "profile.flavor.headline.question",
] as const;

const BODIES = [
  "profile.flavor.body.grewUp",
  "profile.flavor.body.role",
  "profile.flavor.body.trains",
  "profile.flavor.body.firstImpression",
  "profile.flavor.body.mixed",
] as const;

const POSITIVE_TRAITS = [
  "profile.trait.firstTouch",
  "profile.trait.readsSpace",
  "profile.trait.duels",
  "profile.trait.calmAfterErrors",
  "profile.trait.training",
] as const;

const AMBIVALENT_TRAITS = [
  "profile.trait.unpredictable",
  "profile.trait.needsRole",
] as const;

interface NegativeTraitRule {
  /** i18n key */
  label: string;
  matches: (player: Player, options: FlavorOptions) => boolean;
}

const NEGATIVE_TRAIT_RULES: NegativeTraitRule[] = [
  {
    label: "profile.trait.moody",
    matches: (player) => player.state.morale < 42,
  },
  {
    label: "profile.trait.unhappyMinutes",
    matches: (player) =>
      (player.squad_status === "u17" || player.squad_status === "u19") && player.state.weekly_minutes < 45,
  },
  {
    label: "profile.trait.formSlump",
    matches: (player) => player.state.form < -1,
  },
  {
    label: "profile.trait.driveWavers",
    matches: (player, options) => options.includeHiddenSignals && player.hidden.drive < 0.75,
  },
  {
    label: "profile.trait.loner",
    matches: (player) => player.attributes.teamwork < 45,
  },
  {
    label: "profile.trait.nervous",
    matches: (player) => player.attributes.composure < 40,
  },
  {
    label: "profile.trait.injured",
    matches: (player) => player.state.injury !== null,
  },
  {
    label: "profile.trait.physicallyBehind",
    matches: (player) => player.attributes.stamina < 38 && player.age <= 17,
  },
];

interface FlavorOptions {
  includeHiddenSignals: boolean;
}

function negativeTraitsFor(player: Player, options: FlavorOptions): FlavorTrait[] {
  return NEGATIVE_TRAIT_RULES.filter((rule) => rule.matches(player, options)).map((rule) => ({
    label: t(rule.label),
    tone: "negative",
  }));
}

export function generatePlayerTraits(player: Player, options: FlavorOptions = { includeHiddenSignals: true }): FlavorTrait[] {
  const random = mulberry32(player.portrait_seed);
  const topKey = profileAttributeKeys(player.position)[0] ?? "passing";
  const traits: FlavorTrait[] = [
    { label: t("profile.trait.focus", { attribute: attributeLabel(topKey) }), tone: "positive" },
    { label: t(pick(POSITIVE_TRAITS, random)), tone: "positive" },
  ];

  const negatives = negativeTraitsFor(player, options);
  const primaryNegative = negatives[0];
  if (primaryNegative) {
    traits.push(primaryNegative);
  } else {
    traits.push({ label: t(pick(AMBIVALENT_TRAITS, random)), tone: "neutral" });
  }

  traits.push({
    label:
      player.squad_status === "u17" || player.squad_status === "u19"
        ? t("profile.trait.academy")
        : t("profile.trait.proExperience"),
    tone: "neutral",
  });

  if (player.hidden.breakout_flags.includes("prodigy_foundation")) {
    traits.push({ label: t("profile.trait.earlySignal"), tone: "positive" });
  }

  return traits.slice(0, 4);
}

export function generatePlayerFlavor(player: Player, options: FlavorOptions = { includeHiddenSignals: true }): PlayerFlavor {
  const random = mulberry32(player.portrait_seed);
  const headline = t(pick(HEADLINES, random));
  const body = t(pick(BODIES, random), {
    name: formatPlayerName(player),
    region: player.birth.region,
    position: player.position,
  });
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
      headline: t("profile.flavor.rumour.headline"),
      body: t("profile.flavor.rumour.body", {
        name: formatPlayerName(player),
        region: player.birth.region,
        position: formatPlayerPositionLabel(player),
      }),
      traits: [{ label: t("profile.trait.fewDetails"), tone: "neutral" }],
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
      status: t("profile.contract.unknown"),
      wageWeekly: "?",
      untilSeason: "?",
      clauses: [t("profile.contract.clause.noScoutDetails")],
      minutesPromise: "?",
    };
  }
  if (player.squad_status === "u17" || player.squad_status === "u19") {
    const youth = player.contract ?? defaultYouthContract(player.age, 1);
    return {
      status: player.contract ? t("profile.contract.youth") : t("profile.contract.none"),
      wageWeekly: player.contract
        ? t("profile.contract.wagePerWeek", { amount: formatEuroWhole(youth.wage_weekly) })
        : t("profile.contract.notSigned"),
      untilSeason: player.contract ? formatSeasonLabel(youth.until_season) : "—",
      clauses: player.contract
        ? [
            youth.bonus_appearance > 0
              ? t("profile.contract.clause.appearanceBonus", { amount: formatEuroWhole(youth.bonus_appearance) })
              : t("profile.contract.clause.noAppearanceBonus"),
            youth.guaranteed_minutes_promise === "rotation"
              ? t("profile.contract.clause.academyRotation")
              : t("profile.contract.clause.academyBySim"),
          ]
        : [t("profile.contract.clause.leavesAt17"), t("profile.contract.clause.signYouth")],
      minutesPromise: minutesLabel(youth.guaranteed_minutes_promise ?? "none"),
    };
  }
  if (player.contract) {
    return {
      status: t("profile.contract.pro"),
      wageWeekly: t("profile.contract.wagePerWeek", { amount: formatEuroWhole(player.contract.wage_weekly) }),
      untilSeason: formatSeasonLabel(player.contract.until_season),
      clauses: [
        player.contract.buyout_clause
          ? t("profile.contract.clause.buyout", { amount: formatEuroWhole(player.contract.buyout_clause) })
          : t("profile.contract.clause.noBuyout"),
        player.contract.sell_on_percentage
          ? t("profile.contract.clause.sellOn", { percent: player.contract.sell_on_percentage })
          : t("profile.contract.clause.noSellOn"),
      ],
      minutesPromise: minutesLabel(player.contract.guaranteed_minutes_promise ?? "none"),
    };
  }
  return {
    status: owned ? t("profile.contract.open") : t("profile.contract.otherClub"),
    wageWeekly: owned ? t("profile.contract.wageNotAgreed") : "?",
    untilSeason: owned ? "—" : "?",
    clauses: owned ? [t("profile.contract.clause.talkVia")] : [t("profile.contract.clause.noInfo")],
    minutesPromise: owned ? t("profile.contract.minutes.open") : "?",
  };
}

function minutesLabel(promise: "none" | "rotation" | "starter"): string {
  if (promise === "starter") return t("profile.contract.minutes.starter");
  if (promise === "rotation") return t("profile.contract.minutes.rotation");
  return t("profile.contract.minutes.none");
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
