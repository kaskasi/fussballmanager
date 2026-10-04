export const LOCALE_IDS = ["de", "en", "zh-Hans"] as const;
export type LocaleId = (typeof LOCALE_IDS)[number];

export function isLocaleId(value: string): value is LocaleId {
  return (LOCALE_IDS as readonly string[]).includes(value);
}

export function htmlLang(locale: LocaleId): string {
  if (locale === "zh-Hans") return "zh-Hans";
  return locale;
}

export function detectBrowserLocale(): LocaleId {
  if (typeof navigator === "undefined") return "de";
  const tag = navigator.language.toLowerCase();
  if (tag.startsWith("zh")) return "zh-Hans";
  if (tag.startsWith("en")) return "en";
  return "de";
}
