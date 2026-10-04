import de from "./locales/de.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };
import zhHans from "./locales/zh-Hans.json" with { type: "json" };
import { htmlLang, type LocaleId } from "./locale-id.ts";

type BrowserDocument = {
  documentElement: {
    lang: string;
    dataset: { locale?: string };
  };
};

type MessageParams = Record<string, string | number>;

const packs: Record<LocaleId, Record<string, string>> = {
  de: de as Record<string, string>,
  en: en as Record<string, string>,
  "zh-Hans": zhHans as Record<string, string>,
};

let activeLocale: LocaleId = "de";
const listeners = new Set<() => void>();

export function getLocale(): LocaleId {
  return activeLocale;
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(locale: LocaleId): void {
  if (activeLocale === locale) return;
  activeLocale = locale;
  const doc = (globalThis as { document?: BrowserDocument }).document;
  if (doc) {
    doc.documentElement.lang = htmlLang(locale);
    doc.documentElement.dataset.locale = locale;
  }
  for (const listener of listeners) listener();
}

export function t(key: string, params?: MessageParams): string {
  const raw =
    packs[activeLocale][key] ?? packs.en[key] ?? packs.de[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  );
}

export function transferWindowHint(): string {
  return t("transfer.windowHint");
}
