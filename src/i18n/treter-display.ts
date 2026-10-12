import type { TreterArticle } from "../media/kicker-digest.ts";
import { t } from "./index.ts";

const LEGACY_KICKER_KEYS: Record<string, string> = {
  Redaktion: "media.treter.kicker.editorial",
  "Liga beobachtet": "media.treter.kicker.leagueWatch",
  Angebot: "media.treter.kicker.offer",
  "Eigener Klub": "media.treter.kicker.ownClub",
  "Liga-Markt": "media.treter.kicker.leagueMarket",
};

const LEGACY_ROTATE_HEADLINE_KEYS: Record<string, string> = {
  "Liga-Whisper": "media.treter.rotate.ligaWhisper",
  "Transfer-Radar": "media.treter.rotate.transferRadar",
  Trainingseindruck: "media.treter.rotate.trainingImpression",
  "Fan-Stimmung": "media.treter.rotate.fanMood",
  "Jugend blinkt auf": "media.treter.rotate.youthSpotlight",
  "Kassen-Blick": "media.treter.rotate.finances",
  "Gegner-Check": "media.treter.rotate.opponentCheck",
  "Medizin & Fitness": "media.treter.rotate.medicalFitness",
};

function localizedKicker(article: TreterArticle): string | undefined {
  if (!article.kicker) return undefined;
  const key = article.tickerI18n?.kickerKey ?? LEGACY_KICKER_KEYS[article.kicker];
  if (key) {
    return t(key, article.tickerI18n?.params);
  }
  return article.kicker;
}

function localizedHeadline(article: TreterArticle): string {
  if (article.tickerI18n?.headlineKey) {
    return t(article.tickerI18n.headlineKey, article.tickerI18n.params);
  }
  const legacyKey = LEGACY_ROTATE_HEADLINE_KEYS[article.headline];
  if (legacyKey) {
    return t(legacyKey, article.tickerI18n?.params);
  }
  if (article.headline.startsWith("Formexplosion: ")) {
    const name = article.headline.slice("Formexplosion: ".length);
    return t("media.treter.headline.formExplosion", { name });
  }
  return article.headline;
}

/** One ticker segment: optional kicker + headline (localized). */
export function formatTreterTickerLine(article: TreterArticle): string {
  const headline = localizedHeadline(article);
  const kicker = localizedKicker(article);
  return kicker ? `${kicker} — ${headline}` : headline;
}
